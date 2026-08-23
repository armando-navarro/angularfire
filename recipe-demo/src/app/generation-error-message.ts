import { FirebaseError } from 'firebase/app';
import type { AIErrorCode } from 'firebase/ai';
import type { FirestoreErrorCode } from 'firebase/firestore';

const fallbackMessage = 'Recipe generation failed, try again.';

const entries: readonly (readonly [AIErrorCode | FirestoreErrorCode, string])[] = [
  ['fetch-error', 'The recipe generator could not be reached. Try again in a moment.'],
  ['request-error', 'The recipe generator rejected the request. Try again.'],
  ['response-error', 'The generator could not produce a usable recipe this time. Try again.'],
  ['parse-failed', 'The generator returned something unreadable. Try again.'],
  ['api-not-enabled', 'Recipe generation is not enabled for this project.'],
  ['unauthenticated', 'Sign in to create recipes.'],
  ['permission-denied', 'You are not allowed to save recipes.'],
  ['unavailable', 'Could not save the recipe. Check your connection and try again.'],
];

const messagesByCode = new Map<string, string>(entries);

export function generationErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return messagesByCode.get(error.code) ?? fallbackMessage;
  }
  // Everything else reaching here was thrown by this app and is already written for the reader.
  return error instanceof Error ? error.message : fallbackMessage;
}
