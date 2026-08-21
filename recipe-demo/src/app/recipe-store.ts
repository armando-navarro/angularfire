import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  ResourceStreamItem,
  Signal,
  TransferState,
  computed,
  inject,
  makeStateKey,
  resource,
  signal,
} from '@angular/core';
import {
  Query,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { FIRESTORE } from './firebase-tokens';
import { Recipe, recipeConverter } from './recipe-converter';

export type RecipeSort = 'newest' | 'title';

interface ServerRenderedRecipes {
  cuisine: string;
  sort: RecipeSort;
  recipes: Recipe[];
}

// Root provided so the browser listener outlives the list page and coming back is instant.
@Injectable({ providedIn: 'root' })
export class RecipeStore {
  private static readonly SERVER_RENDERED_RECIPES = makeStateKey<ServerRenderedRecipes | null>(
    'serverRenderedRecipes',
  );

  private readonly firestore = inject(FIRESTORE);
  private readonly transferState = inject(TransferState);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly cuisine = signal('all');
  readonly sort = signal<RecipeSort>('newest');

  private readonly serverRendered = signal(
    this.transferState.get(RecipeStore.SERVER_RENDERED_RECIPES, null),
  );

  private readonly recipeResource = resource({
    params: () => ({ cuisine: this.cuisine(), sort: this.sort() }),
    stream: ({ params, abortSignal }) => this.readRecipes(params.cuisine, params.sort, abortSignal),
    defaultValue: [],
  });

  // On the first browser render the resource has not loaded, so without this an empty list would
  // paint over the recipes the server already rendered. The query must match too, or a filter
  // changed before the listener responds would show the server's list under the wrong filter.
  readonly recipes = computed(() => {
    const serverRendered = this.serverRendered();
    if (
      serverRendered &&
      serverRendered.cuisine === this.cuisine() &&
      serverRendered.sort === this.sort()
    ) {
      return serverRendered.recipes;
    }
    return this.recipeResource.hasValue() ? this.recipeResource.value() : [];
  });
  readonly error = this.recipeResource.error;

  setSort(value: string): void {
    this.sort.set(value === 'title' ? 'title' : 'newest');
  }

  /** Loads the recipes for one cuisine and sort order and hands back the signal
   * the resource reads from. In the browser that signal keeps changing as
   * Firestore pushes new snapshots. */
  private async readRecipes(
    cuisine: string,
    sort: RecipeSort,
    abortSignal: AbortSignal,
  ): Promise<Signal<ResourceStreamItem<Recipe[]>>> {
    const recipeQuery = this.buildQuery(cuisine, sort);
    if (!this.isBrowser) {
      // The server reads once instead of subscribing. A listener would stay
      // open and the render would never finish.
      const snapshot = await getDocs(recipeQuery);
      const serverRecipes = snapshot.docs.map(recipeDoc => recipeDoc.data());
      this.transferState.set(RecipeStore.SERVER_RENDERED_RECIPES, {
        cuisine,
        sort,
        recipes: serverRecipes,
      });
      return signal({ value: serverRecipes });
    }
    // A live listener in the browser, torn down through the abort signal the
    // resource raises when the query changes or the store is destroyed.
    const recipes = signal<ResourceStreamItem<Recipe[]>>({ value: [] });
    // Once this listener has responded, the server's list is stale. Without discarding it, returning
    // to the filter the server rendered would show that old list again.
    const unsubscribe = onSnapshot(
      recipeQuery,
      snapshot => {
        this.serverRendered.set(null);
        recipes.set({ value: snapshot.docs.map(recipeDoc => recipeDoc.data()) });
      },
      error => {
        this.serverRendered.set(null);
        recipes.set({ error });
      },
    );
    abortSignal.addEventListener('abort', unsubscribe);
    return recipes;
  }

  // A production list would add cursor pagination on top of this limit.
  private buildQuery(cuisine: string, sort: RecipeSort): Query<Recipe> {
    const order = sort === 'newest' ? orderBy('createdAt', 'desc') : orderBy('title');
    const recipesRef = collection(this.firestore, 'recipes').withConverter(recipeConverter);
    return cuisine === 'all'
      ? query(recipesRef, order, limit(20))
      : query(recipesRef, where('cuisine', '==', cuisine), order, limit(20));
  }
}
