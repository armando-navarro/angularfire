import { InjectionToken } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AI } from 'firebase/ai';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('firebase-app');
export const FIRESTORE = new InjectionToken<Firestore>('firestore');
export const FIREBASE_AUTH = new InjectionToken<Auth>('firebase-auth');
export const FIREBASE_AI = new InjectionToken<AI>('firebase-ai');
