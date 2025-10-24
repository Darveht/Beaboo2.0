
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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
    const { storyId, chapterNumber, content, userId } = JSON.parse(event.body);

    if (!storyId || !chapterNumber || !content || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const chapterId = `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Crear objeto JSON con los datos del capítulo
    const chapterData = {
      chapterId,
      storyId,
      chapterNumber,
      content,
      userId,
      timestamp,
      ratings: {}
    };

    // Subir capítulo como JSON a S3
    const chapterKey = `chapters/${storyId}/${chapterId}.json`;
    const command = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: chapterKey,
      Body: JSON.stringify(chapterData),
      ContentType: 'application/json',
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        chapterId,
        chapterUrl: `https://${process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025'}.s3.${process.env.MY_AWS_REGION || 'us-east-2'}.amazonaws.com/${chapterKey}`
      }),
    };
  } catch (error) {
    console.error('Error uploading chapter to S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload chapter', message: error.message }),
    };
  }
};
