import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

if (!process.env.OPENAI_KEY) {
  throw new Error('La clave API de OpenAI no está configurada');
}


const fetchAudioFile = async (audioUrl: string) => {
  try {
    const response = await fetch(audioUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al descargar el archivo: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer(); // Descargar como buffer binario
    return audioBuffer;
  } catch (error) {
    console.error('Error al descargar el archivo de audio:', error);
    throw error;
  }
};


export const transcribeAudio = async (audioUrl: string): Promise<string> => {
  try {
    // Descargar el archivo de audio desde la URL
    const audioBuffer = await fetchAudioFile(audioUrl);

    // Crear un objeto File desde el buffer
    const audioFile = new File(
      [audioBuffer], 
      'audio.ogg',
      { type: 'audio/ogg' }
    );

    // Transcribir usando Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es'
    });

    return transcription.text;

  } catch (error) {
    console.error('Error al transcribir el audio:', error);
    throw error;
  }
};

