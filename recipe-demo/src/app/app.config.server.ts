import {
  ApplicationConfig,
  REQUEST_CONTEXT,
  inject,
  mergeApplicationConfig,
  provideAppInitializer,
} from '@angular/core';
import {
  FirebaseApp,
  initializeApp,
  initializeServerApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import { Auth } from '@angular/fire/auth';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { firebaseConfig } from './firebase-config';

function createFirebaseApp(): FirebaseApp {
  // Pass REQUEST_CONTEXT's authIdToken to render personalized signed-in content.
  const requestContext = inject(REQUEST_CONTEXT, { optional: true });

  // Anonymous requests need a server app only to carry an App Check token (not needed in our app).
  if (!hasAuthIdToken(requestContext)) {
    return initializeApp(firebaseConfig);
  }
  // Cleanup server app on requestContext garbage collection, which goes with the render.
  return initializeServerApp(firebaseConfig, {
    authIdToken: requestContext.authIdToken,
    releaseOnDeref: requestContext,
  });
}

// REQUEST_CONTEXT is `unknown`. It contains an authIdToken property when user is signed-in.
function hasAuthIdToken(context: unknown): context is { authIdToken: string } {
  if (!context || typeof context !== 'object' || !('authIdToken' in context)) {
    return false;
  }
  return typeof context.authIdToken === 'string';
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideFirebaseApp(createFirebaseApp),
    // Wait for auth state to settle before rendering.
    provideAppInitializer(() => inject(Auth).authStateReady()),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
