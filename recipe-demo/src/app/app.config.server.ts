import {
  ApplicationConfig,
  DestroyRef,
  REQUEST_CONTEXT,
  inject,
  mergeApplicationConfig,
  provideAppInitializer,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { deleteApp, initializeServerApp } from 'firebase/app';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { firebaseConfig } from './firebase-config';
import { FIREBASE_APP, FIREBASE_AUTH } from './firebase-tokens';

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
    {
      provide: FIREBASE_APP,
      useFactory: () => {
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
      },
    },
    // Wait for auth state to settle before rendering.
    provideAppInitializer(() => inject(FIREBASE_AUTH).authStateReady()),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
