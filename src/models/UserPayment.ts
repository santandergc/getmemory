import mongoose, { Schema, Document } from 'mongoose';

interface IUserPayment extends Document {
  email: string;
  active: boolean;
  quantity: number;
}


const userPaymentSchema = new Schema<IUserPayment>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserPayment>('UserPayment', userPaymentSchema);
