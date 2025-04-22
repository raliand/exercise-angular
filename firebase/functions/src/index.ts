import { https } from 'firebase-functions'; // Import https
import { defineSecret } from 'firebase-functions/params';
import { generateExerciseRoutineFlow } from './exercise-routine'; // Import the flow and input schema

// initializeApp();
const apiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// Export the https.onCall function
export const generateExerciseRoutine = https.onCallGenkit({
    secrets: [apiKey],
}, generateExerciseRoutineFlow);
