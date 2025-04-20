import { Routes } from '@angular/router';
import { authGuard } from '@app-shared/auth/util/auth.guard';
import { AboutPageComponent } from './feature/about-page.component';
import { HomePageComponent } from './feature/home-page.component';
import { WebsiteShellComponent } from './website-shell.component';

const routes: Routes = [
  {
    path: '',
    component: WebsiteShellComponent,
    children: [
      { path: '', pathMatch: 'full', component: HomePageComponent },
      { path: 'about', component: AboutPageComponent },
      {
        path: 'profile', // Add the profile route
        loadChildren: () => import('../profile/profile.routes'),
      },
      {
        path: 'routine',
        // RoutineComponent should be the default export (which it is)
        loadComponent: () => import('../routine/routine.component'),
        canActivate: [authGuard],
      },
      {
        path: 'history',
        // HistoryComponent should be the default export (which it is)
        loadComponent: () => import('../history/history.component').then(m => m.HistoryComponent),
        canActivate: [authGuard],
      },
    ],
  },
];

export default routes;
