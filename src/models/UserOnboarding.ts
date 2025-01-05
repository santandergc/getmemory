import mongoose, { Schema, Document } from 'mongoose';

interface IUserOnboarding extends Document {
  firebaseId: string;              // ID único de Firebase
  email: string;                   // Email del usuario autenticado con Firebase
  displayName: string | null;      // Nombre mostrado de Google
  photoURL: string | null;         // URL de la foto de perfil de Google
  primaryPhone: string;            // Número de WhatsApp del usuario final
  availableUsers: number;          // Cantidad de usuarios disponibles sin onboarding
  usersIds: [Schema.Types.ObjectId];
  users: Array<{
    completed: boolean;
    state: {
      info: boolean;
      questions: boolean;
      reminder: boolean;
    },
    info: {
      fullName: string;
      birthDate: string;
      gender: string;
      phone: string;
      country: string;
      timeZone: string;
      isGift?: boolean;
    },
    questions: Array<{
      questionId: number;
      text: string;
      minWords: number;
      isCompleted: boolean;
      chapter: string;
      metadata: string;
    }>;
    reminder: {
      recurrency: string;
      time: string;
      timeZone: string;
      mails: string[];
      active: boolean;
    }
    isGift: boolean;
  }>;
  status: 'pending' | 'active' | 'paused' | 'completed';
  lastLogin: Date;              
  createdAt: Date;
  updatedAt: Date;
}

const userOnboardingSchema = new Schema<IUserOnboarding>({
  firebaseId: {
    type: String,
    sparse: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  displayName: {
    type: String,
    default: null,
  },
  photoURL: {
    type: String,
    default: null,
  },
  usersIds: [{
    type: Schema.Types.ObjectId,
    ref: 'UserQuestions',
    required: false,
  }],
  availableUsers: {
    type: Number,
    default: 0,
  },
  users: [{
    completed: {
      type: Boolean,
      default: false,
    },
    state: {
      info: {
        type: Boolean,
        default: false,
      },
      questions: {
        type: Boolean,
        default: false,
      },
      reminder: {
        type: Boolean,
        default: false,
      },
    },
    info: {
      fullName: {
        type: String,
        trim: true,
      },
      birthDate: {
        type: String,
      },
      gender: {
        type: String,
        enum: ['male', 'female'],
      },
      phone: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
      timeZone: {
        type: String,
      },
    },
    questions: [{
      questionId: {
        type: Number,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      minWords: {
        type: Number,
        default: 300,
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
      chapter: {
        type: String,
        default: '',
      },
      metadata: {
        type: String,
        default: '',
      }
    }],
    reminder: {
      recurrency: {
        type: String,
      },
      time: {
        type: String,
      },
      timeZone: {
        type: String,
      },
      active: {
        type: Boolean,
        default: true,
      }
    },
    isGift: {
      type: Boolean,
      default: true,
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed'],
    default: 'pending',
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

// Índices
userOnboardingSchema.index({ firebaseId: 1 });
userOnboardingSchema.index({ email: 1 });
userOnboardingSchema.index({ primaryPhone: 1 });
userOnboardingSchema.index({ 'trackingPhones.phoneNumber': 1 });

// Middleware para actualizar lastLogin
userOnboardingSchema.pre('save', function(next) {
  if (this.isNew) {
    this.lastLogin = new Date();
  }
  next();
});

export default mongoose.model<IUserOnboarding>('UserOnboarding', userOnboardingSchema); 