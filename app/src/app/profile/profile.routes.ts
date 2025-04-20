import { Routes } from '@angular/router';
import { authGuard } from '@app-shared/auth/util/auth.guard';
import { ProfileShellComponent } from './feature/profile-shell.component';

const routes: Routes = [
    {
        path: '',
        canMatch: [authGuard('authed')], // Protect this route
        component: ProfileShellComponent,
    },
    // Add other profile-related routes here if needed
];

export default routes;
