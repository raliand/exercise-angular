import { ChangeDetectionStrategy, Component, inject } from '@angular/core'; // Import inject
import { MatButtonModule } from '@angular/material/button';
import { RouterLinkWithHref, RouterOutlet } from '@angular/router';
import { AuthStore } from '@app-shared/auth/data/auth.store'; // Import AuthStore
import { AuthStatusComponent } from './ui/auth-status.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLinkWithHref, MatButtonModule, AuthStatusComponent],
  template: `
    <div class="container mx-auto px-4">
      <header>
        <nav class="flex justify-between border-b py-2">
          <ul class="flex gap-x-4">
            <li>
              <a mat-button [routerLink]="['/']">Home</a>
            </li>
            <li>
              <a mat-button [routerLink]="['/about']">About</a>
            </li>
          </ul>

          <ul class="flex items-center gap-x-4">
            @if (isAuthenticated()) {
              <li>
                <a mat-button [routerLink]="['/profile']">Profile</a>
              </li>
              <li>
                <a mat-button [routerLink]="['/routine']">Routine</a>
              </li>
              <li>
                <a mat-button [routerLink]="['/history']">History</a>
              </li>
            }
            @defer {
              <li>
                <app-auth-status />
              </li>
            }
          </ul>
        </nav>
      </header>

      <main class="px-4 py-3">
        <router-outlet />
      </main>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebsiteShellComponent {
  readonly #authStore = inject(AuthStore); // Inject AuthStore
  readonly isAuthenticated = this.#authStore.isAuthenticated; // Get isAuthenticated signal
}
