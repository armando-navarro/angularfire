import { FirebaseError } from 'firebase/app';
import type { AuthErrorCodes } from 'firebase/auth';

type AuthErrorCode = (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes];

const fallbackMessage = 'Sign-in failed, try again.';

const entries: readonly (readonly [AuthErrorCode, string])[] = [
  ['auth/invalid-credential', 'Wrong email or password.'],
  ['auth/invalid-email', 'Wrong email or password.'],
  ['auth/user-not-found', 'Wrong email or password.'],
  ['auth/wrong-password', 'Wrong email or password.'],
  ['auth/too-many-requests', 'Too many attempts. Wait a moment, then try again.'],
  ['auth/network-request-failed', 'Cannot reach the network. Check your connection and try again.'],
  ['auth/email-already-in-use', 'That email already has an account. Try signing in instead.'],
  ['auth/weak-password', 'Choose a stronger password.'],
];

const messagesByCode = new Map<string, string>(entries);

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return messagesByCode.get(error.code) ?? fallbackMessage;
  }
  return fallbackMessage;
}
