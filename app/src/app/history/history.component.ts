import { CommonModule } from '@angular/common'; // Import CommonModule
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button'; // Import Button Module
import { MatCardModule } from '@angular/material/card'; // Import Material Card
import { MatDividerModule } from '@angular/material/divider'; // Import Material Divider
import { MatExpansionModule } from '@angular/material/expansion'; // Import Expansion Panel Module
import { MatIconModule } from '@angular/material/icon'; // Import Material Icon
import { MatListModule } from '@angular/material/list'; // Import Material List
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Import Spinner
import { Exercise, ExerciseRoutine } from '@common'; // Import Exercise type
// Import BehaviorSubject, finalize
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { createLogger } from '@app-shared/logger';
import { BehaviorSubject, Observable, finalize, take } from 'rxjs';
import { ProfileService } from '../profile/data/profile.service';
import { RoutinePersistenceService } from '../services/routine-persistence.service';

const logger = createLogger('HistoryComponent');

@Component({
    selector: 'app-history',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatListModule,
        MatIconModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatExpansionModule, // Keep Expansion Module
        MatButtonModule, // Keep Button Module (might be needed elsewhere or can be removed if not)
    ],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
    readonly #routinePersistenceService = inject(RoutinePersistenceService);
    private readonly profileService = inject(ProfileService);
    private readonly router = inject(Router);

    // Keep toSignal for potential future template use or consistency
    readonly userProfile = toSignal(this.profileService.userProfile$);

    pastRoutines$!: Observable<{ date: string; routine: ExerciseRoutine }[]>; // Observable for past routines
    isLoading$ = new BehaviorSubject<boolean>(true); // Loading indicator

    // Track expanded state for each date
    dateExpandedStates: { [key: string]: boolean } = {};

    ngOnInit(): void {
        // Subscribe to the profile observable to check its initial state
        this.profileService.userProfile$
            .pipe(
                take(1) // Take the first emitted value (null or profile)
            )
            .subscribe(profile => {
                if (!profile) {
                    logger.warn('No user profile found on init, redirecting to profile page.');
                    this.router.navigate(['/profile']); // Redirect to profile page
                } else {
                    // Proceed with loading history data if needed
                    logger.log('User profile found, proceeding with history component initialization.');
                    // Add history loading logic here if necessary
                }
            });
        this.pastRoutines$ = this.#routinePersistenceService.loadAllRoutines().pipe(
            finalize(() => this.isLoading$.next(false))
        );
        this.pastRoutines$.subscribe();
    }

    // Method to toggle the expanded state for a date
    toggleDateExpand(date: string): void {
        this.dateExpandedStates[date] = !this.dateExpandedStates[date];
    }

    // Method to check if a date panel is expanded
    isDateExpanded(date: string): boolean {
        return !!this.dateExpandedStates[date];
    }

    // Method to get completion status string
    getCompletionStatus(exercise: Exercise): string {
        const completedSets = exercise.completed ?? 0;
        return `${completedSets} out of ${exercise.sets}`;
    }

    // Method to get CSS class based on completion
    getCompletionColorClass(exercise: Exercise): string {
        const completedSets = exercise.completed ?? 0;
        if (completedSets === 0) {
            return 'exercise-incomplete';
        } else if (completedSets < exercise.sets) {
            return 'exercise-partial';
        } else {
            return 'exercise-complete';
        }
    }
}
