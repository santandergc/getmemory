import dotenv from 'dotenv';
import cors from 'cors';
// Configurar dotenv antes de cualquier otra importación
dotenv.config();

import express from 'express';
import { connectDB } from './config/db';
import whatsappRoutes from './routes/whatsappRoutes';
import './config/firebase'; // Importar al inicio para asegurar la inicialización

// Inicializar Express
const app = express();

// Configurar CORS para permitir conexiones locales
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear el cuerpo de las peticiones de Twilio
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api', whatsappRoutes);

// Conectar a la base de datos
connectDB();

// Puerto
const PORT = process.env.PORT || 3000;

// Importar el servicio de mensajes programados
import { ScheduledMessageService } from './services/scheduledMessageService';

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  // Iniciar el scheduler
  ScheduledMessageService.initScheduler();
}); 