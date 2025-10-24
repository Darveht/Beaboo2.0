
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
    const { storyId, updates } = JSON.parse(event.body);

    if (!storyId || !updates) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const storyKey = `stories/metadata/${storyId}.json`;

    // Obtener la historia actual
    const getCommand = new GetObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: storyKey,
    });

    let storyData;
    try {
      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      storyData = JSON.parse(bodyContents);
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Story not found' }),
      };
    }

    // Actualizar solo los campos permitidos
    const allowedFields = ['title', 'category', 'rating', 'language', 'synopsis', 'views', 'ratingValue'];
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        storyData[key] = updates[key];
      }
    });

    // Guardar la historia actualizada
    const putCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: storyKey,
      Body: JSON.stringify(storyData),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, story: storyData }),
    };
  } catch (error) {
    console.error('Error updating story:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update story', message: error.message }),
    };
  }
};
