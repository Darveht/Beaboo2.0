
const nodemailer = require('nodemailer');

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

    // Configurar transporter de nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SUPPORT_EMAIL_USER || 'glamworksapps@gmail.com',
        pass: process.env.SUPPORT_EMAIL_PASSWORD, // Necesitarás configurar esto en las variables de entorno
      },
    });

    // Enviar correo al equipo de soporte
    await transporter.sendMail({
      from: process.env.SUPPORT_EMAIL_USER || 'glamworksapps@gmail.com',
      to: 'glamworksapps@gmail.com',
      subject: `Nueva Solicitud de Soporte - ${problemType}`,
      html: `
        <h2>Nueva Solicitud de Soporte</h2>
        <p><strong>Email del usuario:</strong> ${email}</p>
        <p><strong>User ID:</strong> ${userId || 'No registrado'}</p>
        <p><strong>Tipo de problema:</strong> ${problemType}</p>
        <p><strong>Descripción:</strong></p>
        <p>${description}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    // Enviar correo de confirmación al usuario
    await transporter.sendMail({
      from: process.env.SUPPORT_EMAIL_USER || 'glamworksapps@gmail.com',
      to: email,
      subject: 'Hemos recibido tu solicitud de soporte',
      html: `
        <h2>¡Gracias por contactarnos!</h2>
        <p>Hemos recibido tu solicitud de soporte y nuestro equipo la revisará pronto.</p>
        <p><strong>Tipo de problema:</strong> ${problemType}</p>
        <p><strong>Tu mensaje:</strong></p>
        <p>${description}</p>
        <br>
        <p>Te responderemos lo antes posible.</p>
        <p>Saludos,<br>El equipo de BeaBoo</p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error sending support email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', message: error.message }),
    };
  }
};
