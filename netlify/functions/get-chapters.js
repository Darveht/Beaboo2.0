
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
    const { storyId } = event.queryStringParameters || {};

    if (!storyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing storyId' }),
      };
    }

    // Listar todos los capítulos de una historia
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Prefix: `chapters/${storyId}/`,
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ chapters: [] }),
      };
    }

    // Obtener el contenido de cada capítulo
    const chaptersPromises = listResponse.Contents.map(async (item) => {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: item.Key,
      });

      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      return JSON.parse(bodyContents);
    });

    const chapters = await Promise.all(chaptersPromises);
    
    // Ordenar por número de capítulo
    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

    return {
      statusCode: 200,
      body: JSON.stringify({ chapters }),
    };
  } catch (error) {
    console.error('Error getting chapters from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get chapters', message: error.message }),
    };
  }
};
