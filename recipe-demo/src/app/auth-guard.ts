import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // authState does not emit until Firebase has restored the session.
  return authState(auth).pipe(
    map(user =>
      user ? true : router.createUrlTree(['/signin'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
