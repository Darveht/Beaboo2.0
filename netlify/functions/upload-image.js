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
    const { imageData, fileName, userId, timestamp, contentType } = JSON.parse(event.body);

    if (!imageData || !fileName || !userId || !timestamp) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const key = `stories/${userId}/${timestamp}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: key,
      Body: buffer,
      ContentType: contentType || 'image/jpeg',
      ContentEncoding: 'base64',
    });

    await s3Client.send(command);

    const imageUrl = `https://${process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025'}.s3.${process.env.MY_AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        imageUrl,
        key 
      }),
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload image', message: error.message }),
    };
  }
};
