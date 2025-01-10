import mongoose, { Schema, Document, Types } from 'mongoose';

interface IConversationMessage {
  message: string;
  type: 'incoming' | 'outgoing';
  timestamp: Date;
}

interface IUserQuestion {
  _id?: Types.ObjectId;
  questionId: number; // ID único de la pregunta
  text: string; // Texto de la pregunta
  summary: string; // Resumen de la pregunta
  conversationHistory: IConversationMessage[]; // Historial de la conversación para esta pregunta
  chapter: string; // Capítulo de la pregunta
  wordCount: number; // Conteo acumulado de palabras de las respuestas del usuario
  minWords: number; // Cantidad mínima de palabras para completar la pregunta
  isCompleted: boolean; // Si la pregunta fue completada
  completedCountMessages: number; // Cantidad de mensajes enviados para completar la pregunta
  messageCounter: number; // Contador de mensajes para resumen
  textResult: string; // Texto de la respuesta del usuario
  images?: string[]; // Lista de imágenes asociadas a la pregunta
  metadata: string; // Metadatos asociados a la pregunta
}

interface IUser extends Document {
  whatsappNumber: string; // Número de WhatsApp del usuario
  fatherId: mongoose.Types.ObjectId; // ID del padre/tutor
  fullName: string; // Nombre completo del usuario
  birthInfo: string; // Fecha de nacimiento (ej. '2000-05-23')
  currentQuestion: number; // step del usuario nuevo
  currentQuestionId: number; // ID de la pregunta actual
  currentStage: string; // Etapa actual del usuario
  gender: string; // Sexo del usuario
  country: string; // País del usuario
  onboarding: {
    history: IConversationMessage[];
    chapterStarted: boolean;
  };
  reminder: {
    time: string; // Hora de envío (formato 'HH:mm', ej. '08:00')
    recurrency: string; // Días de envío (ej. ['Monday', 'Friday'] para semanal, o ['Monday', 'Tuesday', 'Wednesday'] para diario)
    timeZone: string; // Zona horaria en formato IANA (ej. 'America/Mexico_City')
    active: boolean; // Si el usuario tiene activado el envío de mensajes
    mails: string[]; // Lista de correos electrónicos a los que se enviarán los mensajes
  };
  questions: IUserQuestion[]; // Lista de preguntas asociadas al usuario
  biographyInfo?: string;
  started: boolean; // Si el usuario ha iniciado la aplicación
  isGift: boolean; // Si el usuario es un regalo
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
  chapter: {
    type: String,
    default: '',
  },
  wordCount: {
    type: Number,
    default: 0,
  },
  minWords: {
    type: Number,
    default: 300,
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
  textResult: {
    type: String,
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
  metadata: {
    type: String,
    default: '',
  }
})

const userSchema = new Schema<IUser>(
  {
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fatherId: {
      type: Schema.Types.ObjectId, 
      ref: 'UserOnboarding',
      required: false,
    },
    fullName: {
      type: String,
      trim: true,
    },
    birthInfo: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    currentQuestion: {
      type: Number,
      default: 0,
    },
    currentQuestionId: {
      type: Number,
      default: 0, 
    },
    currentStage: {
      type: String,
      enum: ['new', 'onboarding', 'questions'],
      default: 'new',
    },
    onboarding:{
      history: {
        type: [conversationMessageSchema],
        default: [],
      },
      chapterStarted: {
        type: Boolean,
        default: false,
      },
    },
    reminder: {
      time: { 
        type: String,
        default: '10:00',
      },
      recurrency: {
        type: String,
        default: '2',
      },
      timeZone: {
        type: String,
        default: 'America/Mexico_City',
      },
      active: {
        type: Boolean,
        default: true,
      },
      mails: {
        type: [String],
        default: [],
      },
    },
    questions: {
      type: [userQuestionSchema],
      default: [],
    },
    biographyInfo: {
      type: String,
      default: '',
    },
    started: {
      type: Boolean,
      default: false,
    },
    isGift: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Agrega automáticamente campos `createdAt` y `updatedAt`
  }
);

export default mongoose.model<IUser>('User', userSchema);
