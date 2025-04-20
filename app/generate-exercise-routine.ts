'use server';
/**
 * @fileOverview An AI agent that generates a personalized exercise routine based on user's exercise history and Peter Attia's research.
 *
 * - generateExerciseRoutine - A function that handles the exercise routine generation process.
 * - GenerateExerciseRoutineInput - The input type for the generateExerciseRoutine function.
 * - GenerateExerciseRoutineOutput - The return type for the generateExerciseRoutine function.
 */

import {ai} from '@/ai/ai-instance';
import {getExerciseHistory, ExerciseEntry} from '@/services/exercise-history';
import {z} from 'genkit';

const GenerateExerciseRoutineInputSchema = z.object({
  fitnessGoal: z.string().describe('The fitness goal of the user (e.g., strength, endurance, flexibility).'),
  availableTime: z.number().describe('The amount of time the user has available for the exercise routine in minutes.'),
  age: z.number().describe('The age of the user in years.'),
  gender: z.enum(['male', 'female', 'other']).describe('The gender of the user.'),
  activityLevel: z.enum(['sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extraActive']).describe('The activity level of the user.'),
});
export type GenerateExerciseRoutineInput = z.infer<typeof GenerateExerciseRoutineInputSchema>;

const ExerciseSchema = z.object({
  exerciseName: z.string().describe('The name of the exercise.'),
  sets: z.number().describe('The number of sets for the exercise.'),
  reps: z.string().describe('The number of repetitions for each set (e.g., 8-12).'),
  restTime: z.string().describe('The rest time between sets in seconds (e.g., 60 seconds).'),
});

const GenerateExerciseRoutineOutputSchema = z.object({
  routine: z.array(ExerciseSchema).describe('The generated exercise routine.'),
  notes: z.string().optional().describe('Any notes or recommendations for the user.'),
});
export type GenerateExerciseRoutineOutput = z.infer<typeof GenerateExerciseRoutineOutputSchema>;

export async function generateExerciseRoutine(input: GenerateExerciseRoutineInput): Promise<GenerateExerciseRoutineOutput> {
  return generateExerciseRoutineFlow(input);
}

const generateExerciseRoutinePrompt = ai.definePrompt({
  name: 'generateExerciseRoutinePrompt',
  input: {
    schema: z.object({
      fitnessGoal: z.string().describe('The fitness goal of the user (e.g., strength, endurance, flexibility).'),
      availableTime: z.number().describe('The amount of time the user has available for the exercise routine in minutes.'),
      exerciseHistory: z.array(z.object({
        exerciseType: z.string(),
        durationMinutes: z.number(),
        intensity: z.string(),
        date: z.string(),
      })).describe('The user exercise history for the last 30 days.'),
      age: z.number().describe('The age of the user in years.'),
      gender: z.enum(['male', 'female', 'other']).describe('The gender of the user.'),
      activityLevel: z.enum(['sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extraActive']).describe('The activity level of the user.'),
    }),
  },
  output: {
    schema: z.object({
      routine: z.array(z.object({
        exerciseName: z.string().describe('The name of the exercise.'),
        sets: z.number().describe('The number of sets for the exercise.'),
        reps: z.string().describe('The number of repetitions for each set (e.g., 8-12).'),
        restTime: z.string().describe('The rest time between sets in seconds (e.g., 60 seconds).'),
      })).describe('The generated exercise routine.'),
      notes: z.string().optional().describe('Any notes or recommendations for the user.'),
    }),
  },
  prompt: `You are an AI personal trainer specializing in exercise routines based on Peter Attia's research. Consider the user's fitness goal, available time, exercise history, age, gender and activity level to generate a personalized and well-balanced exercise routine.

Fitness Goal: {{{fitnessGoal}}}
Available Time: {{{availableTime}}} minutes
Exercise History: {{#each exerciseHistory}}- {{{exerciseType}}} ({{{durationMinutes}}} mins, {{{intensity}}}){{/each}}
Age: {{{age}}}
Gender: {{{gender}}}
Activity Level: {{{activityLevel}}}

Based on this information, generate an exercise routine with specific exercises, sets, reps, and rest times. Ensure the routine is well-balanced and avoids overtraining. Take into account the user's age, gender, and activity level to tailor the routine appropriately. For example, consider the user's gender and adjust the intensity and type of exercises accordingly. Consider their activity level in suggesting the routine. Make sure the exercise routine is safe and effective for the user.

Remember to add a notes section with any recommendations or additional info.
`,
});

const generateExerciseRoutineFlow = ai.defineFlow<
  typeof GenerateExerciseRoutineInputSchema,
  typeof GenerateExerciseRoutineOutputSchema
>({
  name: 'generateExerciseRoutineFlow',
  inputSchema: GenerateExerciseRoutineInputSchema,
  outputSchema: GenerateExerciseRoutineOutputSchema,
}, async (input) => {
  const exerciseHistory = await getExerciseHistory();
  const { output } = await generateExerciseRoutinePrompt({
    ...input,
    exerciseHistory,
  });
  return output!;
});
