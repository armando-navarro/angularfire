import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthStore } from '../auth-store';
import { CUISINES } from '../recipe-converter';
import { RecipeStore } from '../recipe-store';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly authStore = inject(AuthStore);
  protected readonly recipeStore = inject(RecipeStore);
  protected readonly cuisines = CUISINES;

  constructor() {
    this.recipeStore.watchRecipes();
  }
}
