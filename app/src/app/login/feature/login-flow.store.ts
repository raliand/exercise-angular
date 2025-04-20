import { effect, inject, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '@app-shared/auth/data/auth.store';
import { createLogger } from '@app-shared/logger';
import { tapResponse } from '@ngrx/operators';
import {
  getState,
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, from, pipe, tap, throwError } from 'rxjs';
import { LoginService } from '../data/login.service';

type IdleState = {
  status: 'idle';
  error: null;
};

type ProcessingState = {
  status: 'processing';
  error: null;
};

type CompletedState = {
  status: 'completed';
  error: null;
};

type ErrorState = {
  status: 'error';
  error: string;
};

type LoginFlowState =
  | IdleState
  | ProcessingState
  | CompletedState
  | ErrorState;

const initialState: LoginFlowState = {
  status: 'idle',
  error: null,
};

const logger = createLogger('LoginFlowStore');

export type LoginFlowStore = InstanceType<typeof LoginFlowStore>;

export const LoginFlowStore = signalStore(
  withState<LoginFlowState>(initialState),
  withComputed(() => {
    const authStore = inject(AuthStore);

    return {
      user: authStore.user,
    };
  }),
  withMethods((store) => {
    const loginService = inject(LoginService);
    const route = inject(ActivatedRoute);
    const router = inject(Router);

    // ---
    // Internal methods:

    const setProcessing = () => {
      const newState: ProcessingState = { status: 'processing', error: null };
      patchState(store, newState);
    };

    const setCompleted = () => {
      const newState: CompletedState = { status: 'completed', error: null };
      patchState(store, newState);
    };

    const setError = (error: string) => {
      const newState: ErrorState = { status: 'error', error };
      patchState(store, newState);
    };

    // ---

    return {
      loginWithGoogle: rxMethod<void>(
        pipe(
          tap(() => logger.log('loginWithGoogle')),
          tap(() => setProcessing()),
          exhaustMap(() => {
            // Wrap the promise in from() to convert it to an Observable
            return from(loginService.loginWithGoogle()).pipe(
              tapResponse({
                next: () => {
                  // Completion is handled by the effect below
                },
                error: (error: Error) => {
                  setError(error.message);
                  // Return an observable that emits an error to prevent the stream from completing silently
                  return throwError(() => error);
                },
              }),
            );
          }),
        ),
      ),

      completeLogin: async () => {
        setCompleted();

        let url = route.snapshot.queryParamMap.get('return') ?? '/';
        // DO NOT redirect to an external URL (for security reasons).
        if (!url.startsWith('/')) {
          url = '/';
        }
        await router.navigateByUrl(url);
      },
    };
  }),
  withHooks({
    onInit(store) {
      effect(() => logger.log('State:', getState(store)));

      // Listen for changes to the user and trigger completion once we have one.
      effect(() => {
        const user = store.user();
        if (user) {
          untracked(() => {
            void store.completeLogin();
          });
        }
      });
    },
  }),
);
