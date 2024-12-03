import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

if (!process.env.OPENAI_KEY) {
  throw new Error('La clave API de OpenAI no está configurada');
}

export const transcribeAudio = async (audioUrl: string): Promise<string> => {
  try {
    // Descargar el archivo de audio desde la URL
    const response = await fetch(audioUrl);
    const audioBuffer = await response.arrayBuffer();

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

