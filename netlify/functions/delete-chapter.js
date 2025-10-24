
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
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
    const { storyId, chapterId } = JSON.parse(event.body);

    if (!storyId || !chapterId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const chapterKey = `chapters/${storyId}/${chapterId}.json`;

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: chapterKey,
    });

    await s3Client.send(deleteCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error deleting chapter from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete chapter', message: error.message }),
    };
  }
};
