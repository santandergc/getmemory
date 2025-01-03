import mongoose, { Schema, Document } from 'mongoose';

interface IConversationMessage {
  message: string;
  type: 'incoming' | 'outgoing';
  timestamp: Date;
}

interface IUserFreeTrial extends Document {
  whatsappNumber: string;
  fullName: string;
  history: IConversationMessage[];
  started: boolean;
  freeMessages: number;
  createdAt: Date;
  updatedAt: Date;
  status: number;
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

const userFreeTrialSchema = new Schema<IUserFreeTrial>(
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
    status: {
      type: Number,
      default: 0,
    },
    history: {
      type: [conversationMessageSchema],
      default: [],
    },
    started: {
      type: Boolean,
      default: false,
    },
    freeMessages: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserFreeTrial>('UserFreeTrial', userFreeTrialSchema);

