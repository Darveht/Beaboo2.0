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
  try {
    if (event.httpMethod === 'GET') {
      const { userId } = event.queryStringParameters || {};
      
      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing userId' }),
        };
      }

      let warnings = [];
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `userWarnings/${userId}.json`,
        });
        const response = await s3Client.send(getCommand);
        warnings = JSON.parse(await streamToString(response.Body));
      } catch (error) {
        warnings = [];
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ warnings }),
      };
    }

    if (event.httpMethod === 'POST') {
      const { action, userId, warning } = JSON.parse(event.body);

      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing userId' }),
        };
      }

      let warnings = [];
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
          Key: `userWarnings/${userId}.json`,
        });
        const response = await s3Client.send(getCommand);
        warnings = JSON.parse(await streamToString(response.Body));
      } catch (error) {
        warnings = [];
      }

      if (action === 'add') {
        const newWarning = {
          id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...warning,
          timestamp: Date.now()
        };
        warnings.push(newWarning);
      } else if (action === 'clear') {
        warnings = [];
      }

      const putCommand = new PutObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
        Key: `userWarnings/${userId}.json`,
        Body: JSON.stringify(warnings),
        ContentType: 'application/json',
      });

      await s3Client.send(putCommand);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, warnings }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error managing user warnings:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to manage user warnings', message: error.message }),
    };
  }
};
