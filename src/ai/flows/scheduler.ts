'use server';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { autonomousCycleOnce } from './autonomous-cycle';

/**
 * A scheduled function that triggers the AI's autonomous cycle.
 * This function is designed to be deployed to Firebase Functions and triggered by Cloud Scheduler.
 * The trigger frequency should be set in the Google Cloud Console.
 */
export const heartbeat = onSchedule('every 5 minutes', async () => {
  console.log('Scheduler heartbeat triggered.');
  try {
    const result = await autonomousCycleOnce();
    console.log('Autonomous cycle run complete.', result);
  } catch (error) {
    console.error('Error running autonomous cycle from scheduler:', error);
  }
});
