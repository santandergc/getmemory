import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const getWelcomeTemplate = (userName: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px; background-color: #f9fafb; border-radius: 8px; margin-top: 20px; }
        .button { background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Bienvenido a Memori! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hola ${userName},</h2>
          <p>¡Nos alegra mucho tenerte con nosotros! Tu cuenta ha sido creada exitosamente.</p>
          <p>Recuerda que debes ingresar a la plataforma con este mismo correo.</p>
          <p>Ahora podrás acceder a Memori utilizando tu cuenta de Google para:</p>
          <ul>
            <li>Crear y guardar tus memorias más preciadas</li>
            <li>Compartir historias con tus seres queridos</li>
            <li>Preservar momentos especiales para siempre</li>
          </ul>
          <center>
            <a href="https://app.getmemori.org" class="button" style="color: white; background-color: #4CAF50; font-weight: bold;">Comenzar ahora</a>
          </center>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Memori. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendWelcomeEmail = async (to: string, userName: string): Promise<void> => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || '',
    subject: '¡Bienvenido a Memori! 🎉',
    text: `¡Hola ${userName}! Bienvenido a Memori. Tu cuenta ha sido creada exitosamente.`,
    html: getWelcomeTemplate(userName)
  };

  try {
    await sgMail.send(msg);
    console.log('Correo de bienvenida enviado exitosamente');
  } catch (error) {
    console.error('Error enviando el correo de bienvenida:', error);
    throw new Error('Error al enviar el correo de bienvenida');
  }
}; 