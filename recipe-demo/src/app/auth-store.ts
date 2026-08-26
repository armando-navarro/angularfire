import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(Auth);
  private readonly injector = inject(EnvironmentInjector);

  readonly currentUser = toSignal(authState(this.auth), { initialValue: null });

  async signIn(email: string, password: string): Promise<void> {
    await runInInjectionContext(this.injector, () =>
      signInWithEmailAndPassword(this.auth, email, password),
    );
  }

  async createAccount(email: string, password: string): Promise<void> {
    await runInInjectionContext(this.injector, () =>
      createUserWithEmailAndPassword(this.auth, email, password),
    );
  }

  signOut(): Promise<void> {
    return runInInjectionContext(this.injector, () => signOut(this.auth));
  }
}
