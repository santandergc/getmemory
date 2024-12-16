import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  questionId: number; // Identificador único de la pregunta
  category: string; // Categoría de la pregunta
  text: string; // Texto de la pregunta
}

const QuestionSchema: Schema = new Schema({
  questionId: {
    type: Number,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
});

export default mongoose.model<IQuestion>('Question', QuestionSchema);
