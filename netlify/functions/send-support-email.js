const admin = require('firebase-admin');

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://beaboo-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

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

    // Guardar la solicitud en Firebase
    const supportRequest = {
      email,
      problemType,
      description,
      userId: userId || 'anonymous',
      timestamp: Date.now(),
      status: 'pending'
    };

    await db.ref('support-requests').push(supportRequest);

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