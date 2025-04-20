import { Injectable, inject } from '@angular/core';
import { AuthStore } from '@app-shared/auth/data/auth.store';
import { injectFirestore } from '@app-shared/firebase/firestore';
import { createLogger } from '@app-shared/logger';
import { ExerciseRoutine } from '@common';
// Import collection, query, orderBy, getDocs, documentId, setDoc functions
import { DocumentReference, Firestore, collection, doc, documentId, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { Observable, filter, from, map, of, switchMap, take } from 'rxjs';

const logger = createLogger('RoutinePersistenceService');

@Injectable({
    providedIn: 'root',
})
export class RoutinePersistenceService {
    readonly #firestore: Firestore = injectFirestore();
    readonly #authStore = inject(AuthStore);

    /**
     * Gets the Firestore document reference for a routine on a specific date for a user.
     * @param userId The user's ID.
     * @param dateString The date in 'YYYY-MM-DD' format.
     * @returns DocumentReference for the routine.
     */
    private getRoutineDocRef(userId: string, dateString: string): DocumentReference<ExerciseRoutine> {
        // Path: users/{userId}/routines/{YYYY-MM-DD}
        return doc(this.#firestore, 'users', userId, 'routines', dateString) as DocumentReference<ExerciseRoutine>;
    }

    /**
     * Saves an exercise routine for a specific date for the current user.
     * @param routine The routine data to save.
     * @param dateString The date in 'YYYY-MM-DD' format.
     */
    async saveRoutineForDate(routine: ExerciseRoutine, dateString: string): Promise<void> {
        const userId = this.#authStore.userId(); // Get current user ID from signal
        if (!userId) {
            throw new Error('User must be logged in to save a routine.');
        }
        logger.log(`Saving routine for user ${userId} on date ${dateString}`, routine);
        const docRef = this.getRoutineDocRef(userId, dateString);
        await setDoc(docRef, routine); // Overwrites if exists for the same date
        logger.log('Routine saved successfully.');
    }

    /**
     * Loads the exercise routine for a specific date for the current user.
     * @param dateString The date in 'YYYY-MM-DD' format.
     * @returns Observable emitting the routine or null if not found.
     */
    loadRoutineForDate(dateString: string): Observable<ExerciseRoutine | null> {
        // Use the userId$ observable, but wait for a valid user ID
        return this.#authStore.userId$.pipe(
            filter(userId => userId !== null), // Wait until userId is non-null
            take(1), // Take the first non-null userId
            switchMap(userId => {
                // We are sure userId is non-null here
                logger.log(`Attempting to load routine for user ${userId} on date ${dateString}`);
                const docRef = this.getRoutineDocRef(userId!, dateString); // Use non-null assertion
                return from(getDoc(docRef)).pipe(
                    switchMap(docSnap => {
                        if (docSnap.exists()) {
                            const routineData = docSnap.data() as ExerciseRoutine;
                            logger.log('Routine found for date:', routineData);
                            return of(routineData);
                        } else {
                            logger.log('No routine found for this date.');
                            return of(null);
                        }
                    })
                );
            })
        );
    }

    /**
     * Loads all past exercise routines for the current user, ordered by date descending.
     * @returns Observable emitting an array of routines with their dates.
     */
    loadAllRoutines(): Observable<{ date: string; routine: ExerciseRoutine }[]> {
        return this.#authStore.userId$.pipe(
            filter(userId => userId !== null),
            take(1),
            switchMap(userId => {
                logger.log(`Attempting to load all routines for user ${userId}`);
                // Path: users/{userId}/routines
                const routinesCollectionRef = collection(this.#firestore, 'users', userId!, 'routines');
                // Query to order by document ID (which is the date string YYYY-MM-DD) descending
                const q = query(routinesCollectionRef, orderBy(documentId(), 'desc'));

                return from(getDocs(q)).pipe(
                    map(querySnapshot => {
                        const routines: { date: string; routine: ExerciseRoutine }[] = [];
                        querySnapshot.forEach(docSnap => {
                            routines.push({
                                date: docSnap.id, // The document ID is the date string
                                routine: docSnap.data() as ExerciseRoutine
                            });
                        });
                        logger.log(`Found ${routines.length} past routines.`);
                        return routines;
                    })
                );
            })
        );
    }
}
