import { Injectable, inject } from '@angular/core';
import { AuthStore } from '@app-shared/auth/data/auth.store';
import { injectFirestore } from '@app-shared/firebase/firestore';
import { createLogger } from '@app-shared/logger';
import { UserProfile } from '@common';
import { DocumentReference, Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Observable, from, of, switchMap } from 'rxjs';

const logger = createLogger('ProfileService');

@Injectable({
    providedIn: 'root',
})
export class ProfileService {
    readonly #firestore: Firestore = injectFirestore();
    readonly #authStore = inject(AuthStore);

    readonly userProfile$: Observable<UserProfile | null> = this.#authStore.user$.pipe(
        switchMap(user => {
            if (!user) {
                logger.log('No user logged in, returning null profile.');
                return of(null);
            }
            logger.log(`Fetching profile for user ID: ${user.id}`);
            const docRef = this.getUserProfileDocRef(user.id);
            return from(getDoc(docRef)).pipe(
                switchMap(docSnap => {
                    if (docSnap.exists()) {
                        logger.log('Profile found:', docSnap.data());
                        return of(docSnap.data() as UserProfile);
                    } else {
                        logger.log('No profile found for user.');
                        return of(null);
                    }
                })
            );
        })
    );

    async saveUserProfile(profileData: UserProfile): Promise<void> {
        const user = this.#authStore.user();
        if (!user) {
            throw new Error('User must be logged in to save profile.');
        }
        logger.log(`Saving profile for user ID: ${user.id}`, profileData);
        const docRef = this.getUserProfileDocRef(user.id);
        await setDoc(docRef, profileData);
        logger.log('Profile saved successfully.');
        // Optionally, trigger a refresh or update local state
    }

    private getUserProfileDocRef(userId: string): DocumentReference<UserProfile> {
        // Type assertion needed because firestore types don't carry over well with generic converters
        return doc(this.#firestore, 'users', userId) as DocumentReference<UserProfile>;
    }
}
