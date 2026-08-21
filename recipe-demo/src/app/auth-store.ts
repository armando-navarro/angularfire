import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { FIREBASE_AUTH } from './firebase-tokens';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly user = signal<User | null>(null);

  readonly currentUser = this.user.asReadonly();

  constructor() {
    const unsubscribe = onAuthStateChanged(this.auth, user => this.user.set(user));
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async createAccount(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
