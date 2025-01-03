import admin from 'firebase-admin';

interface ServiceAccountConfig {
  projectId?: string;
  privateKey?: string;
  clientEmail?: string;
}

const serviceAccount: ServiceAccountConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

export const auth = admin.auth();
export const storage = admin.storage();