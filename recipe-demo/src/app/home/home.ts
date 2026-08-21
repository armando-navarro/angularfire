import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CUISINES } from '../recipe-converter';
import { RecipeStore } from '../recipe-store';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly recipeStore = inject(RecipeStore);
  protected readonly cuisines = CUISINES;
}
