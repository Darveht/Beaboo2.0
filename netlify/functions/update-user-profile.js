
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
    const { userId, updates } = JSON.parse(event.body);

    if (!userId || !updates) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const userKey = `users/${userId}/profile.json`;

    // Obtener perfil actual o crear uno nuevo
    let userData = {};
    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: userKey,
      });
      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      userData = JSON.parse(bodyContents);
    } catch (error) {
      // Si el perfil no existe, crear uno nuevo
      if (error.name === 'NoSuchKey') {
        userData = {
          userId,
          createdAt: Date.now(),
        };
      } else {
        throw error;
      }
    }

    // Actualizar solo los campos permitidos
    const allowedFields = ['username', 'email', 'bio', 'profileImage', 'displayName', 'website', 'location'];
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        userData[key] = updates[key];
      }
    });

    userData.updatedAt = Date.now();

    // Guardar el perfil actualizado
    const putCommand = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: userKey,
      Body: JSON.stringify(userData),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, user: userData }),
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update user profile', message: error.message }),
    };
  }
};
