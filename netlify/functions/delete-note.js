
const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

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
    const { noteId } = JSON.parse(event.body);

    if (!noteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing noteId' }),
      };
    }

    // Primero obtener los datos de la nota para saber si tiene imagen
    const noteKey = `notes/metadata/${noteId}.json`;
    const getCommand = new GetObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: noteKey,
    });

    let noteData;
    try {
      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      noteData = JSON.parse(bodyContents);
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Note not found' }),
      };
    }

    // Eliminar la imagen si existe
    if (noteData.imageUrl && noteData.imageUrl.includes('amazonaws.com')) {
      const urlParts = noteData.imageUrl.split('.amazonaws.com/');
      if (urlParts.length >= 2) {
        const imageKey = urlParts[1];
        const deleteImageCommand = new DeleteObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: imageKey,
        });
        await s3Client.send(deleteImageCommand);
      }
    }

    // Eliminar el metadata de la nota
    const deleteNoteCommand = new DeleteObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: noteKey,
    });

    await s3Client.send(deleteNoteCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error deleting note from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete note', message: error.message }),
    };
  }
};
