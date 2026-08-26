import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth-store';

export const authGuard: CanActivateFn = async (route, state) => {
  // Both injections must happen before the first await, which ends the injection context.
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.whenAuthResolved();
  if (authStore.currentUser()) {
    return true;
  }
  return router.createUrlTree(['/signin'], { queryParams: { returnUrl: state.url } });
};
