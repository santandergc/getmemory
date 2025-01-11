import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const getPaymentConfirmationTemplate = (userName: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f9f9f9;
                color: #333333;
            }
            .container {
                max-width: 600px;
                margin: 50px auto;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background-color: #606c3e;
                color: #ffffff;
                text-align: center;
                padding: 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 20px;
            }
            .content h2 {
                color: #606c3e;
                font-size: 20px;
            }
            .content p {
                line-height: 1.6;
                margin: 15px 0;
            }
            .button-container {
                text-align: center;
                margin-top: 30px;
            }
            .button {
                text-decoration: none;
                background-color: #606c3e;
                color: #ffffff !important;
                padding: 15px 20px;
                font-size: 16px;
                border-radius: 5px;
                display: inline-block;
            }
            .button:hover {
                background-color: #4e582f;
            }
            .steps {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .steps ol {
                margin: 0;
                padding-left: 20px;
            }
            .steps li {
                margin-bottom: 10px;
            }
            .footer {
                background-color: #f1f1f1;
                color: #777777;
                text-align: center;
                padding: 10px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>¡Gracias por unirte a Memori!</h1>
            </div>

            <div class="content">
                <h2>Hola ${userName},</h2>
                <p>¡Tu pago ha sido procesado exitosamente! Estamos emocionados de que hayas decidido preservar tus memorias más valiosas con nosotros.</p>

                <div class="steps">
                    <h3>Próximos pasos:</h3>
                    <ol>
                        <li>Crea tu cuenta en Memori utilizando este mismo correo electrónico (${userName})</li>
                        <li>Accede a nuestra plataforma</li>
                        <li>Comienza a crear y preservar tus memorias</li>
                    </ol>
                </div>

                <p>Para comenzar tu experiencia en Memori, haz clic en el siguiente botón:</p>

                <div class="button-container">
                    <a href="https://app.getmemori.org" class="button">Comenzar ahora</a>
                </div>

                <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos. Estamos aquí para apoyarte en este hermoso viaje de preservar tus recuerdos.</p>
            </div>

            <div class="footer">
                <p>¿Necesitas ayuda? Escríbenos a <a href="mailto:cristobal@getmemori.org">cristobal@getmemori.org</a></p>
                <p>© ${new Date().getFullYear()} Memori. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const sendPaymentConfirmationEmail = async (to: string, userName: string): Promise<void> => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || '',
    subject: '¡Te damos la bienvenida a Memori! 🎉',
    text: `¡Hola ${userName}! Tu pago ha sido confirmado. Por favor, crea tu cuenta en Memori usando este correo electrónico para comenzar.`,
    html: getPaymentConfirmationTemplate(userName)
  };

  try {
    await sgMail.send(msg);
    console.log('Correo de confirmación de pago enviado exitosamente');
  } catch (error) {
    console.error('Error enviando el correo de confirmación de pago:', error);
    throw new Error('Error al enviar el correo de confirmación de pago');
  }
};