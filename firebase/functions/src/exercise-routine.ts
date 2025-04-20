import { gemini20Flash, googleAI } from '@genkit-ai/googleai';
import { getApps, initializeApp } from 'firebase-admin/app'; // Import Firebase admin app functions
import { FieldPath, getFirestore } from 'firebase-admin/firestore'; // Import Firestore admin SDK and FieldPath
import { genkit } from 'genkit';
import { z } from 'zod';
import { ExerciseRoutine, GenerateExerciseRoutineInputSchema, GenerateExerciseRoutineOutputSchema } from '../../common/models'; // Adjust the import path as necessary

// Initialize Firebase Admin SDK if not already initialized
if (getApps().length === 0) {
    initializeApp();
}
const db = getFirestore();


// Placeholder for fetching exercise history from Firebase (e.g., Firestore)
// You'll need to implement this based on your data structure
async function getExerciseHistoryFromFirebase(userId: string): Promise<{ exerciseName: string; sets: number; reps: string; daysAgo: string }[]> { // Fix Array<T> to T[]
    console.log(`Fetching exercise history for user: ${userId}`);
    const routinesColRef = db.collection('users').doc(userId).collection('routines');
    const q = routinesColRef.orderBy(FieldPath.documentId(), 'desc').limit(30); // Order by date (doc ID) descending, limit 30

    try {
        const querySnapshot = await q.get();
        const history: { exerciseName: string; sets: number; reps: string; daysAgo: string }[] = []; // Fix Array<T> to T[]
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for accurate day difference calculation

        querySnapshot.forEach(docSnap => {
            const routineData = docSnap.data() as ExerciseRoutine; // Cast to ExerciseRoutine type
            const dateString = docSnap.id; // YYYY-MM-DD

            // Calculate daysAgo
            const routineDateParts = dateString.split('-').map(Number);
            const year = routineDateParts[0];
            const month = routineDateParts[1];
            const day = routineDateParts[2];

            // Validate date parts before creating Date object
            if (routineDateParts.length !== 3 || year === undefined || month === undefined || day === undefined || isNaN(year) || isNaN(month) || isNaN(day)) {
                console.warn(`Skipping document with invalid date format ID: ${dateString}`);
                return; // Skip this document
            }

            // Types are guaranteed by the check above
            // Note: Month is 0-indexed in JavaScript Date constructor
            const routineDate = new Date(year, month - 1, day);
            routineDate.setHours(0, 0, 0, 0); // Normalize routine date

            const diffTime = Math.abs(today.getTime() - routineDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const daysAgoStr = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

            // Removed the unnecessary 'if (routineData.routine)' check
            routineData.routine.forEach(exercise => {
                history.push({
                    exerciseName: exercise.exerciseName,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    daysAgo: daysAgoStr, // Use the calculated days ago string
                });
            });
        });

        console.log(`Fetched ${history.length} exercises from the last ${querySnapshot.size} routines.`);
        return history;
    } catch (error) {
        console.error("Error fetching exercise history from Firebase:", error);
        // Return empty array or re-throw error depending on desired behavior
        return [];
    }
}

// Prompt Definition (copied from generate-exercise-routine.ts)
const ai = genkit({
    plugins: [
        googleAI(), // Use the Google AI plugin
    ],
    model: gemini20Flash, // Specify the model directly here or in configureGenkit
});

const generateExerciseRoutinePrompt = ai.definePrompt({
    name: 'generateExerciseRoutinePromptFirebase', // Renamed slightly for clarity
    input: {
        schema: z.object({
            fitnessGoal: z.string(),
            availableTime: z.number(),
            exerciseHistory: z.array(z.object({
                exerciseName: z.string(),
                sets: z.number(),
                reps: z.string(),
                daysAgo: z.string(),
            })),
            age: z.number(),
            gender: z.enum(['male', 'female', 'other']),
            activityLevel: z.enum(['sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extraActive']),
        }),
    },
    output: {
        schema: GenerateExerciseRoutineOutputSchema, // Use the defined output schema
    },
    prompt: `You are an AI personal trainer specializing in exercise routines based on Peter Attia's research. Consider the user's fitness goal, available time, exercise history, age, gender and activity level to generate a personalized and well-balanced exercise routine.

Fitness Goal: {{{fitnessGoal}}}
Available Time: {{{availableTime}}} minutes
Exercise History: {{#each exerciseHistory}}- {{{exerciseName}}} ({{{sets}}} sets, {{{reps}}} reps, {{{daysAgo}}}){{/each}}
Age: {{{age}}}
Gender: {{{gender}}}
Activity Level: {{{activityLevel}}}

Based on this information, generate an exercise routine with specific exercises, sets, reps, and rest times. Ensure the routine is well-balanced and avoids overtraining. Take into account the user's age, gender, and activity level to tailor the routine appropriately. For example, consider the user's gender and adjust the intensity and type of exercises accordingly. Consider their activity level in suggesting the routine. Make sure the exercise routine is safe and effective for the user.

Remember to add a notes section with any recommendations or additional info.
`,
    model: gemini20Flash, // Specify model directly here or in configureGenkit
});


// Flow Definition (adapted from generate-exercise-routine.ts)
export const generateExerciseRoutineFlow = ai.defineFlow<
    typeof GenerateExerciseRoutineInputSchema,
    typeof GenerateExerciseRoutineOutputSchema
>({
    name: 'generateExerciseRoutineFlowFirebase', // Renamed slightly
    outputSchema: GenerateExerciseRoutineOutputSchema,
}, async (input) => {
    // Get userId from the flow input
    const userId = input.userId; // Use userId from input

    const exerciseHistory = await getExerciseHistoryFromFirebase(userId);

    const { output } = await generateExerciseRoutinePrompt({
        ...input,
        exerciseHistory,
    });

    if (!output) {
        throw new Error("Failed to generate exercise routine from AI model.");
    }
    return output;
});
