import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';

const serviceAccount = require(path.join(__dirname, '../../memori-8485a-173f0f4e55ce.json'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

export const auth = getAuth(app); 