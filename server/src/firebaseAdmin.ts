import admin from "firebase-admin"
import dotenv from 'dotenv';

dotenv.config()

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
    throw new Error("missing .env variables for firebase admin")
}
const serviceAccount: admin.ServiceAccount = {
    projectId,
    clientEmail,
    privateKey
};

if(!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export default admin