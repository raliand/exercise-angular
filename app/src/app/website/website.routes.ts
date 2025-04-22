import { Routes } from '@angular/router';
import { authGuard } from '@app-shared/auth/util/auth.guard';
import { WebsiteShellComponent } from './website-shell.component';

const routes: Routes = [
  {
    path: '',
    component: WebsiteShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'routine' },
      {
        path: 'profile', // Add the profile route
        loadChildren: () => import('../profile/profile.routes'),
        canActivate: [authGuard('authed')], // Use authGuard('authed')
      },
      {
        path: 'routine',
        // RoutineComponent should be the default export (which it is)
        loadComponent: () => import('../routine/routine.component'),
        canActivate: [authGuard('authed')], // Use authGuard('authed')
      },
      {
        path: 'history',
        // HistoryComponent should be the default export (which it is)
        loadComponent: () => import('../history/history.component').then(m => m.HistoryComponent),
        canActivate: [authGuard('authed')], // Use authGuard('authed')
      },
    ],
  },
];

export default routes;
