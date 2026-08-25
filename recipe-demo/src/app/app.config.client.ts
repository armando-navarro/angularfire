import {
  ApplicationConfig,
  DestroyRef,
  inject,
  mergeApplicationConfig,
  provideAppInitializer,
} from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { AgentPlatformBackend, getAI } from 'firebase/ai';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { Auth, beforeAuthStateChanged, onIdTokenChanged, Unsubscribe } from 'firebase/auth';
import cookies from 'js-cookie';

import { appConfig } from './app.config';
import { firebaseConfig, recaptchaSiteKey } from './firebase-config';
import { FIREBASE_AI, FIREBASE_APP, FIREBASE_AUTH } from './firebase-tokens';

function createFirebaseApp(): FirebaseApp {
  if (location.hostname === 'localhost') {
    // Set App Check debug flag before initializeAppCheck runs or the SDK mints no token.
    Object.assign(globalThis, { FIREBASE_APPCHECK_DEBUG_TOKEN: true });
  }
  const app = initializeApp(firebaseConfig);
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return app;
}

/** Mirrors the signed-in state into a __session cookie so the server can render as this user. */
function syncSessionCookie(): void {
  const auth = inject(FIREBASE_AUTH);
  const destroyRef = inject(DestroyRef);

  // Refresh session cookie on startup/sign-in/sign-out/background token refresh.
  const stopSyncOnTokenChange = onIdTokenChanged(auth, async user => {
    updateSessionCookie(await user?.getIdToken());
  });
  const stopSyncBeforeAuthChange = syncBeforeAuthChange(auth);

  destroyRef.onDestroy(() => {
    stopSyncOnTokenChange();
    stopSyncBeforeAuthChange();
  });
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
    { provide: FIREBASE_APP, useFactory: createFirebaseApp },
    {
      provide: FIREBASE_AI,
      useFactory: () => getAI(inject(FIREBASE_APP), { backend: new AgentPlatformBackend() }),
    },
    provideAppInitializer(syncSessionCookie),
  ],
};

export const config = mergeApplicationConfig(appConfig, clientConfig);
