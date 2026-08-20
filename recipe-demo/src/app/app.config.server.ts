import { ApplicationConfig, DestroyRef, inject, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { deleteApp, initializeServerApp } from 'firebase/app';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { firebaseConfig } from './firebase-config';
import { FIREBASE_APP } from './firebase-tokens';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: FIREBASE_APP,
      useFactory: () => {
        // No auth token is passed, so the server renders every visitor as
        // signed out. The SDK requires explicit cleanup when no
        // releaseOnDeref object is supplied.
        const app = initializeServerApp(firebaseConfig, {});
        inject(DestroyRef).onDestroy(() => {
          deleteApp(app).catch(err => console.error(err));
        });
        return app;
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
