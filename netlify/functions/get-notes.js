
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

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
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { limit = 50 } = event.queryStringParameters || {};

    // Listar todas las notas
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Prefix: 'notes/metadata/',
      MaxKeys: parseInt(limit)
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ notes: [] }),
      };
    }

    // Obtener el contenido de cada nota
    const notesPromises = listResponse.Contents.map(async (item) => {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: item.Key,
      });

      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      return JSON.parse(bodyContents);
    });

    const notes = await Promise.all(notesPromises);
    
    // Ordenar por timestamp descendente
    notes.sort((a, b) => b.timestamp - a.timestamp);

    return {
      statusCode: 200,
      body: JSON.stringify({ notes }),
    };
  } catch (error) {
    console.error('Error getting notes from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get notes', message: error.message }),
    };
  }
};
