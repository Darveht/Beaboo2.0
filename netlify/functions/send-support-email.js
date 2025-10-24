const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
  },
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email, problemType, description, userId } = JSON.parse(event.body);

    if (!email || !problemType || !description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const supportRequest = {
      email,
      problemType,
      description,
      userId: userId || 'anonymous',
      timestamp: Date.now(),
      status: 'pending'
    };

    const requestId = `support_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const supportKey = `support-requests/${requestId}.json`;

    const command = new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME || 'libros-de-glam-2025',
      Key: supportKey,
      Body: JSON.stringify(supportRequest),
      ContentType: 'application/json',
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error saving support request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save support request', message: error.message }),
    };
  }
};