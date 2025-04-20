import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { injectAuth } from '@app-shared/firebase/auth';
import { createLogger } from '@app-shared/logger';
import {
  GoogleAuthProvider,
  UserCredential,
  signInWithPopup,
} from 'firebase/auth';
import { firstValueFrom, take } from 'rxjs'; // Import take
import { ProfileService } from '../../profile/data/profile.service'; // Corrected import path

const logger = createLogger('LoginService');

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  readonly #auth = injectAuth();
  readonly #router = inject(Router);
  readonly #profileService = inject(ProfileService);

  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const credential: UserCredential = await signInWithPopup(this.#auth, provider);

      if (credential.user) {
        logger.log('Login successful, checking for profile...');
        // Take the first emitted value and then complete the observable stream
        const profile = await firstValueFrom(this.#profileService.userProfile$.pipe(take(1)));

        if (!profile) {
          logger.log('No profile found, navigating to profile setup.');
          await this.#router.navigate(['/profile']);
        } else {
          logger.log('Profile found, proceeding.');
          // Navigate to home or dashboard if profile exists
          await this.#router.navigate(['/']); // Example: navigate to root
        }
      } else {
        logger.warn('Login successful but no user object found in credential.');
      }

    } catch (error: unknown) {
      this.handleFirebaseError(error);
    }
  }

  private handleFirebaseError(error: unknown): void {
    logger.error('Firebase Auth error:', error);

    let message = 'Unknown error';

    if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string') {
      message = this.getAuthErrorMessageForCode(error.code);
    }

    throw new Error(message);
  }

  private getAuthErrorMessageForCode(code: string): string {
    switch (code) {
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.';
      case 'auth/auth-domain-config-required':
        return 'Authentication domain configuration is required.';
      case 'auth/cancelled-popup-request':
        return 'The popup request was cancelled.';
      case 'auth/operation-not-allowed':
        return 'The sign-in provider is disabled for this Firebase project. Enable it in the Firebase console.';
      case 'auth/operation-not-supported-in-this-environment':
        return 'This operation is not supported in the current environment.';
      case 'auth/popup-blocked':
        return 'The popup was blocked by the browser. Please allow popups for this site.';
      case 'auth/popup-closed-by-user':
        return 'The popup was closed by the user before finalizing the operation.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for OAuth operations for your Firebase project. Check the list of authorized domains in the Firebase console.';
      case 'auth/invalid-email':
        return `The email address you entered doesn't look right.`;
      case 'auth/network-request-failed':
        return `There may be a problem with your network or connection. Please try again when you're connected to the Internet.`;
      case 'auth/too-many-requests':
        return 'Logins from your device are currently being blocked. Please try again later.';
      case 'auth/user-disabled':
        return 'Your account has been disabled. Please contact us to find out more.';
      case 'auth/web-storage-unsupported':
        return (
          `Your browser doesn't support web storage (or it is disabled) - ` +
          `this is needed to log you in and store who you are on your device.`
        );
      default:
        return (
          `Sorry, something went wrong when logging you in. ` +
          `We've been notified about this. Please try again later in case it was a temporary issue.`
        );
    }
  }
}
