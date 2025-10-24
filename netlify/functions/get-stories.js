
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
    const { limit = 100, userId } = event.queryStringParameters || {};

    // Listar todas las historias
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Prefix: 'stories/metadata/',
      MaxKeys: parseInt(limit)
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ stories: [] }),
      };
    }

    // Obtener el contenido de cada historia
    const storiesPromises = listResponse.Contents.map(async (item) => {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: item.Key,
      });

      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      return JSON.parse(bodyContents);
    });

    let stories = await Promise.all(storiesPromises);
    
    // Filtrar por userId si se especifica
    if (userId) {
      stories = stories.filter(story => story.userId === userId);
    }
    
    // Ordenar por timestamp descendente
    stories.sort((a, b) => b.timestamp - a.timestamp);

    return {
      statusCode: 200,
      body: JSON.stringify({ stories }),
    };
  } catch (error) {
    console.error('Error getting stories from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get stories', message: error.message }),
    };
  }
};
