import type {
  DocumentData,
  FieldValue,
  FirestoreDataConverter,
  WithFieldValue,
} from 'firebase/firestore';

export const CUISINES: readonly string[] = ['Italian', 'Japanese', 'Mexican', 'Indian', 'French'];

interface RecipeFields {
  title: string;
  cuisine: string;
  ingredients: string[];
  instructions: string[];
  createdBy: string;
  likeCount: number;
}

/** A recipe as the app reads it. */
export interface Recipe extends RecipeFields {
  id: string;
}

/** A recipe on the way in. */
export interface RecipeDraft extends RecipeFields {
  createdAt: FieldValue;
}

export function toRecipe(id: string, data: Record<string, unknown>): Recipe {
  return {
    id,
    title: String(data['title'] ?? ''),
    cuisine: String(data['cuisine'] ?? ''),
    ingredients: Array.isArray(data['ingredients']) ? data['ingredients'].map(String) : [],
    instructions: Array.isArray(data['instructions']) ? data['instructions'].map(String) : [],
    createdBy: String(data['createdBy'] ?? ''),
    likeCount: Number(data['likeCount'] ?? 0),
  };
}

export const recipeConverter: FirestoreDataConverter<Recipe> = {
  toFirestore(): DocumentData {
    throw new Error('Recipes are written through recipeDraftConverter.');
  },
  fromFirestore: snapshot => toRecipe(snapshot.id, snapshot.data()),
};

export const recipeDraftConverter: FirestoreDataConverter<RecipeDraft> = {
  toFirestore(draft: WithFieldValue<RecipeDraft>): DocumentData {
    return { ...draft };
  },
  fromFirestore(): RecipeDraft {
    throw new Error('Recipes are read through recipeConverter.');
  },
};
