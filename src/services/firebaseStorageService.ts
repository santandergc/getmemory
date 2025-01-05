import { storage } from '../config/firebase';

export const uploadImageToFirebase = async (file: Express.Multer.File): Promise<string> => {
  try {
    const bucket = storage.bucket();
    const fileName = `images/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const fileUpload = bucket.file(fileName);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Error en blobStream:', error);
        reject(new Error(`Error al subir el archivo: ${error.message}`));
      });

      blobStream.on('finish', async () => {
        try {
          const [url] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
          });
          resolve(url);
        } catch (error) {
          console.error('Error al generar URL:', error);
          reject(new Error('Error al generar la URL del archivo'));
        }
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error('Error en uploadImageToFirebase:', error);
    throw new Error(`Error al inicializar la subida`);
  }
}; 