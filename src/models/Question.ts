import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  questionId: number; // Identificador único de la pregunta
  text: string; // Texto de la pregunta
  completed: boolean;
}

const QuestionSchema: Schema = new Schema({
  questionId: {
    type: Number,
    required: true,
    unique: true,
  },
  text: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  }
});

export default mongoose.model<IQuestion>('Question', QuestionSchema);
