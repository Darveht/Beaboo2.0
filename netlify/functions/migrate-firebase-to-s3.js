
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
  },
});

function fetchFirebaseData(path) {
  return new Promise((resolve, reject) => {
    const url = `https://noble-amp-458106-g0-default-rtdb.firebaseio.com${path}.json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function downloadImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('data:image')) {
    return null;
  }
  return imageUrl;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { deleteFromFirebase = false } = JSON.parse(event.body || '{}');

    // Obtener todas las historias de Firebase
    const firebaseStories = await fetchFirebaseData('/stories');

    if (!firebaseStories) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No stories found in Firebase', migrated: 0 }),
      };
    }

    const migratedStories = [];
    const errors = [];

    // Migrar cada historia
    for (const [firebaseId, story] of Object.entries(firebaseStories)) {
      try {
        const storyId = `story_${story.createdAt || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let coverImageUrl = null;

        // Si hay imagen de portada en base64, subirla
        if (story.coverImage && story.coverImage.startsWith('data:image')) {
          const base64Data = story.coverImage.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const coverKey = `covers/${story.userId}/${storyId}_cover.jpg`;

          const coverCommand = new PutObjectCommand({
            Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
            Key: coverKey,
            Body: buffer,
            ContentType: 'image/jpeg',
            ContentEncoding: 'base64',
          });

          await s3Client.send(coverCommand);
          coverImageUrl = `https://${process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025'}.s3.${process.env.MY_AWS_REGION || 'us-east-2'}.amazonaws.com/${coverKey}`;
        } else if (story.coverImage && story.coverImage.startsWith('http')) {
          coverImageUrl = story.coverImage;
        }

        // Crear objeto con los datos de la historia
        const storyData = {
          id: storyId,
          firebaseId: firebaseId, // Mantener referencia al ID antiguo
          title: story.title || 'Sin título',
          category: story.category || 'otros',
          rating: story.rating || 'all',
          language: story.language || 'es',
          synopsis: story.synopsis || '',
          userId: story.userId || '',
          username: story.username || 'Anónimo',
          email: story.email || '',
          coverImage: coverImageUrl,
          timestamp: story.createdAt || Date.now(),
          views: story.views || 0,
          ratingValue: story.ratingValue || 0,
          isPrivate: story.isPrivate || false,
          type: story.type || 'story'
        };

        // Subir metadata de la historia a S3
        const storyKey = `stories/metadata/${storyId}.json`;
        const storyCommand = new PutObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: storyKey,
          Body: JSON.stringify(storyData),
          ContentType: 'application/json',
        });

        await s3Client.send(storyCommand);
        migratedStories.push({
          firebaseId,
          newId: storyId,
          title: story.title
        });

      } catch (error) {
        console.error(`Error migrating story ${firebaseId}:`, error);
        errors.push({
          firebaseId,
          title: story.title,
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        migrated: migratedStories.length,
        errors: errors.length,
        stories: migratedStories,
        errorDetails: errors
      }),
    };
  } catch (error) {
    console.error('Error in migration:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Migration failed', message: error.message }),
    };
  }
};
