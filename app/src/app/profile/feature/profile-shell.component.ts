import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
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
    MatButtonModule, // Add MatButtonModule
    MatCardModule,
    MatIconModule, // Add MatIconModule
    MatProgressSpinnerModule,
    ProfileFormComponent,
    TitleCasePipe,
  ],
  template: `
    <h2>User Profile</h2>

    <!-- Use the async pipe once and then check the result -->
    @if (isFinishedLoading$ | async) {
      <!-- Data has loaded (either profile or null) -->
      @if (profile$ | async; as profileResult) {
        <!-- Profile exists -->
        @if (isEditing()) {
          <!-- Edit Mode: Show form with current data -->
          <h3>Edit Profile</h3>
          <app-profile-form
            [initialProfile]="profileResult"
            (profileSaved)="onProfileSaved($event)"
            (cancelled)="cancelEdit()"
           />
        } @else {
          <!-- View Mode: Show details -->
          <mat-card class="opacity-80">
            <mat-card-header>
              <mat-card-title>Your Profile</mat-card-title>
              <button mat-icon-button (click)="toggleEditMode()" aria-label="Edit profile">
                <mat-icon>edit</mat-icon>
              </button>
            </mat-card-header>
            <mat-card-content>
              <p><strong>Date of Birth:</strong> {{ profileResult.dob }}</p>
              <p><strong>Weight:</strong> {{ profileResult.weightKg }} kg</p>
              <p><strong>Height:</strong> {{ profileResult.heightCm }} cm</p>
              <p><strong>Activity Level:</strong> {{ profileResult.activityLevel | titlecase }}</p>
              <p><strong>Exercise Goal:</strong> {{ profileResult.exerciseGoal.replace('_', ' ') | titlecase }}</p>
            </mat-card-content>
          </mat-card>
        }
      } @else {
        <!-- Profile is null (not found), show the form to create -->
        <h3>Create Profile</h3>
        <p>Please create your profile to get started.</p>
        <app-profile-form (profileSaved)="onProfileSaved($event)" />
      }
    } @else {
      <!-- Initial loading state -->
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

  // Use a BehaviorSubject to allow updating the profile after save/edit
  readonly #profileSubject = new BehaviorSubject<UserProfile | null | undefined>(undefined); // undefined initially means loading
  readonly #isFinishedLoading = new BehaviorSubject<boolean>(false);
  readonly profile$ = this.#profileSubject.asObservable();
  readonly isFinishedLoading$ = this.#isFinishedLoading.asObservable();

  // Add a signal for edit mode state
  readonly isEditing = signal(false);

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

  toggleEditMode(): void {
    this.isEditing.set(!this.isEditing());
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  onProfileSaved(profile: UserProfile): void {
    logger.log('Profile saved/updated event received in shell:', profile);
    // Update the local state to show the newly saved/updated profile immediately
    this.#profileSubject.next(profile);
    // Exit edit mode if we were editing
    if (this.isEditing()) {
      this.isEditing.set(false);
      // Persist the update via the service (assuming an update method exists or save handles upsert)
      // If ProfileService.saveUserProfile handles both create and update, this is fine.
      // Otherwise, you might need an explicit update method.
      this.#profileService.saveUserProfile(profile)
        .then(() => logger.log('Profile updated successfully via service.'))
        .catch((err) => logger.error('Error updating profile via service:', err));
    } else {
      // This was a create operation, the service call was already handled by the form component's interaction
      // or should have been triggered before this event if the shell is responsible.
      // Assuming the form component calls the service on save for creation.
      logger.log('Profile created.');
    }
  }
}
