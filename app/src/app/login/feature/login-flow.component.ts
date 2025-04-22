import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UnsplashService } from '../../services/unsplash.service'; // Import the service
import { LoginFlowStore } from './login-flow.store';

@Component({
  selector: 'app-login-flow',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
  ],
  providers: [LoginFlowStore], // UnsplashService is providedIn: 'root'
  template: `
    <!-- Main container - relative positioning context and full screen -->
    <div class="h-screen w-screen">
      <!-- Background Image - absolute positioning, covers parent, explicit z-index -->
      <div
        class="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-80 z-0"
        [style.background-image]="'url(' + (backgroundImageUrl() ?? defaultImageUrl) + ')'"
      ></div>

      <!-- Content Wrapper - relative positioning for z-index, flex centering, above background -->
      <div class="relative z-10 flex justify-center items-center h-full w-full">
          <!-- Login Form Area - specific width, visual styling -->
          <div class="w-[260px] p-8">
            @if (status() === 'error') {
              <div class="mb-4 rounded-sm bg-red-100 px-3 py-2 text-center text-sm text-red-700">
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
      </div>
    </div>
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFlowComponent implements OnInit {
  readonly #store = inject(LoginFlowStore);
  readonly #unsplashService = inject(UnsplashService); // Inject the service

  readonly status = this.#store.status;
  readonly error = this.#store.error;
  readonly backgroundImageUrl = signal<string | undefined>(undefined);
  readonly defaultImageUrl = 'https://source.unsplash.com/random/1920x1080/?gym,exercise'; // Fallback

  constructor() { }

  ngOnInit(): void {
    this.#unsplashService.getRandomPhotoUrl('fitness,gym').subscribe(url => {
      if (url) {
        this.backgroundImageUrl.set(url);
      } else {
        // Optionally handle error or use default
        console.warn('Could not fetch Unsplash image, using default.');
        this.backgroundImageUrl.set(this.defaultImageUrl);
      }
    });
  }

  loginWithGoogle() {
    this.#store.loginWithGoogle();
  }
}
