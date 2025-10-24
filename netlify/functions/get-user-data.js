
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

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
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userId } = event.queryStringParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId' }),
      };
    }

    const userKey = `users/${userId}/profile.json`;

    // Obtener datos del usuario
    const getCommand = new GetObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: userKey,
    });

    try {
      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      const userData = JSON.parse(bodyContents);

      return {
        statusCode: 200,
        body: JSON.stringify({ user: userData }),
      };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting user data from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get user data', message: error.message }),
    };
  }
};
