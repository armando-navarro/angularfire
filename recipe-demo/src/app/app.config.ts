import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { routes } from './app.routes';
import { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE } from './firebase-tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    { provide: FIRESTORE, useFactory: () => getFirestore(inject(FIREBASE_APP)) },
    { provide: FIREBASE_AUTH, useFactory: () => getAuth(inject(FIREBASE_APP)) },
  ],
};
