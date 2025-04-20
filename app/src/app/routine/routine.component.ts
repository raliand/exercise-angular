import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'; // Import OnInit
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox'; // Import MatCheckboxModule
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@app-shared/auth/data/auth.store';
import { createLogger } from '@app-shared/logger';
import { ExerciseRoutine, GenerateExerciseRoutineInput } from '@common';
import { take } from 'rxjs'; // Import take operator
import { ProfileService } from '../profile/data/profile.service';
import { ExerciseRoutineService } from '../services/exercise-routine.service';
import { RoutinePersistenceService } from '../services/routine-persistence.service';

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
    ],
    templateUrl: './routine.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RoutineComponent implements OnInit { // Implement OnInit
    private readonly profileService = inject(ProfileService);
    private readonly routineGenerationService = inject(ExerciseRoutineService); // Use renamed service
    private readonly routinePersistenceService = inject(RoutinePersistenceService); // Inject the persistence service
    private readonly authStore = inject(AuthStore);

    readonly userProfile = toSignal(this.profileService.userProfile$);
    readonly userId = toSignal(this.authStore.userId$);

    readonly generatedRoutine = signal<ExerciseRoutine | null>(null);
    readonly isLoading = signal(false); // Combined loading state
    readonly error = signal<string | null>(null);

    readonly canGenerate = computed(() => !!this.userProfile() && !!this.userId());
    readonly todayDateString = getTodayDateString(); // Store today's date string

    ngOnInit(): void {
        this.loadRoutineForToday(); // Calls the loading method on initialization
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
                        this.generatedRoutine.set(routine); // Sets the loaded routine
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
                this.generatedRoutine.set(result);
                // Save the newly generated routine for today
                await this.routinePersistenceService.saveRoutineForDate(result, this.todayDateString);
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

    async toggleExerciseCompletion(exerciseIndex: number, completed: boolean) {
        const currentRoutine = this.generatedRoutine();
        if (!currentRoutine) return;

        // Create a new array with the updated exercise
        const updatedExercises = currentRoutine.routine.map((exercise, index) => {
            if (index === exerciseIndex) {
                return { ...exercise, completed }; // Create a new exercise object with updated completion status
            }
            return exercise;
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
            logger.log(`Exercise ${exerciseIndex} completion status updated and saved.`);
        } catch (err) {
            logger.error('Error saving updated routine:', err);
            this.error.set('Failed to save exercise completion status.');
            // Optionally revert the UI change if saving fails
            // this.generatedRoutine.set(currentRoutine);
        }
    }
}
