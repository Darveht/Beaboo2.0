
const { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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
  try {
    const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
    
    // Listar todas las historias
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Prefix: 'stories/metadata/',
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No stories found', deleted: 0 }),
      };
    }

    let deletedCount = 0;
    
    // Revisar cada historia
    for (const item of listResponse.Contents) {
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: item.Key,
        });

        const response = await s3Client.send(getCommand);
        const bodyContents = await streamToString(response.Body);
        const story = JSON.parse(bodyContents);

        // Si la historia tiene más de 12 horas, eliminarla
        if (story.timestamp <= twelveHoursAgo) {
          // Eliminar imagen de portada
          if (story.coverImage && story.coverImage.includes('amazonaws.com')) {
            const urlParts = story.coverImage.split('.amazonaws.com/');
            if (urlParts.length >= 2) {
              const coverKey = urlParts[1];
              const deleteCoverCommand = new DeleteObjectCommand({
                Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
                Key: coverKey,
              });
              await s3Client.send(deleteCoverCommand);
            }
          }

          // Eliminar metadata
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
            Key: item.Key,
          });
          await s3Client.send(deleteCommand);
          
          deletedCount++;
          console.log(`Deleted old story: ${story.id}`);
        }
      } catch (error) {
        console.error(`Error processing story ${item.Key}:`, error);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Cleanup completed', 
        deleted: deletedCount 
      }),
    };
  } catch (error) {
    console.error('Error in cleanup:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Cleanup failed', message: error.message }),
    };
  }
};
