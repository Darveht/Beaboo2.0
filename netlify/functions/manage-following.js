
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
  },
});

async function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { action, userId, targetUserId } = JSON.parse(event.body);

    if (!action || !userId || !targetUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const followingKey = `following/${userId}.json`;
    const followersKey = `followers/${targetUserId}.json`;

    let followingData = {};
    let followersData = {};

    // Obtener datos actuales
    try {
      const followingResponse = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: followingKey,
      }));
      const followingContents = await streamToString(followingResponse.Body);
      followingData = JSON.parse(followingContents);
    } catch (error) {
      // El archivo no existe aún
    }

    try {
      const followersResponse = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: followersKey,
      }));
      const followersContents = await streamToString(followersResponse.Body);
      followersData = JSON.parse(followersContents);
    } catch (error) {
      // El archivo no existe aún
    }

    if (action === 'follow') {
      followingData[targetUserId] = Date.now();
      followersData[userId] = Date.now();
    } else if (action === 'unfollow') {
      delete followingData[targetUserId];
      delete followersData[userId];
    } else if (action === 'get-following') {
      return {
        statusCode: 200,
        body: JSON.stringify({ following: followingData }),
      };
    } else if (action === 'get-followers') {
      return {
        statusCode: 200,
        body: JSON.stringify({ followers: followersData }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' }),
      };
    }

    // Guardar datos actualizados
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: followingKey,
      Body: JSON.stringify(followingData),
      ContentType: 'application/json',
    }));

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: followersKey,
      Body: JSON.stringify(followersData),
      ContentType: 'application/json',
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error managing following:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to manage following', message: error.message }),
    };
  }
};
