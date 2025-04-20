import { Injectable } from '@angular/core';
// Correct the import path for the injection function
import { injectFunctions } from '@app-shared/firebase/functions';
import { createLogger } from '@app-shared/logger';
import { GenerateExerciseRoutineInput, GenerateExerciseRoutineOutput } from '@common'; // Import types from common models
import { Functions, httpsCallable } from 'firebase/functions';
import { Observable, from } from 'rxjs'; // Import 'from' to convert Promise to Observable

const logger = createLogger('ExerciseRoutineService');

@Injectable({
    providedIn: 'root'
})
export class ExerciseRoutineService {
    // Inject the pre-configured Functions instance using the project's helper
    private readonly functions: Functions = injectFunctions();

    // Get a typed reference to the Firebase Function using the modular SDK
    private generateRoutineFn = httpsCallable<GenerateExerciseRoutineInput, GenerateExerciseRoutineOutput>(
        this.functions,
        'generateExerciseRoutine' // This name must match the exported function name in Firebase Functions index.ts
    );

    /**
     * Calls the Firebase Function to generate an exercise routine.
     * @param input The input data matching GenerateExerciseRoutineInput.
     * @returns An Observable emitting the generated routine (GenerateExerciseRoutineOutput).
     */
    generateRoutine(input: GenerateExerciseRoutineInput): Observable<GenerateExerciseRoutineOutput> {
        logger.log('Calling generateExerciseRoutine Firebase Function with input:', input);
        // httpsCallable returns a Promise containing a HttpsCallableResult, access .data and convert to Observable
        const resultPromise = this.generateRoutineFn(input).then(response => response.data);
        return from(resultPromise);
    }
}
