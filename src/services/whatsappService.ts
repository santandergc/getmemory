import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Las credenciales de Twilio no están configuradas correctamente');
}

const client = twilio(accountSid, authToken);

export const sendWhatsAppMessage = async (to: string, message: string, from?: string) => {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${from || process.env.TWILIO_WHATSAPP_NUMBER}`,
      body: message,
      to: `whatsapp:${to}`
    });
    
    return response;
  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error);
    throw error;
  }
}; 

export const sendTemplateMessage = async (to: string, from?: string) => {
  try {
    const message = await client.messages.create({
      contentSid: "HX83640330ea1364245ea951932f7210a1",
      from: `whatsapp:${from || process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    });
    return message;
  } catch (error) {
    console.error('Error enviando el mensaje de plantilla:', error);
    throw error;
  }
};

export const sendWhatsAppImage = async (to: string, imageUrl: string, caption: string = '', from?: string) => {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${from || process.env.TWILIO_WHATSAPP_NUMBER}`,
      mediaUrl: [imageUrl],
      body: caption,
      to: `whatsapp:${to}`
    });
    return response;
  } catch (error) {
    console.error('Error enviando imagen por WhatsApp:', error);
    throw error;
  }
};

export const sendWhatsAppVideo = async (to: string, videoUrl: string, from?: string) => {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${from || process.env.TWILIO_WHATSAPP_NUMBER}`,
      mediaUrl: [videoUrl],
      to: `whatsapp:${to}`
    });
    return response;
  } catch (error) {
    console.error('Error enviando video por WhatsApp:', error);
    throw error;
  }
};

export const sendWhatsAppAudio = async (to: string, audioUrl: string, from?: string) => {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${from || process.env.TWILIO_WHATSAPP_NUMBER}`,
      mediaUrl: [audioUrl],
      to: `whatsapp:${to}`
    });
    return response;
  } catch (error) {
    console.error('Error enviando audio por WhatsApp:', error);
    throw error;
  }
};
