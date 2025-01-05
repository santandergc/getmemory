import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  questionId: number; // Identificador único de la pregunta
  text: string; // Texto de la pregunta
  chapter: string;
  minWords: number;
  isCompleted: boolean;
  metadata: string;
}

export interface ITemplateQuestion extends Document {
  name: string;
  questions: IQuestion[];
}

const questionSchema = new Schema<IQuestion>({
  questionId: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  chapter: {
    type: String,
    required: true,
  },
  minWords: {
    type: Number,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: String,
    default: '',
  }
});

const TemplateQuestionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  questions: {
    type: [questionSchema],  
    required: true,
  }
});

export default mongoose.model<ITemplateQuestion>('TemplateQuestion', TemplateQuestionSchema);
