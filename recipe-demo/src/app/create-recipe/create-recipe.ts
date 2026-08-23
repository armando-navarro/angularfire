import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { generationErrorMessage } from '../generation-error-message';
import { RecipeStore } from '../recipe-store';

@Component({
  selector: 'app-create-recipe',
  templateUrl: './create-recipe.html',
  styleUrl: './create-recipe.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateRecipe {
  private readonly recipeStore = inject(RecipeStore);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async generate(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.recipeStore.generateRecipe();
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set(generationErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
