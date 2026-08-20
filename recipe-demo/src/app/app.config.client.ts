import { ApplicationConfig, inject, mergeApplicationConfig } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { AgentPlatformBackend, getAI } from 'firebase/ai';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

import { appConfig } from './app.config';
import { firebaseConfig, recaptchaSiteKey } from './firebase-config';
import { FIREBASE_AI, FIREBASE_APP } from './firebase-tokens';

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

const clientConfig: ApplicationConfig = {
  providers: [
    { provide: FIREBASE_APP, useFactory: createFirebaseApp },
    {
      provide: FIREBASE_AI,
      useFactory: () => getAI(inject(FIREBASE_APP), { backend: new AgentPlatformBackend() }),
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, clientConfig);
