import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, isActive } from '@angular/router';

import { AuthStore } from './auth-store';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly authStore = inject(AuthStore);
  protected readonly onSignInPage = isActive('/signin', inject(Router));

  protected signOut(): void {
    this.authStore.signOut().catch(err => console.error(err));
  }
}
