import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
});

// Configuración específica para archivos de audio
export const uploadAudio = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB para archivos de audio
  },
  fileFilter: (_req, file, cb) => {
    // Aceptamos cualquier tipo de archivo, ya que manejaremos el formato en el controlador
    cb(null, true);
  },
}); 