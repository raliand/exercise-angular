import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { createLogger } from '@app-shared/logger';
import { ActivityLevel, ExerciseGoal, Gender, UserProfile } from '@common';
import { ProfileService } from '../data/profile.service';

const logger = createLogger('ProfileFormComponent');

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    TitleCasePipe,
  ],
  providers: [provideNativeDateAdapter()], // Needed for MatDatepicker
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Complete Your Profile</mat-card-title>
        <mat-card-subtitle>Please provide your details to get started.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Date of Birth</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dob" required>
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            @if (profileForm.controls.dob.invalid && profileForm.controls.dob.touched) {
              <mat-error>Date of Birth is required.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Weight (kg)</mat-label>
            <input matInput type="number" formControlName="weightKg" required min="1">
             @if (profileForm.controls.weightKg.invalid && profileForm.controls.weightKg.touched) {
              <mat-error>Valid weight is required.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Height (cm)</mat-label>
            <input matInput type="number" formControlName="heightCm" required min="1">
             @if (profileForm.controls.heightCm.invalid && profileForm.controls.heightCm.touched) {
              <mat-error>Valid height is required.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Gender</mat-label>
            <mat-select formControlName="gender" required>
              @for (gen of genders; track gen) {
                <mat-option [value]="gen">{{ gen | titlecase }}</mat-option>
              }
            </mat-select>
             @if (profileForm.controls.gender.invalid && profileForm.controls.gender.touched) {
              <mat-error>Gender is required.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Activity Level</mat-label>
            <mat-select formControlName="activityLevel" required>
              @for (level of activityLevels; track level) {
                <mat-option [value]="level">{{ level | titlecase }}</mat-option> <!-- Assuming titlecase pipe works well enough -->
              }
            </mat-select>
             @if (profileForm.controls.activityLevel.invalid && profileForm.controls.activityLevel.touched) {
              <mat-error>Activity level is required.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Exercise Goal</mat-label>
            <mat-select formControlName="exerciseGoal" required>
               @for (goal of exerciseGoals; track goal) {
                <mat-option [value]="goal">{{ goal.replace('_', ' ') | titlecase }}</mat-option>
              }
            </mat-select>
             @if (profileForm.controls.exerciseGoal.invalid && profileForm.controls.exerciseGoal.touched) {
              <mat-error>Exercise goal is required.</mat-error>
            }
          </mat-form-field>

          <mat-card-actions align="end">
            <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid || saving">
              {{ saving ? 'Saving...' : 'Save Profile' }}
            </button>
          </mat-card-actions>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-form-field {
      margin-bottom: 1rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent {
  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);

  readonly profileSaved = output<UserProfile>();

  saving = false;

  readonly genders: Gender[] = ['male', 'female', 'other'];
  readonly activityLevels: ActivityLevel[] = ['sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extraActive'];
  readonly exerciseGoals: ExerciseGoal[] = ['weight_loss', 'muscle_gain', 'general_fitness', 'strength_training', 'endurance'];

  readonly profileForm = this.#fb.group({
    dob: ['', Validators.required],
    weightKg: [<number | null>null, [Validators.required, Validators.min(1)]],
    heightCm: [<number | null>null, [Validators.required, Validators.min(1)]],
    gender: [<Gender | null>null, Validators.required],
    activityLevel: [<ActivityLevel | null>null, Validators.required],
    exerciseGoal: [<ExerciseGoal | null>null, Validators.required],
  });

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      logger.warn('Form submitted while invalid.');
      this.profileForm.markAllAsTouched(); // Ensure errors are shown
      return;
    }

    this.saving = true;
    // Use getRawValue() to include disabled controls if any, though not strictly necessary here
    // Use .value is generally fine for active forms.
    const formValue = this.profileForm.value;

    const dobValue = formValue.dob;

    // 1. Check if dobValue exists and is not an empty string (which results in invalid date)
    if (!dobValue) {
      logger.error('Date of Birth is required.');
      this.saving = false;
      this.profileForm.controls.dob.markAsTouched();
      this.profileForm.controls.dob.setErrors({ required: true });
      return;
    }

    // 2. Try creating a Date object
    const dobDate = new Date(dobValue);

    // 3. Check if the created date is valid
    if (isNaN(dobDate.getTime())) {
      logger.error('Invalid Date of Birth provided.');
      this.saving = false;
      this.profileForm.controls.dob.markAsTouched();
      this.profileForm.controls.dob.setErrors({ invalidDate: true });
      return; // Or handle the error appropriately
    }

    // If we reach here, dobDate is a valid Date object
    const dobISO = dobDate.toISOString().split('T')[0] as string; // Get YYYY-MM-DD format, now guaranteed string

    // Assertions (!) are used based on the assumption that the `Validators.required`
    // check combined with `this.profileForm.invalid` guard ensures these values are present.
    const profileData: UserProfile = {
      dob: dobISO, // No longer causes a type error
      weightKg: formValue.weightKg!,
      heightCm: formValue.heightCm!,
      gender: formValue.gender!,
      activityLevel: formValue.activityLevel!,
      exerciseGoal: formValue.exerciseGoal!,
    };

    try {
      logger.log('Attempting to save profile:', profileData);
      await this.#profileService.saveUserProfile(profileData);
      logger.log('Profile saved successfully via service.');
      this.profileSaved.emit(profileData);
      this.profileForm.reset(); // Optionally reset form after successful save
    } catch (error) {
      logger.error('Error saving profile:', error);
      // TODO: Show user-friendly error message
    } finally {
      this.saving = false;
      // Manually trigger change detection if needed, though OnPush might handle it with async pipe
    }
  }
}
