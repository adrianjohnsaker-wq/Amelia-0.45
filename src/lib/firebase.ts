import { initializeFirebase } from "@/firebase";

const { firestore: db } = initializeFirebase();

export { db };
