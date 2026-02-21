import admin from './config/firebase.js';

async function checkFirestore() {
    console.log("Checking Firestore connection...");

    try {
        if (!admin.apps.length) {
            console.error("Admin not initialized!");
            return;
        }

        const db = admin.firestore();
        const testDocRef = db.collection('users').doc('test_verification_user');

        // Write test doc
        console.log("Writing test document...");
        await testDocRef.set({
            subscriptionTier: 'pro',
            updatedAt: new Date().toISOString(),
            test: true
        });
        console.log("Write successful.");

        // Read test doc
        console.log("Reading test document...");
        const docSnap = await testDocRef.get();
        if (docSnap.exists) {
            console.log("Read successful. Data:", docSnap.data());
        } else {
            console.error("Document not found after write!");
        }

        // Delete test doc
        console.log("Cleaning up...");
        await testDocRef.delete();
        console.log("Cleanup successful.");

        console.log("\nVERIFICATION RESULT: SUCCESS. Subscription storage is working.");
        process.exit(0);
    } catch (error) {
        console.error("VERIFICATION FAILED:", error);
        process.exit(1);
    }
}

checkFirestore();
