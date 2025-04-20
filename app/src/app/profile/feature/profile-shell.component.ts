import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { createLogger } from '@app-shared/logger';
import { UserProfile } from '@common';
import { BehaviorSubject } from 'rxjs';
import { ProfileService } from '../data/profile.service';
import { ProfileFormComponent } from '../ui/profile-form.component';

const logger = createLogger('ProfileShellComponent');

@Component({
  selector: 'app-profile-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    MatCardModule,
    MatProgressSpinnerModule,
    ProfileFormComponent,
    TitleCasePipe,
  ],
  template: `
    <h2>User Profile</h2>

    <!-- Use the async pipe once and then check the result -->
    @if (isFinishedLoading$ | async; as isLoadingResult) {
      <!-- Data has loaded (either profile or null) -->
      @if (profile$ | async; as profileResult) {
        <!-- Profile exists, show details -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Your Profile</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p><strong>Date of Birth:</strong> {{ profileResult.dob }}</p>
            <p><strong>Weight:</strong> {{ profileResult.weightKg }} kg</p>
            <p><strong>Height:</strong> {{ profileResult.heightCm }} cm</p>
            <p><strong>Activity Level:</strong> {{ profileResult.activityLevel | titlecase }}</p>
            <p><strong>Exercise Goal:</strong> {{ profileResult.exerciseGoal.replace('_', ' ') | titlecase }}</p>
            <!-- TODO: Add edit button -->
          </mat-card-content>
        </mat-card>
      } @else {
        <!-- Profile is null (not found), show the form -->
        <app-profile-form (profileSaved)="onProfileSaved($event)" />
      }
    } @else {
      <!-- profile$ | async resulted in undefined (initial loading state) -->
      <div class="flex justify-center items-center p-8">
        <mat-spinner diameter="50"></mat-spinner>
      </div>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileShellComponent {
  readonly #profileService = inject(ProfileService);

  // Use a BehaviorSubject to allow updating the profile after save
  readonly #profileSubject = new BehaviorSubject<UserProfile | null | undefined>(undefined); // undefined initially means loading
  readonly #isFinishedLoading = new BehaviorSubject<boolean>(false); // undefined initially means loading
  readonly profile$ = this.#profileSubject.asObservable();
  readonly isFinishedLoading$ = this.#isFinishedLoading.asObservable();

  constructor() {
    // Subscribe to the service's profile stream and update the subject
    this.#profileService.userProfile$.subscribe({
      next: (profile) => {
        logger.log('Received profile update from service:', profile);
        this.#profileSubject.next(profile);
        this.#isFinishedLoading.next(true); // Set loading to false once we have a profile or null
      },
      error: (err) => {
        logger.error('Error fetching profile:', err);
        this.#profileSubject.next(null); // Treat error as no profile found for now
        this.#isFinishedLoading.next(true); // Set loading to false even on error
      }
    });
  }

  onProfileSaved(profile: UserProfile): void {
    logger.log('Profile saved event received in shell:', profile);
    // Update the local state to show the newly saved profile immediately
    this.#profileSubject.next(profile);
  }
}
