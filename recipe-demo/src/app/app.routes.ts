import { Routes } from '@angular/router';

import { authGuard } from './auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then(({ Home }) => Home),
  },
  {
    path: 'signin',
    loadComponent: () => import('./sign-in/sign-in').then(({ SignIn }) => SignIn),
  },
  {
    path: 'create-recipe',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./create-recipe/create-recipe').then(({ CreateRecipe }) => CreateRecipe),
  },
];
