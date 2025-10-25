
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

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 2 días en milisegundos

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userId, action } = JSON.parse(event.body); // action: 'note' o 'like'

    if (!userId || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const limitsKey = `userLimits/${userId}.json`;
    let limitsData = {
      lastNoteTimestamp: 0,
      lastLikesReset: 0,
      likesCount: 0
    };

    // Obtener límites actuales del usuario
    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: limitsKey,
      });

      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      limitsData = JSON.parse(bodyContents);
    } catch (error) {
      // El archivo no existe, usar valores por defecto
    }

    const now = Date.now();
    let canPerformAction = false;
    let message = '';
    let timeRemaining = 0;

    if (action === 'note') {
      // Si nunca ha publicado (timestamp = 0), permitir la primera publicación
      if (limitsData.lastNoteTimestamp === 0) {
        canPerformAction = true;
        limitsData.lastNoteTimestamp = now;
      } else {
        // Verificar si han pasado 2 días desde la última nota
        const timeSinceLastNote = now - limitsData.lastNoteTimestamp;
        
        if (timeSinceLastNote >= TWO_DAYS_MS) {
          canPerformAction = true;
          limitsData.lastNoteTimestamp = now;
        } else {
          timeRemaining = TWO_DAYS_MS - timeSinceLastNote;
          const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
          message = `Debes esperar ${hoursRemaining} horas antes de publicar otra nota`;
        }
      }
    } else if (action === 'like') {
      // Si nunca ha dado likes (lastLikesReset = 0), iniciar el contador
      if (limitsData.lastLikesReset === 0) {
        limitsData.lastLikesReset = now;
        limitsData.likesCount = 1;
        canPerformAction = true;
      } else {
        // Verificar si han pasado 2 días desde el último reset de likes
        const timeSinceLastReset = now - limitsData.lastLikesReset;
        
        if (timeSinceLastReset >= TWO_DAYS_MS) {
          // Resetear el contador de likes
          limitsData.lastLikesReset = now;
          limitsData.likesCount = 1;
          canPerformAction = true;
        } else if (limitsData.likesCount < 3) {
          // Aún puede dar likes
          limitsData.likesCount += 1;
          canPerformAction = true;
        } else {
          timeRemaining = TWO_DAYS_MS - timeSinceLastReset;
          const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
          message = `Has alcanzado el límite de 3 likes. Debes esperar ${hoursRemaining} horas para dar más likes`;
        }
      }
    }

    // Guardar los límites actualizados
    if (canPerformAction) {
      const putCommand = new PutObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: limitsKey,
        Body: JSON.stringify(limitsData),
        ContentType: 'application/json',
      });

      await s3Client.send(putCommand);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        canPerformAction, 
        message,
        timeRemaining,
        limitsData: {
          likesRemaining: action === 'like' ? 3 - limitsData.likesCount : null,
          lastNoteTimestamp: limitsData.lastNoteTimestamp,
          lastLikesReset: limitsData.lastLikesReset,
          likesCount: limitsData.likesCount
        }
      }),
    };
  } catch (error) {
    console.error('Error checking user limits:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check user limits', message: error.message }),
    };
  }
};
