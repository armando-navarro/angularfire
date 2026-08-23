import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { authErrorMessage } from '../auth-error-message';
import { AuthStore } from '../auth-store';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignIn {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly credentials = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly error = signal('');

  protected async signIn(): Promise<void> {
    await this.run((email, password) => this.authStore.signIn(email, password));
  }

  protected async createAccount(): Promise<void> {
    await this.run((email, password) => this.authStore.createAccount(email, password));
  }

  private async run(action: (email: string, password: string) => Promise<void>): Promise<void> {
    this.error.set('');
    if (this.credentials.invalid) {
      this.credentials.markAllAsTouched();
      return;
    }
    const { email, password } = this.credentials.getRawValue();
    try {
      await action(email, password);
    } catch (err) {
      this.error.set(authErrorMessage(err));
      return;
    }
    this.router.navigateByUrl(this.returnUrl()).catch(err => console.error(err));
  }

  /** Where the visitor was headed when the auth guard intercepted them, or `/` if the returnUrl
   * query param is not an in-app path. */
  private returnUrl(): string {
    const requested = this.activatedRoute.snapshot.queryParamMap.get('returnUrl') ?? '';
    const isInAppPath =
      requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/\\');
    return isInAppPath ? requested : '/';
  }
}
