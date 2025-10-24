
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
    const { content, userId, authorName, authorImage, imageData, fileName, contentType } = JSON.parse(event.body);

    if (!content || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    let imageUrl = null;
    
    // Si hay imagen, subirla primero
    if (imageData && fileName) {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const imageKey = `notes/${userId}/${timestamp}_${fileName}`;

      const imageCommand = new PutObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: imageKey,
        Body: buffer,
        ContentType: contentType || 'image/jpeg',
        ContentEncoding: 'base64',
      });

      await s3Client.send(imageCommand);
      imageUrl = `https://${process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025'}.s3.${process.env.MY_AWS_REGION || 'us-east-2'}.amazonaws.com/${imageKey}`;
    }

    // Crear objeto JSON con los datos de la nota
    const noteData = {
      noteId,
      content,
      authorId: userId,
      authorName,
      authorImage,
      timestamp,
      likes: 0,
      imageUrl
    };

    // Subir metadata de la nota como JSON
    const noteKey = `notes/metadata/${noteId}.json`;
    const noteCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: noteKey,
      Body: JSON.stringify(noteData),
      ContentType: 'application/json',
    });

    await s3Client.send(noteCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        noteId,
        noteUrl: `https://${process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025'}.s3.${process.env.MY_AWS_REGION || 'us-east-2'}.amazonaws.com/${noteKey}`,
        imageUrl
      }),
    };
  } catch (error) {
    console.error('Error uploading note to S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload note', message: error.message }),
    };
  }
};
