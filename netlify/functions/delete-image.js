const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { imageUrl } = JSON.parse(event.body);

    if (!imageUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing imageUrl' }),
      };
    }

    const urlParts = imageUrl.split('.amazonaws.com/');
    if (urlParts.length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid S3 URL format' }),
      };
    }

    const key = urlParts[1];

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: key,
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete image', message: error.message }),
    };
  }
};
