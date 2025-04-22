import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Exercise } from '@common'; // Assuming Exercise type is available

@Component({
    selector: 'app-add-exercise-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
    ],
    templateUrl: './add-exercise-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExerciseDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(MatDialogRef<AddExerciseDialogComponent>);

    readonly exerciseForm = this.fb.group({
        exerciseName: ['', Validators.required],
        sets: ['', Validators.required], // Allow string for flexibility (e.g., '3-4')
        reps: ['', Validators.required], // Allow string for flexibility (e.g., '8-12')
        restTime: ['60s', Validators.required], // Default rest time
    });

    save(): void {
        if (this.exerciseForm.valid) {
            const newExercise: Omit<Exercise, 'completed'> = {
                exerciseName: this.exerciseForm.value.exerciseName!,
                sets: +this.exerciseForm.value.sets!, // Convert string to number
                reps: this.exerciseForm.value.reps!,
                restTime: this.exerciseForm.value.restTime!,
            };
            this.dialogRef.close(newExercise);
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
