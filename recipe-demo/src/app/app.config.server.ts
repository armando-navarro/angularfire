import {
  ApplicationConfig,
  DestroyRef,
  REQUEST_CONTEXT,
  inject,
  mergeApplicationConfig,
  provideAppInitializer,
} from '@angular/core';
import { deleteApp, initializeServerApp, provideFirebaseApp } from '@angular/fire/app';
import { Auth } from '@angular/fire/auth';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { firebaseConfig } from './firebase-config';

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
    provideFirebaseApp(() => {
      // Pass REQUEST_CONTEXT's authIdToken to render personalized signed-in content.
      const requestContext = inject(REQUEST_CONTEXT, { optional: true });
      const app = hasAuthIdToken(requestContext)
        ? initializeServerApp(firebaseConfig, { authIdToken: requestContext.authIdToken })
        : initializeServerApp(firebaseConfig, {});

      // Clean up the Firebase server app as required by the SDK.
      inject(DestroyRef).onDestroy(() => {
        deleteApp(app).catch(error => console.error(error));
      });
      return app;
    }),
    // Wait for auth state to settle before rendering.
    provideAppInitializer(() => inject(Auth).authStateReady()),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
