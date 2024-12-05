import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Las credenciales de Twilio no están configuradas correctamente');
}

const client = twilio(accountSid, authToken);

export const sendWhatsAppMessage = async (to: string, message: string) => {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      body: message,
      to: `whatsapp:${to}`
    });
    
    return response;
  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error);
    throw error;
  }
}; 

export const sendTemplateMessage = async (to: string) => {
  try {
    const message = await client.messages.create({
      contentSid: "HX6d1a1a351989d68147fdc94539cd7bb5",
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    });
    return message;
  } catch (error) {
    console.error('Error enviando el mensaje de plantilla:', error);
    throw error;
  }
};
