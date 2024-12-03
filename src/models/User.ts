import mongoose, { Schema, Document } from 'mongoose';

interface IChatMessage {
  message: string;
  type: 'incoming' | 'outgoing';
  timestamp: Date;
}

interface IUser extends Document {
  whatsappNumber: string;
  stage: string;
  currentQuestion: number;
  fullName?: string;
  birthInfo?: string;
  chatHistory: IChatMessage[];
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
});

const userSchema = new Schema<IUser>(
  {
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    stage: {
      type: String,
      required: true,
      enum: ['onboarding', 'infancia', 'chat'],
      default: 'onboarding',
    },
    currentQuestion: {
      type: Number,
      required: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    birthInfo: {
      type: String,
      trim: true,
    },
    chatHistory: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

export default mongoose.model<IUser>('User', userSchema);
