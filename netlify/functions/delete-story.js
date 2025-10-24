
const { S3Client, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

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
    const { storyId } = JSON.parse(event.body);

    if (!storyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing storyId' }),
      };
    }

    // Obtener la metadata de la historia para saber el coverImage
    const storyKey = `stories/metadata/${storyId}.json`;
    let storyData;
    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: storyKey,
      });
      const response = await s3Client.send(getCommand);
      const bodyContents = await streamToString(response.Body);
      storyData = JSON.parse(bodyContents);
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Story not found' }),
      };
    }

    // Eliminar la imagen de portada si existe
    if (storyData.coverImage && storyData.coverImage.includes('amazonaws.com')) {
      const urlParts = storyData.coverImage.split('.amazonaws.com/');
      if (urlParts.length >= 2) {
        const coverKey = urlParts[1];
        const deleteCoverCommand = new DeleteObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: coverKey,
        });
        await s3Client.send(deleteCoverCommand);
      }
    }

    // Listar y eliminar todos los capítulos
    const listChaptersCommand = new ListObjectsV2Command({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Prefix: `chapters/${storyId}/`,
    });

    const chaptersResponse = await s3Client.send(listChaptersCommand);
    if (chaptersResponse.Contents && chaptersResponse.Contents.length > 0) {
      const deletePromises = chaptersResponse.Contents.map(item => {
        return s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: item.Key,
        }));
      });
      await Promise.all(deletePromises);
    }

    // Eliminar la metadata de la historia
    const deleteStoryCommand = new DeleteObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: storyKey,
    });

    await s3Client.send(deleteStoryCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error deleting story from S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete story', message: error.message }),
    };
  }
};
