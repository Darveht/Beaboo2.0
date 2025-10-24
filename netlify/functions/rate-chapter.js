
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
    const { storyId, chapterId, userId, rating } = JSON.parse(event.body);

    if (!storyId || !chapterId || !userId || rating === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    if (rating < 1 || rating > 5) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Rating must be between 1 and 5' }),
      };
    }

    const chapterKey = `chapters/${storyId}/${chapterId}.json`;

    // Obtener el capítulo actual
    const getCommand = new GetObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: chapterKey,
    });

    let chapterData;
    try {
      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      chapterData = JSON.parse(bodyContents);
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Chapter not found' }),
      };
    }

    // Inicializar ratings si no existe
    if (!chapterData.ratings) {
      chapterData.ratings = {};
    }

    // Guardar o actualizar la calificación del usuario
    chapterData.ratings[userId] = rating;

    // Calcular el promedio de calificaciones
    const ratings = Object.values(chapterData.ratings);
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    chapterData.averageRating = averageRating;
    chapterData.totalRatings = ratings.length;

    // Guardar el capítulo actualizado
    const putCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: chapterKey,
      Body: JSON.stringify(chapterData),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        averageRating: averageRating.toFixed(1),
        totalRatings: ratings.length,
        userRating: rating
      }),
    };
  } catch (error) {
    console.error('Error rating chapter:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to rate chapter', message: error.message }),
    };
  }
};
