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

    const blocksKey = `blocks/${userId}.json`;
    let blocksData = {};

    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: blocksKey,
      });
      const response = await s3Client.send(getCommand);
      blocksData = JSON.parse(await streamToString(response.Body));
    } catch (error) {
      blocksData = {};
    }

    if (action === 'block') {
      blocksData[targetUserId] = {
        blockedAt: Date.now()
      };
    } else if (action === 'unblock') {
      delete blocksData[targetUserId];
    } else if (action === 'check') {
      const isBlocked = targetUserId in blocksData;
      return {
        statusCode: 200,
        body: JSON.stringify({ isBlocked }),
      };
    } else if (action === 'get-all') {
      return {
        statusCode: 200,
        body: JSON.stringify({ blocks: blocksData }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' }),
      };
    }

    const putCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: blocksKey,
      Body: JSON.stringify(blocksData),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error managing blocks:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to manage blocks', message: error.message }),
    };
  }
};
