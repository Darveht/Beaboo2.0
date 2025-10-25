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
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      const { userId } = event.queryStringParameters || {};
      
      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing userId' }),
        };
      }

      let notifications = [];
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `notifications/${userId}.json`,
        });
        const response = await s3Client.send(getCommand);
        notifications = JSON.parse(await streamToString(response.Body));
      } catch (error) {
        notifications = [];
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ notifications }),
      };
    }

    if (event.httpMethod === 'POST') {
      const { action, userId, notificationId, notification } = JSON.parse(event.body);

      if (!action || !userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields' }),
        };
      }

      let notifications = [];
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `notifications/${userId}.json`,
        });
        const response = await s3Client.send(getCommand);
        notifications = JSON.parse(await streamToString(response.Body));
      } catch (error) {
        notifications = [];
      }

      if (action === 'add') {
        const newNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...notification,
          timestamp: Date.now(),
          read: false
        };
        notifications.unshift(newNotification);
      } else if (action === 'mark-read' && notificationId) {
        const index = notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          notifications[index].read = true;
        }
      } else if (action === 'delete' && notificationId) {
        notifications = notifications.filter(n => n.id !== notificationId);
      }

      const putCommand = new PutObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: `notifications/${userId}.json`,
        Body: JSON.stringify(notifications),
        ContentType: 'application/json',
      });

      await s3Client.send(putCommand);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, notifications }),
      };
    }
  } catch (error) {
    console.error('Error managing notifications:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to manage notifications', message: error.message }),
    };
  }
};
