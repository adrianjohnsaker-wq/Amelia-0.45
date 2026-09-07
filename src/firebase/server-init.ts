import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: DO NOT LEAK THIS FILE TO THE CLIENT.

const apps = getApps();

if (!apps.length) {
    // Initialize with no arguments.
    // This will use Application Default Credentials.
    // In production (App Hosting), this will be the App Hosting service account.
    // In local development, this will be the gcloud user credentials.
    initializeApp();
}

const db = getFirestore(getApp());

export function getDb() {
    return db;
}
