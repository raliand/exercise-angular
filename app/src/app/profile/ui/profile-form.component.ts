import { TitleCasePipe } from '@angular/common';
// Import toSignal
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop'; // Import toSignal
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { createLogger } from '@app-shared/logger';
import { ActivityLevel, AgeRelatedCondition, ExerciseGoal, Gender, UserProfile } from '@common';
import { calculateAge } from '../../shared/utils/calculate-age';
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
    MatCheckboxModule, // Add MatCheckboxModule
    TitleCasePipe,
  ],
  providers: [provideNativeDateAdapter()], // Needed for MatDatepicker
  template: `
    <mat-card class="opacity-80">
      <mat-card-header>
        <!-- Dynamically set title based on edit mode -->
        <mat-card-title>{{ isEditMode ? 'Edit Your Profile' : 'Complete Your Profile' }}</mat-card-title>
        <mat-card-subtitle>{{ isEditMode ? 'Update your details below.' : 'Please provide your details to get started.' }}</mat-card-subtitle>
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
                <mat-option [value]="level">{{ level.replace('Active', ' Active') | titlecase }}</mat-option> <!-- Display formatting -->
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

          <!-- Conditionally show Age-Related Conditions -->
          @if (showAgeRelatedConditions()) {
            <div formGroupName="ageRelatedConditions" class="w-full mb-4 border-t pt-4 mt-4">
              <label id="age-related-conditions-label" class="block text-sm font-medium text-gray-700 mb-2">Optional: Select any applicable conditions</label>
              <div role="group" aria-labelledby="age-related-conditions-label">
                @for (condition of ageRelatedConditionsOptions; track condition) {
                  <mat-checkbox [formControlName]="condition" class="block mb-1">
                    {{ condition | titlecase }}
                  </mat-checkbox>
                }
              </div>
            </div>
          }

          <mat-card-actions align="end">
            <!-- Add Cancel button for edit mode -->
            @if (isEditMode) {
              <button mat-button type="button" (click)="onCancel()" [disabled]="saving">
                Cancel
              </button>
            }
            <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid || saving">
              {{ saving ? 'Saving...' : (isEditMode ? 'Update Profile' : 'Save Profile') }}
            </button>
          </mat-card-actions>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`mat-form-field { margin-bottom: 1rem; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent implements OnInit {
  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);

  // Input for initial profile data (for editing)
  readonly initialProfile = input<UserProfile | null>(null);

  // Outputs
  readonly profileSaved = output<UserProfile>();
  readonly cancelled = output<void>(); // Add cancelled output

  saving = false;
  isEditMode = false; // Flag to track if we are in edit mode

  readonly genders: Gender[] = ['male', 'female', 'other'];
  readonly activityLevels: ActivityLevel[] = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active'];
  readonly exerciseGoals: ExerciseGoal[] = ['weight_loss', 'muscle_gain', 'general_fitness', 'strength_training', 'endurance'];
  readonly ageRelatedConditionsOptions: AgeRelatedCondition[] = ['menopause', 'pregnancy', 'postpartum'];

  readonly profileForm = this.#fb.group({
    dob: ['', Validators.required],
    weightKg: [<number | null>null, [Validators.required, Validators.min(1)]],
    heightCm: [<number | null>null, [Validators.required, Validators.min(1)]],
    gender: [<Gender | null>null, Validators.required],
    activityLevel: [<ActivityLevel | null>null, Validators.required],
    exerciseGoal: [<ExerciseGoal | null>null, Validators.required],
    ageRelatedConditions: this.#fb.group(
      this.ageRelatedConditionsOptions.reduce((acc, condition) => {
        acc[condition] = this.#fb.control(false, { nonNullable: true });
        return acc;
      }, {} as { [key in AgeRelatedCondition]: FormControl<boolean> })
    )
  });

  // Signal for DOB value (using toSignal)
  readonly #dobValue = toSignal(this.profileForm.controls.dob.valueChanges);
  // Signal for Gender value (using toSignal)
  readonly #genderValue = toSignal(this.profileForm.controls.gender.valueChanges);

  readonly calculatedAge = computed(() => {
    const dob = this.#dobValue();
    // Ensure dob is treated as string | null | undefined
    return dob ? calculateAge(dob as string) : 0;
  });

  // Computed signal to determine if the conditions section should be shown (pure calculation)
  readonly showAgeRelatedConditions = computed(() => {
    const gender = this.#genderValue();
    return gender === 'female'; // Show ONLY if female
  });

  constructor() {
    // Effect to handle enabling/disabling the conditions group based on the computed signal
    effect(() => {
      const show = this.showAgeRelatedConditions();
      const conditionsGroup = this.profileForm.controls.ageRelatedConditions;
      if (!conditionsGroup) return; // Should not happen, but safe check

      // Run outside Angular zone potentially? No, form operations should be fine.
      // Check if status needs changing before calling enable/disable
      const needsEnable = show && conditionsGroup.disabled;
      const needsDisable = !show && conditionsGroup.enabled;

      try {
        if (needsEnable) {
          conditionsGroup.enable({ emitEvent: false });
          logger.log('Enabled conditions group');
        } else if (needsDisable) {
          conditionsGroup.disable({ emitEvent: false });
          logger.log('Disabled conditions group');
          // Check if the group is already reset before resetting again
          const allFalse = this.ageRelatedConditionsOptions.every(c => !conditionsGroup.get(c)?.value);
          if (!allFalse) {
            conditionsGroup.reset({}, { emitEvent: false }); // Reset values when hiding
            logger.log('Reset conditions group');
          }
        }
      } catch (error) {
        logger.error("Error enabling/disabling conditions group:", error);
      }
    }, { allowSignalWrites: true }); // allowSignalWrites might be needed if reset triggers something indirectly
  }

  ngOnInit(): void {
    // ... existing patching logic ...
    const profile = this.initialProfile();
    if (profile) {
      this.isEditMode = true;

      // Prepare patch value, excluding conditions initially
      const patchData: Partial<typeof this.profileForm.value> = {
        dob: profile.dob,
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        gender: profile.gender,
        activityLevel: profile.activityLevel,
        exerciseGoal: profile.exerciseGoal,
      };

      // Prepare conditions patch object separately
      const conditionsPatch: { [key: string]: boolean } = {};
      if (profile.ageRelatedConditions) {
        for (const condition of this.ageRelatedConditionsOptions) {
          conditionsPatch[condition] = profile.ageRelatedConditions.includes(condition);
        }
        // Add the conditions group patch to the main patch data
        patchData.ageRelatedConditions = conditionsPatch;
      }

      this.profileForm.patchValue(patchData);
    }
    // Initial state is handled by toSignal and the effect reacting to it.
  }

  // ... existing onCancel and onSubmit methods ...
  onCancel(): void {
    this.cancelled.emit();
  }

  async onSubmit(): Promise<void> {
    // ... existing submit logic ...
    if (this.profileForm.invalid) {
      logger.warn('Form submitted while invalid.');
      this.profileForm.markAllAsTouched(); // Ensure errors are shown
      return;
    }

    this.saving = true;
    const formValue = this.profileForm.getRawValue();
    const dobValue = formValue.dob;

    // ... (rest of DOB validation remains the same) ...
    if (!dobValue) {
      logger.error('Date of Birth is required.');
      this.saving = false;
      this.profileForm.controls.dob.markAsTouched();
      this.profileForm.controls.dob.setErrors({ required: true });
      return;
    }
    const dobDate = new Date(dobValue);
    if (isNaN(dobDate.getTime())) {
      logger.error('Invalid Date of Birth provided.');
      this.saving = false;
      this.profileForm.controls.dob.markAsTouched();
      this.profileForm.controls.dob.setErrors({ invalidDate: true });
      return;
    }
    const dobISO = dobDate.toISOString().split('T')[0] as string;

    let selectedConditions: AgeRelatedCondition[] = [];
    // Use the computed signal directly here
    if (this.showAgeRelatedConditions()) { // Check visibility using the computed signal
      selectedConditions = this.ageRelatedConditionsOptions.filter(
        condition => formValue.ageRelatedConditions[condition]
      );
    }

    const profileData: UserProfile = {
      dob: dobISO,
      weightKg: formValue.weightKg!,
      heightCm: formValue.heightCm!,
      gender: formValue.gender!,
      activityLevel: formValue.activityLevel!,
      exerciseGoal: formValue.exerciseGoal!,
      ...(selectedConditions.length > 0 && { ageRelatedConditions: selectedConditions }),
    };

    try {
      logger.log('Attempting to save/update profile:', profileData);
      await this.#profileService.saveUserProfile(profileData);
      logger.log('Profile saved/updated successfully via service.');
      this.profileSaved.emit(profileData);
      if (!this.isEditMode) {
        this.profileForm.reset({
          ageRelatedConditions: this.ageRelatedConditionsOptions.reduce((acc, condition) => {
            acc[condition] = false;
            return acc;
          }, {} as { [key in AgeRelatedCondition]: boolean })
        });
      }
    } catch (error) {
      logger.error('Error saving/updating profile:', error);
    } finally {
      this.saving = false;
    }
  }
}
