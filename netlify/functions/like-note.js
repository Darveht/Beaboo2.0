
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
    const { noteId, userId } = JSON.parse(event.body);

    if (!noteId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Verificar límites de likes
    const limitsCheck = await fetch(`${event.headers.origin || 'https://' + event.headers.host}/.netlify/functions/check-user-limits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        action: 'like'
      })
    });

    const limitsResult = await limitsCheck.json();
    
    if (!limitsResult.canPerformAction) {
      return {
        statusCode: 429,
        body: JSON.stringify({ 
          error: 'Límite de likes alcanzado',
          message: limitsResult.message,
          timeRemaining: limitsResult.timeRemaining,
          likesRemaining: limitsResult.limitsData.likesRemaining
        }),
      };
    }

    const noteKey = `notes/metadata/${noteId}.json`;
    const likesKey = `notes/likes/${noteId}/${userId}`;

    // Verificar si el usuario ya dio like
    try {
      await s3Client.send(new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: likesKey,
      }));
      
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User already liked this note' }),
      };
    } catch (error) {
      // El usuario no ha dado like, continuar
    }

    // Obtener la nota actual
    const getCommand = new GetObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: noteKey,
    });

    const response = await s3Client.send(getCommand);
    const bodyContents = await streamToString(response.Body);
    const noteData = JSON.parse(bodyContents);

    // Incrementar likes
    noteData.likes = (noteData.likes || 0) + 1;

    // Actualizar la nota
    const putCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: noteKey,
      Body: JSON.stringify(noteData),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    // Registrar el like del usuario
    const likeCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: likesKey,
      Body: JSON.stringify({ timestamp: Date.now() }),
      ContentType: 'application/json',
    });

    await s3Client.send(likeCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, likes: noteData.likes }),
    };
  } catch (error) {
    console.error('Error liking note:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to like note', message: error.message }),
    };
  }
};
