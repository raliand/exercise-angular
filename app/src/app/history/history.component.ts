import { CommonModule } from '@angular/common'; // Import CommonModule
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button'; // Import Button Module
import { MatCardModule } from '@angular/material/card'; // Import Material Card
import { MatDividerModule } from '@angular/material/divider'; // Import Material Divider
import { MatExpansionModule } from '@angular/material/expansion'; // Import Expansion Panel Module
import { MatIconModule } from '@angular/material/icon'; // Import Material Icon
import { MatListModule } from '@angular/material/list'; // Import Material List
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Import Spinner
import { ExerciseRoutine } from '@common';
// Import BehaviorSubject, finalize
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { RoutinePersistenceService } from '../services/routine-persistence.service';

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

    pastRoutines$!: Observable<{ date: string; routine: ExerciseRoutine }[]>;
    isLoading$ = new BehaviorSubject<boolean>(true);

    // Track expanded state for each date
    dateExpandedStates: { [key: string]: boolean } = {};

    ngOnInit(): void {
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
}
