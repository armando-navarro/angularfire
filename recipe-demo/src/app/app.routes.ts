import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'signin',
    loadComponent: () => import('./sign-in/sign-in').then(({ SignIn }) => SignIn),
  },
];
