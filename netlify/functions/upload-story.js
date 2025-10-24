
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
    const { 
      title, 
      category, 
      rating, 
      language, 
      synopsis, 
      userId, 
      username, 
      email,
      coverImageData,
      coverImageFileName,
      coverImageContentType
    } = JSON.parse(event.body);

    if (!title || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    let coverImageUrl = null;

    // Subir imagen de portada si existe
    if (coverImageData && coverImageFileName) {
      const base64Data = coverImageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const coverKey = `covers/${userId}/${storyId}_${coverImageFileName}`;

      const coverCommand = new PutObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: coverKey,
        Body: buffer,
        ContentType: coverImageContentType || 'image/jpeg',
        ContentEncoding: 'base64',
      });

      await s3Client.send(coverCommand);
      coverImageUrl = `https://${process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025'}.s3.${process.env.MY_AWS_REGION || 'us-east-2'}.amazonaws.com/${coverKey}`;
    }

    // Crear objeto JSON con los datos de la historia
    const storyData = {
      id: storyId,
      title,
      category,
      rating,
      language,
      synopsis,
      userId,
      username,
      email,
      coverImage: coverImageUrl,
      timestamp,
      views: 0,
      ratingValue: 0
    };

    // Subir metadata de la historia
    const storyKey = `stories/metadata/${storyId}.json`;
    const storyCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: storyKey,
      Body: JSON.stringify(storyData),
      ContentType: 'application/json',
    });

    await s3Client.send(storyCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        storyId,
        storyUrl: `https://${process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025'}.s3.${process.env.MY_AWS_REGION || 'us-east-2'}.amazonaws.com/${storyKey}`,
        coverImage: coverImageUrl
      }),
    };
  } catch (error) {
    console.error('Error uploading story to S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload story', message: error.message }),
    };
  }
};
