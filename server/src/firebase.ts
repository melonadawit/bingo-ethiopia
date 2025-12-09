import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// In a real environment, you would use serviceAccountKey.json
// For now, we will mock or expect a valid environment setup

// const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(), // or cert(serviceAccount)
            databaseURL: process.env.FIREBASE_DB_URL || "https://your-project.firebaseio.com"
        });
    } catch (error) {
        console.warn("Firebase Admin Initialization Failed (Expected during setup):", error);
    }
}

// Export instances
export const db = admin.apps.length ? admin.firestore() : {} as FirebaseFirestore.Firestore;
export const rtdb = admin.apps.length ? admin.database() : {} as admin.database.Database;
