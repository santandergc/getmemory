import mongoose, { Schema, Document } from 'mongoose';

interface IUserOnboarding extends Document {
  firebaseId: string;              // ID único de Firebase
  email: string;                   // Email del usuario autenticado con Firebase
  displayName: string | null;      // Nombre mostrado de Google
  photoURL: string | null;         // URL de la foto de perfil de Google
  primaryPhone: string;            // Número de WhatsApp del usuario final
  userInfo: {
    fullName: string;
    birthDate: string;
    sex: string;
    phone: string;
    country: string;
  };
  selectedQuestions: [{
    questionId: number;
    text: string;
  }];
  schedule: {
    days: string[];
    time: string;
    timezone: string;
    active: boolean;
  };
  trackingPhones: [{
    phoneNumber: string;
    notificationType: 'weekly';
  }];
  status: 'pending' | 'active' | 'paused' | 'completed';
  currentPhase: {
    onboarding: boolean;
    question: boolean;
    configuration: boolean;
    edition: boolean;
  },
  lastLogin: Date;                 // Última vez que inició sesión
  createdAt: Date;
  updatedAt: Date;
}

const userOnboardingSchema = new Schema<IUserOnboarding>({
  firebaseId: {
    type: String,
    required: true,
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
  primaryPhone: {
    type: String,
    unique: true,
    sparse: true,  // Permite nulos y mantiene unicidad
    trim: true,
  },
  userInfo: {
    fullName: {
      type: String,
      trim: true,
    },
    sex: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    birthDate: {
      type: String,
    },
    address: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  selectedQuestions: [{
    questionId: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    }
  }],
  schedule: {
    days: {
      type: [String],
      required: true,
    },
    time: { 
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  trackingPhones: [{
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    notificationType: {
      type: String,
      enum: ['weekly'],
      default: 'weekly',
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed'],
    default: 'pending',
  },
  currentPhase: {
    onboarding: {
      type: Boolean,
      default: true,
    },
    question: {
      type: Boolean,
      default: false,
    },
    configuration: {
      type: Boolean,
      default: false,
    },
    edition: {
      type: Boolean,
      default: false,
    },
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