import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { LoginFlowStore } from './login-flow.store';

@Component({
  selector: 'app-login-flow',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
  ],
  providers: [LoginFlowStore],
  template: `
    <div class="flex justify-center">
      <a mat-button [routerLink]="['/']">
        <mat-icon>arrow_back</mat-icon>
        Home
      </a>
    </div>
    <div class="mt-6 w-[360px]">
      @if (status() === 'error') {
        <div class="my-2 rounded-sm bg-red-100 px-3 py-2 text-center text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <button
        mat-flat-button
        color="primary"
        class="w-full"
        (click)="loginWithGoogle()"
        [disabled]="status() === 'processing'"
      >
        @if (status() === 'processing') {
          <mat-progress-bar mode="indeterminate" />
        } @else {
          Login with Google
        }
      </button>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFlowComponent implements OnInit {
  readonly #store = inject(LoginFlowStore);
  readonly #snackBar = inject(MatSnackBar);

  readonly status = this.#store.status;
  readonly error = this.#store.error;

  constructor() { }

  ngOnInit(): void { }

  loginWithGoogle() {
    this.#store.loginWithGoogle();
  }
}
