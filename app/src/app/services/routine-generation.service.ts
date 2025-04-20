import { Injectable } from '@angular/core';
import { httpsCallableData } from '@angular/fire/functions';
import { injectFunctions } from '@app-shared/firebase/functions';
import { createLogger } from '@app-shared/logger';
import { GenerateExerciseRoutineInput, GenerateExerciseRoutineOutput } from '@common'; // Assuming types are exported from common
import { Observable } from 'rxjs';

const logger = createLogger('RoutineGenerationService');

@Injectable({
    providedIn: 'root'
})
export class RoutineGenerationService {
    private readonly functions = injectFunctions();

    // Get a reference to the Firebase Function
    private generateRoutineFn = httpsCallableData<GenerateExerciseRoutineInput, GenerateExerciseRoutineOutput>(
        this.functions,
        'generateExerciseRoutine' // Name matches the exported function in index.ts
    );

    /**
     * Calls the Firebase Function to generate an exercise routine.
     * @param input The input data required by the function.
     * @returns An Observable emitting the generated routine.
     */
    generateRoutine(input: GenerateExerciseRoutineInput): Observable<GenerateExerciseRoutineOutput> {
        logger.log('Calling generateExerciseRoutine function with input:', input);
        return this.generateRoutineFn(input);
    }
}
