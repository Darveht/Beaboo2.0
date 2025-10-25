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
    const { userId } = event.queryStringParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId' }),
      };
    }

    const stats = {
      storiesCount: 0,
      totalViews: 0,
      followersCount: 0,
      followingCount: 0,
      notesCount: 0
    };

    // Obtener historias del usuario
    const listStoriesCommand = new ListObjectsV2Command({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Prefix: 'stories/metadata/',
    });

    const storiesResponse = await s3Client.send(listStoriesCommand);

    if (storiesResponse.Contents) {
      const userStories = await Promise.all(
        storiesResponse.Contents.map(async (item) => {
          const getCommand = new GetObjectCommand({
            Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
            Key: item.Key,
          });
          const response = await s3Client.send(getCommand);
          const bodyContents = await streamToString(response.Body);
          return JSON.parse(bodyContents);
        })
      );

      const filteredStories = userStories.filter(story => story.userId === userId);
      stats.storiesCount = filteredStories.length;
      stats.totalViews = filteredStories.reduce((sum, story) => sum + (story.views || 0), 0);
    }

    // Obtener seguidores
    try {
      const followersCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: `followers/${userId}.json`,
      });
      const followersResponse = await s3Client.send(followersCommand);
      const followersData = JSON.parse(await streamToString(followersResponse.Body));
      stats.followersCount = Object.keys(followersData).length;
    } catch (error) {
      stats.followersCount = 0;
    }

    // Obtener siguiendo
    try {
      const followingCommand = new GetObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: `following/${userId}.json`,
      });
      const followingResponse = await s3Client.send(followingCommand);
      const followingData = JSON.parse(await streamToString(followingResponse.Body));
      stats.followingCount = Object.keys(followingData).length;
    } catch (error) {
      stats.followingCount = 0;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ stats }),
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get user stats', message: error.message }),
    };
  }
};
