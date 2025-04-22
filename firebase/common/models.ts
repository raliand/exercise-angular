import { z } from 'zod';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'; // Keep or remove based on overall usage
export type ExerciseGoal = 'weight_loss' | 'muscle_gain' | 'general_fitness' | 'strength_training' | 'endurance';
// Define ActivityLevel based on GenerateExerciseRoutineInputSchema
export type ActivityLevel = 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active' | 'Extra Active';
// Define Gender based on GenerateExerciseRoutineInputSchema
export type Gender = 'male' | 'female' | 'other';

// Define possible age-related conditions
export type AgeRelatedCondition = 'menopause' | 'pregnancy' | 'postpartum'; // Add more as needed

export type UserProfile = Readonly<{
  dob: string; // ISO 8601 date string e.g., "YYYY-MM-DD" (Used to calculate age)
  weightKg: number;
  heightCm: number;
  // fitnessLevel: FitnessLevel; // Removed, replaced by activityLevel
  exerciseGoal: ExerciseGoal; // Corresponds to fitnessGoal in the input schema
  gender: Gender; // Added
  activityLevel: ActivityLevel; // Added
  ageRelatedConditions?: AgeRelatedCondition[]; // Optional array for conditions
}>;

// Define Exercise based on ExerciseSchema
export type Exercise = Readonly<{
  exerciseName: string;
  sets: number;
  reps: string;
  restTime: string;
  completed?: boolean; // Add optional completed field
}>;

// Define ExerciseRoutine based on GenerateExerciseRoutineOutputSchema
export type ExerciseRoutine = Readonly<{
  routine: Exercise[];
  notes?: string; // Optional notes
}>;

export type WithId = { id: string };

export type User = Readonly<
  WithId & {
    displayName: string | null;
    email: string | null;
    emailVerified: boolean;
    lastSignInTime: string | null;
    creationTime: string | null;
  }
>;

export const GenerateExerciseRoutineInputSchema = z.object({ // Add export
  fitnessGoal: z.string().describe('The fitness goal of the user (e.g., strength, endurance, flexibility).'),
  availableTime: z.number().describe('The amount of time the user has available for the exercise routine in minutes.'),
  age: z.number().describe('The age of the user in years.'),
  gender: z.enum(['male', 'female', 'other']).describe('The gender of the user.'),
  activityLevel: z.enum(['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active']).describe('The activity level of the user.'),
  userId: z.string().describe('The ID of the user.'), // Add userId to input
  // Consider adding ageRelatedConditions here if the AI needs it for generation
});
export type GenerateExerciseRoutineInput = z.infer<typeof GenerateExerciseRoutineInputSchema>;

const ExerciseSchema = z.object({
  exerciseName: z.string().describe('The name of the exercise.'),
  sets: z.number().describe('The number of sets for the exercise.'),
  reps: z.string().describe('The number of repetitions for each set (e.g., 8-12).'),
  restTime: z.string().describe('The rest time between sets in seconds (e.g., 60 seconds).'),
  completed: z.boolean().optional().default(false).describe('Whether the user has completed this exercise for the routine.'), // Add completed field to schema
});

export const GenerateExerciseRoutineOutputSchema = z.object({ // Add export
  routine: z.array(ExerciseSchema).describe('The generated exercise routine.'),
  notes: z.string().optional().describe('Any notes or recommendations for the user.'),
});
export type GenerateExerciseRoutineOutput = z.infer<typeof GenerateExerciseRoutineOutputSchema>;
