import mongoose, { Schema, Document } from 'mongoose';

interface IConversationMessage {
  message: string;
  type: 'incoming' | 'outgoing';
  timestamp: Date;
}

interface IUserQuestion {
  questionId: number; // ID único de la pregunta
  text: string; // Texto de la pregunta
  summary: string; // Resumen de la pregunta
  conversationHistory: IConversationMessage[]; // Historial de la conversación para esta pregunta
  wordCount: number; // Conteo acumulado de palabras de las respuestas del usuario
  isCompleted: boolean; // Si la pregunta fue completada
  completedCountMessages: number; // Cantidad de mensajes enviados para completar la pregunta
  messageCounter: number; // Contador de mensajes para resumen
}

interface IUser extends Document {
  whatsappNumber: string; // Número de WhatsApp del usuario
  fullName: string; // Nombre completo del usuario
  birthInfo: string; // Fecha de nacimiento (ej. '2000-05-23')
  currentQuestion: number; // ID de la pregunta actual
  currentQuestionId: number; // ID de la pregunta actual
  currentStage: string; // Etapa actual del usuario
  schedule: {
    time: string; // Hora de envío (formato 'HH:mm', ej. '08:00')
    days: string[]; // Días de envío (ej. ['Monday', 'Friday'] para semanal, o ['Monday', 'Tuesday', 'Wednesday'] para diario)
    timezone: string; // Zona horaria en formato IANA (ej. 'America/Mexico_City')
  };
  questions: IUserQuestion[]; // Lista de preguntas asociadas al usuario
  createdAt: Date; // Fecha de creación del usuario
  updatedAt: Date; // Última actualización del usuario
}


const conversationMessageSchema = new Schema<IConversationMessage>({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false }) 

const userQuestionSchema = new Schema<IUserQuestion>({
  questionId: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    default: '',
  },
  conversationHistory: {
    type: [conversationMessageSchema],
    default: [],
  },
  wordCount: {
    type: Number,
    default: 0,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedCountMessages: {
    type: Number,
    default: 0,
  },
  messageCounter: {
    type: Number,
    default: 0,
  },
}, { _id: false })

const userSchema = new Schema<IUser>(
  {
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    birthInfo: {
      type: String,
      trim: true,
    },
    currentQuestion: {
      type: Number,
      default: 0,
    },
    currentQuestionId: {
      type: Number,
      default: 0, // Empieza en 0 antes de asignar la primera pregunta
    },
    currentStage: {
      type: String,
      default: 'onboarding',
    },
    schedule: {
      time: { 
        type: String,
        default: '',
      },
      days: {
        type: [String],
        default: [],
      },
      timezone: {
        type: String,
        default: '',
      }
    },
    questions: {
      type: [userQuestionSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Agrega automáticamente campos `createdAt` y `updatedAt`
  }
);

export default mongoose.model<IUser>('User', userSchema);
