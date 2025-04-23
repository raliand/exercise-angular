import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'; // Import OnInit
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox'; // Import MatCheckboxModule
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // Import MatDialog and MatDialogModule
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router'; // Import Router
import { AuthStore } from '@app-shared/auth/data/auth.store';
import { createLogger } from '@app-shared/logger';
import { Exercise, ExerciseRoutine, GenerateExerciseRoutineInput } from '@common'; // Import Exercise type
import { filter, take } from 'rxjs'; // Import filter and take operators
import { ProfileService } from '../profile/data/profile.service';
import { ExerciseRoutineService } from '../services/exercise-routine.service';
import { RoutinePersistenceService } from '../services/routine-persistence.service';
import { AddExerciseDialogComponent } from './add-exercise-dialog/add-exercise-dialog.component'; // Import the dialog component

const logger = createLogger('RoutineComponent');

// Helper function to get today's date as YYYY-MM-DD
function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to calculate age
function calculateAge(dobString: string): number {
    try {
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch (e) {
        logger.error('Error calculating age:', e);
        return 0; // Return 0 or handle error appropriately
    }
}

@Component({
    selector: 'app-routine',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule, // For routerLink
        MatCardModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatListModule,
        MatIconModule,
        MatDividerModule,
        MatCheckboxModule, // Add MatCheckboxModule here
        MatDialogModule, // Add MatDialogModule
        // AddExerciseDialogComponent is standalone, no need to import here unless used directly in template
    ],
    templateUrl: './routine.component.html',
    styleUrl: './routine.component.scss', // Add styleUrl
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RoutineComponent implements OnInit { // Implement OnInit
    private readonly profileService = inject(ProfileService);
    private readonly routineGenerationService = inject(ExerciseRoutineService); // Use renamed service
    private readonly routinePersistenceService = inject(RoutinePersistenceService); // Inject the persistence service
    private readonly authStore = inject(AuthStore);
    private readonly router = inject(Router); // Inject Router
    private readonly dialog = inject(MatDialog); // Inject MatDialog

    readonly userProfile = toSignal(this.profileService.userProfile$);
    readonly userId = toSignal(this.authStore.userId$);

    readonly generatedRoutine = signal<ExerciseRoutine | null>(null);
    readonly isLoading = signal(false); // Combined loading state
    readonly error = signal<string | null>(null);

    readonly canGenerate = computed(() => !!this.userProfile() && !!this.userId());
    readonly todayDateString = getTodayDateString(); // Store today's date string

    ngOnInit(): void {
        // Subscribe to the profile observable to check its initial state
        this.profileService.userProfile$
            .pipe(
                // filter(profile => profile !== undefined), // Optional: if initial undefined is an issue
                take(1) // Take the first emitted value (null or profile)
            )
            .subscribe(profile => {
                if (!profile) {
                    logger.warn('No user profile found on init, redirecting to profile page.');
                    this.router.navigate(['/profile']); // Redirect to profile page
                } else {
                    logger.log('User profile found, loading routine for today.');
                    this.loadRoutineForToday(); // Load data only if profile exists
                }
            });
    }

    loadRoutineForToday(): void {
        this.isLoading.set(true);
        this.error.set(null);
        // Uses the persistence service to load the routine for today's date
        this.routinePersistenceService.loadRoutineForDate(this.todayDateString)
            .pipe(take(1)) // Take the first emission
            .subscribe({
                next: (routine) => {
                    if (routine) {
                        logger.log('Loaded routine for today:', routine);
                        // Ensure completed is a number, default to 0 if missing or not a number
                        const validatedRoutine = {
                            ...routine,
                            routine: routine.routine.map(ex => ({
                                ...ex,
                                completed: typeof ex.completed === 'number' ? ex.completed : 0
                            }))
                        };
                        this.generatedRoutine.set(validatedRoutine); // Sets the loaded routine
                    } else {
                        logger.log('No routine found for today.');
                        this.generatedRoutine.set(null); // Ensures it's null if not found
                    }
                    this.isLoading.set(false);
                },
                error: (err) => {
                    logger.error('Error loading routine for today:', err);
                    this.error.set('Failed to load today\'s routine.');
                    this.isLoading.set(false);
                }
            });
    }

    async generateRoutine() {
        const profile = this.userProfile();
        const currentUserId = this.userId();

        if (!profile || !currentUserId) {
            logger.warn('Cannot generate routine: Profile or User ID missing.');
            this.error.set('Please complete your profile before generating a routine.');
            return;
        }

        this.isLoading.set(true);
        this.error.set(null);
        this.generatedRoutine.set(null);

        const age = calculateAge(profile.dob);
        if (age <= 0) {
            this.error.set('Invalid Date of Birth in profile.');
            this.isLoading.set(false);
            return;
        }

        const input: GenerateExerciseRoutineInput = {
            fitnessGoal: profile.exerciseGoal,
            availableTime: 60,
            age: age,
            gender: profile.gender,
            activityLevel: profile.activityLevel,
            userId: currentUserId,
        };

        try {
            // Use the generation service
            const result = await this.routineGenerationService.generateRoutine(input).toPromise();
            logger.log('Routine generated successfully:', result);
            if (result) {
                // Ensure completed is initialized to 0 for new routines
                const initializedRoutine = {
                    ...result,
                    routine: result.routine.map(ex => ({ ...ex, completed: 0 }))
                };
                this.generatedRoutine.set(initializedRoutine);
                // Save the newly generated routine for today
                await this.routinePersistenceService.saveRoutineForDate(initializedRoutine, this.todayDateString);
            } else {
                this.generatedRoutine.set(null);
                this.error.set('The generation service returned an empty result.');
            }
        } catch (err: any) {
            logger.error('Error generating routine:', err);
            this.error.set(err.message || 'An unknown error occurred while generating the routine.');
        } finally {
            this.isLoading.set(false);
        }
    }

    // Updated method to handle set completion toggle
    async toggleSetCompletion(exerciseIndex: number, setIndex: number, isChecked: boolean) {
        const currentRoutine = this.generatedRoutine();
        if (!currentRoutine) return;

        const exercise = currentRoutine.routine[exerciseIndex];
        if (!exercise) return;

        // Calculate the new completed count
        // If checked, it means this set (setIndex + 1) is now completed.
        // If unchecked, it means this set (setIndex + 1) is now incomplete.
        // We assume sets are completed sequentially for simplicity in this logic.
        // A more robust logic might be needed if sets can be marked out of order.
        const currentCompletedCount = typeof exercise.completed === 'number' ? exercise.completed : 0;
        let newCompletedCount = currentCompletedCount;

        if (isChecked) {
            // If checking this box, ensure all previous boxes are implicitly checked
            // and set the count to this set's index + 1
            newCompletedCount = setIndex + 1;
        } else {
            // If unchecking this box, ensure all subsequent boxes are implicitly unchecked
            // and set the count to the previous set's index + 1 (or 0 if it's the first set)
            newCompletedCount = setIndex;
        }

        // Ensure the count doesn't exceed the total number of sets
        newCompletedCount = Math.max(0, Math.min(newCompletedCount, exercise.sets));


        // Create a new array with the updated exercise
        const updatedExercises = currentRoutine.routine.map((ex, idx) => {
            if (idx === exerciseIndex) {
                return { ...ex, completed: newCompletedCount }; // Update completed count
            }
            return ex;
        });

        // Create a new routine object with the updated exercises
        const updatedRoutine: ExerciseRoutine = {
            ...currentRoutine,
            routine: updatedExercises,
        };

        // Update the signal
        this.generatedRoutine.set(updatedRoutine);

        // Persist the change
        try {
            await this.routinePersistenceService.saveRoutineForDate(updatedRoutine, this.todayDateString);
            logger.log(`Exercise ${exerciseIndex}, Set ${setIndex + 1} completion toggled. New count: ${newCompletedCount}. Routine saved.`);
        } catch (err) {
            logger.error('Error saving updated routine:', err);
            this.error.set('Failed to save exercise completion status.');
            // Optionally revert the UI change if saving fails
            // this.generatedRoutine.set(currentRoutine);
        }
    }


    async removeExercise(exerciseIndex: number) {
        const currentRoutine = this.generatedRoutine();
        if (!currentRoutine) return;

        // Create a new array excluding the exercise at the given index
        const updatedExercises = currentRoutine.routine.filter((_, index) => index !== exerciseIndex);

        // Create a new routine object with the updated exercises
        const updatedRoutine: ExerciseRoutine = {
            ...currentRoutine,
            routine: updatedExercises,
        };

        // Update the signal
        this.generatedRoutine.set(updatedRoutine);

        // Persist the change
        try {
            await this.routinePersistenceService.saveRoutineForDate(updatedRoutine, this.todayDateString);
            logger.log(`Exercise ${exerciseIndex} removed and routine saved.`);
        } catch (err) {
            logger.error('Error saving routine after removing exercise:', err);
            this.error.set('Failed to save routine after removing exercise.');
            // Optionally revert the UI change if saving fails
            // this.generatedRoutine.set(currentRoutine);
        }
    }

    openAddExerciseDialog(): void {
        const dialogRef = this.dialog.open(AddExerciseDialogComponent, {
            width: '400px', // Adjust width as needed
        });

        dialogRef.afterClosed().pipe(filter(result => !!result)).subscribe(async (newExerciseData: Omit<Exercise, 'completed'>) => {
            logger.log('Dialog closed with new exercise:', newExerciseData);
            await this.addExercise(newExerciseData);
        });
    }

    private async addExercise(newExerciseData: Omit<Exercise, 'completed'>) {
        const currentRoutine = this.generatedRoutine();
        if (!currentRoutine) return; // Should not happen if button is only shown when routine exists

        const newExercise: Exercise = {
            ...newExerciseData,
            completed: 0, // New exercises start with 0 completed sets
        };

        const updatedExercises = [...currentRoutine.routine, newExercise];

        const updatedRoutine: ExerciseRoutine = {
            ...currentRoutine,
            routine: updatedExercises,
        };

        // Update the signal
        this.generatedRoutine.set(updatedRoutine);

        // Persist the change
        try {
            await this.routinePersistenceService.saveRoutineForDate(updatedRoutine, this.todayDateString);
            logger.log('New exercise added and routine saved.');
        } catch (err) {
            logger.error('Error saving routine after adding exercise:', err);
            this.error.set('Failed to save routine after adding exercise.');
            // Optionally revert the UI change if saving fails
            // const revertedExercises = currentRoutine.routine.filter(ex => ex !== newExercise);
            // this.generatedRoutine.set({ ...currentRoutine, routine: revertedExercises });
        }
    }

    // Helper function to create an array of numbers from 0 to n-1
    counter(n: number): number[] {
        return Array.from({ length: n }, (_, i) => i);
    }
}
