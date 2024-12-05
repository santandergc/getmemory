import dotenv from 'dotenv';
// Configurar dotenv antes de cualquier otra importación
dotenv.config();

import express from 'express';
import { connectDB } from './config/db';
import whatsappRoutes from './routes/whatsappRoutes';

// Inicializar Express
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear el cuerpo de las peticiones de Twilio
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/whatsapp', whatsappRoutes);

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