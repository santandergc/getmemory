import { OpenAI } from 'openai';
import fetch from 'node-fetch';
import { improveTranscription } from './openAIQuestionService';

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

    const audioBuffer = await response.arrayBuffer();
    return audioBuffer;
  } catch (error) {
    console.error('Error al descargar el archivo de audio:', error);
    throw error;
  }
};

export const transcribeAudio = async (audioUrl: string): Promise<string> => {
  try {
    const audioBuffer = await fetchAudioFile(audioUrl);
    const audioFile = new File(
      [audioBuffer], 
      'audio.ogg',
      { type: 'audio/ogg' }
    );
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

export const transcribeFile = async (audioFile: File): Promise<string> => {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es'
    });

    // Mejorar el texto usando GPT-4o-mini
    const improvedText = await improveTranscription(transcription.text);
    return improvedText;
  } catch (error) {
    console.error('Error al transcribir el archivo:', error);
    throw error;
  }
};

