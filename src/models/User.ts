import mongoose, { Schema, Document } from 'mongoose';

interface IChatMessage {
  message: string;
  type: 'incoming' | 'outgoing';
  timestamp: Date;
}

interface IStage {
  name: string; // Nombre de la etapa (ej. "infancia", "adolescencia")
  chatHistory: IChatMessage[]; // Historial de mensajes para la etapa
  summary: string; // Resumen acumulado de la etapa
  isCompleted: boolean; // Si la etapa está completada
  messageCounter: number; // Contador para cada 5 mensajes
  validators: string[]; // Agregamos este campo
  completedCounter: number; // Contador para cada 3 etapas completadas
}

interface IUser extends Document {
  whatsappNumber: string; // Número de WhatsApp del usuario
  currentStage: string; // Etapa actual del usuario
  currentQuestion: number; // Pregunta actual del usuario
  stages: IStage[]; // Lista de etapas del usuario
  fullName?: string; // Nombre completo del usuario
  birthInfo?: string; // Información sobre el nacimiento del usuario
  createdAt: Date;
  updatedAt: Date;
}
const chatMessageSchema = new Schema<IChatMessage>({
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
}, { _id: false });

const stageSchema = new Schema<IStage>({
  name: {
    type: String,
    required: true,
    enum: ['infancia', 'adolescencia', 'adultez', 'vejez'],
  },
  chatHistory: {
    type: [chatMessageSchema],
    default: [],
  },
  summary: {
    type: String,
    default: '',
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedCounter: {
    type: Number,
    default: 0,
  },
  messageCounter: {
    type: Number,
    default: 0,
  },
  validators: {
    type: [String],
    default: [],
  },
}, { _id: false });

const userSchema = new Schema<IUser>(
  {
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    currentStage: {
      type: String,
      required: true,
      enum: ['onboarding', 'infancia', 'adolescencia', 'adultez', 'vejez'],
      default: 'onboarding',
    },
    stages: {
      type: [stageSchema],
      default: [],
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
  },
  {
    timestamps: true, // Agrega automáticamente los campos `createdAt` y `updatedAt`
  }
);

export default mongoose.model<IUser>('User', userSchema);
