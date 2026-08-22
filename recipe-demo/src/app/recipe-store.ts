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
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import { AuthStore } from './auth-store';
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

  private static readonly NO_LIKES: ReadonlySet<string> = new Set();

  private readonly firestore = inject(FIRESTORE);
  private readonly authStore = inject(AuthStore);
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

  // Idle the resource with undefined so no snapshot subscription occurs on the server.
  // null instead at sign-out, so Angular aborts the previous load and unsubscribes.
  private readonly likedResource = resource({
    params: () => (this.isBrowser ? (this.authStore.currentUser()?.uid ?? null) : undefined),
    stream: ({ params: uid, abortSignal }) => this.readLikedIds(uid, abortSignal),
    defaultValue: RecipeStore.NO_LIKES,
  });

  /** Recipes this visitor has liked. Reading the resource value directly would throw if the
   * listener were ever denied, so a failed listener reads as nothing liked. */
  readonly likedIds = computed(() =>
    this.likedResource.hasValue() ? this.likedResource.value() : RecipeStore.NO_LIKES,
  );

  /** Recipes with a like write in flight, so a second click cannot count twice. */
  readonly likePending = signal<ReadonlySet<string>>(RecipeStore.NO_LIKES);

  /** Title of the recipe whose like write was rejected, or null. */
  readonly likeErrorRecipe = signal<string | null>(null);

  /** Title of the recipe whose delete was rejected, or null. */
  readonly deleteErrorRecipe = signal<string | null>(null);

  /** true once this user's first likes snapshot has arrived. */
  private readonly likesReady = signal(false);

  /** false until the signed-in user's likes have arrived. */
  readonly canLike = computed(() => this.authStore.currentUser() !== null && this.likesReady());

  setSort(value: string): void {
    this.sort.set(value === 'title' ? 'title' : 'newest');
  }

  /** Adds or removes this user's like document and moves the recipe's likeCount in one batch, so
   * a like never lands without its count. */
  async toggleLike(recipe: Recipe): Promise<void> {
    const user = this.authStore.currentUser();
    // The button is disabled while a write is in flight. This repeats the check because a
    // keyboard repeat or a replayed event can still arrive, and a second batch would count twice.
    if (!user || !this.likesReady() || this.likePending().has(recipe.id)) {
      return;
    }
    this.likePending.update(pending => new Set(pending).add(recipe.id));
    this.likeErrorRecipe.set(null);
    this.deleteErrorRecipe.set(null);
    try {
      const likeRef = doc(this.firestore, `users/${user.uid}/likes/${recipe.id}`);
      const recipeRef = doc(this.firestore, `recipes/${recipe.id}`);
      const batch = writeBatch(this.firestore);
      if (this.likedIds().has(recipe.id)) {
        batch.delete(likeRef);
        if (recipe.likeCount > 0) {
          batch.update(recipeRef, { likeCount: increment(-1) });
        }
      } else {
        batch.set(likeRef, {});
        batch.update(recipeRef, { likeCount: increment(1) });
      }
      await batch.commit();
    } catch (error) {
      console.error(error);
      this.likeErrorRecipe.set(recipe.title);
    } finally {
      this.likePending.update(pending => {
        const stillPending = new Set(pending);
        stillPending.delete(recipe.id);
        return stillPending;
      });
    }
  }

  /** Removes a recipe the signed-in user created. Other users' like documents aren't cleaned
   * up. Clearing those needs a Cloud Functions trigger, which this demo leaves out. */
  async deleteRecipe(recipe: Recipe): Promise<void> {
    this.deleteErrorRecipe.set(null);
    this.likeErrorRecipe.set(null);
    try {
      await deleteDoc(doc(this.firestore, `recipes/${recipe.id}`));
    } catch (error) {
      console.error(error);
      this.deleteErrorRecipe.set(recipe.title);
    }
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

  /** Streams the ids this user has liked. The abort signal unsubscribes the listener. */
  private async readLikedIds(
    uid: string | null,
    abortSignal: AbortSignal,
  ): Promise<Signal<ResourceStreamItem<ReadonlySet<string>>>> {
    this.likesReady.set(false);
    const likedIds = signal<ResourceStreamItem<ReadonlySet<string>>>({
      value: RecipeStore.NO_LIKES,
    });
    if (uid === null) {
      return likedIds;
    }
    const unsubscribe = onSnapshot(
      collection(this.firestore, `users/${uid}/likes`),
      snapshot => {
        likedIds.set({ value: new Set(snapshot.docs.map(likeDoc => likeDoc.id)) });
        this.likesReady.set(true);
      },
      error => likedIds.set({ error }),
    );
    abortSignal.addEventListener('abort', unsubscribe);
    return likedIds;
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
