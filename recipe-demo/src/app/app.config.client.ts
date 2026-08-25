import {
  ApplicationConfig,
  DestroyRef,
  inject,
  mergeApplicationConfig,
  provideAppInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgentPlatformBackend, getAI, provideAI } from '@angular/fire/ai';
import { FirebaseApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { initializeAppCheck, provideAppCheck, ReCaptchaV3Provider } from '@angular/fire/app-check';
import { Auth, idToken, Unsubscribe } from '@angular/fire/auth';
import { beforeAuthStateChanged } from 'firebase/auth';
import cookies from 'js-cookie';

import { appConfig } from './app.config';
import { firebaseConfig, recaptchaSiteKey } from './firebase-config';

/** Mirrors the signed-in state into a __session cookie so the server can render as this user. */
function syncSessionCookie(): void {
  const auth = inject(Auth);
  const destroyRef = inject(DestroyRef);

  // Refresh session cookie on startup/sign-in/sign-out/background token refresh.
  idToken(auth)
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(token => updateSessionCookie(token ?? undefined));

  const stopSyncBeforeAuthChange = syncBeforeAuthChange(auth);
  destroyRef.onDestroy(stopSyncBeforeAuthChange);
}

/** Set or remove the session cookie. */
function updateSessionCookie(token: string | undefined): void {
  if (token) cookies.set('__session', token, { secure: true, sameSite: 'lax' });
  else cookies.remove('__session');
}

/** Update session cookie on sign-in/sign-out. Restore cookie when auth state change fails. */
function syncBeforeAuthChange(auth: Auth): Unsubscribe {
  let priorToken: string | undefined;
  return beforeAuthStateChanged(
    auth,
    async user => {
      priorToken = cookies.get('__session');
      updateSessionCookie(await user?.getIdToken());
    },
    () => updateSessionCookie(priorToken),
  );
}

const clientConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAppCheck(() =>
      initializeAppCheck(inject(FirebaseApp), {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      }),
    ),
    provideAI(() => getAI(inject(FirebaseApp), { backend: new AgentPlatformBackend() })),
    provideAppInitializer(syncSessionCookie),
  ],
};

export const config = mergeApplicationConfig(appConfig, clientConfig);
