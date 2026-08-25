import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    provideFirestore(() => getFirestore(inject(FirebaseApp))),
    provideAuth(() => getAuth(inject(FirebaseApp))),
  ],
};
