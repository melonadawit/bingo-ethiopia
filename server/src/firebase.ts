import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        // Check if we have a base64 encoded service account
        const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

        if (serviceAccountBase64) {
            // Decode base64 service account
            const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
            const serviceAccount = JSON.parse(serviceAccountJson);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase initialized with base64 service account');
        } else {
            // Fallback to individual environment variables
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (privateKey) {
                // Formatting fixes for common env var issues:
                // 1. Remove wrapping quotes if user pasted them
                if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                    privateKey = privateKey.slice(1, -1);
                }
                // 2. Convert literal \n string to actual newlines
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            if (projectId && clientEmail && privateKey) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey
                    })
                });
                console.log('✅ Firebase initialized with environment variables');
            } else {
                console.warn('⚠️  Firebase credentials not found - using in-memory storage');
            }
        }
    } catch (error) {
        console.warn('⚠️  Firebase initialization failed:', error);
    }
}

// Export instances
// Export instances
export const db = admin.apps.length ? admin.firestore() : null;
export const rtdb = admin.apps.length ? admin.database() : null;
