import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Missing Firebase credentials in environment variables');
        }

        // Replace escaped newlines if they exist (some platforms escape them)
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: formattedPrivateKey,
            }),
        });

        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        console.warn('⚠️  Continuing with in-memory storage only');
    }
}

// Export database instances (null if initialization failed)
export const db = admin.apps.length ? admin.firestore() : null;
// Note: We only use Firestore, not Realtime Database
export const rtdb = null;
