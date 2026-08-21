import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then(({ Home }) => Home),
  },
  {
    path: 'signin',
    loadComponent: () => import('./sign-in/sign-in').then(({ SignIn }) => SignIn),
  },
];
