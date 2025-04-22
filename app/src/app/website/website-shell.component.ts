import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'; // Import inject, OnInit, signal
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule
import { MatListModule } from '@angular/material/list'; // Import MatListModule
import { MatSidenavModule } from '@angular/material/sidenav'; // Import MatSidenavModule
import { MatToolbarModule } from '@angular/material/toolbar'; // Import MatToolbarModule
import { RouterLinkWithHref, RouterOutlet } from '@angular/router';
import { AuthStore } from '@app-shared/auth/data/auth.store'; // Import AuthStore
import { UnsplashService } from '../services/unsplash.service'; // Import UnsplashService
import { AuthStatusComponent } from './ui/auth-status.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLinkWithHref,
    MatButtonModule,
    AuthStatusComponent,
    MatSidenavModule, // Add MatSidenavModule
    MatListModule, // Add MatListModule
    MatIconModule, // Add MatIconModule
    MatToolbarModule, // Add MatToolbarModule
  ],
  template: `
    <mat-sidenav-container class="h-screen bg-cover bg-center bg-no-repeat" [style.background-image]="'url(' + (backgroundImageUrl() ?? defaultImageUrl) + ')'">
      <mat-sidenav #sidenav mode="over" opened="false" class="w-64 border-r bg-white bg-opacity-90"> <!-- Added background for readability -->
        <mat-nav-list>
          @if (isAuthenticated()) {
            <a mat-list-item [routerLink]="['/routine']" (click)="sidenav.close()">Routine</a>
            <a mat-list-item [routerLink]="['/history']" (click)="sidenav.close()">History</a>
            <a mat-list-item [routerLink]="['/profile']" (click)="sidenav.close()">Profile</a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="flex flex-col"> <!-- Added flex flex-col -->
        <mat-toolbar color="primary">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="flex-auto"></span>
          @defer {
            <app-auth-status />
          }
        </mat-toolbar>

        <main class="p-4 flex-grow overflow-auto"> <!-- Added flex-grow and overflow-auto -->
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    mat-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000; /* Ensure toolbar stays on top */
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebsiteShellComponent implements OnInit { // Implement OnInit
  readonly #authStore = inject(AuthStore); // Inject AuthStore
  readonly #unsplashService = inject(UnsplashService); // Inject UnsplashService

  readonly isAuthenticated = this.#authStore.isAuthenticated; // Get isAuthenticated signal
  readonly backgroundImageUrl = signal<string | undefined>(undefined);
  readonly defaultImageUrl = 'https://source.unsplash.com/random/1920x1080/?landscape,nature'; // Fallback

  ngOnInit(): void {
    this.#unsplashService.getRandomPhotoUrl('fitness,gym').subscribe(url => {
      if (url) {
        this.backgroundImageUrl.set(url);
      } else {
        console.warn('Could not fetch Unsplash image for shell, using default.');
        this.backgroundImageUrl.set(this.defaultImageUrl);
      }
    });
  }
}
