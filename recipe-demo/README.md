# Recipe demo, AngularFire

A minimal recipe app built with AngularFire. It uses four Firebase features: Authentication, Firestore, AI Logic, and App Check.

It is the same application as the `recipe-demo` branch, whose Firebase layer calls the Firebase JS SDK directly. Only the Firebase layer differs, so the diff between the two branches is what AngularFire changes and nothing else.

This is not a starter template and not production-ready. Known gaps are listed under [Production gaps](#production-gaps) rather than solved.

## What the app does

- **`/`** renders the public recipe list. Filter by cuisine, sort by Newest or A-Z. Signed-in visitors can like recipes.
- **`/signin`** signs in or creates an account with email and password.
- **`/create-recipe`** generates a recipe with Firebase AI Logic and writes it to the public list (must be signed in).

## Deployed instance

To be added when this branch's App Hosting backend is deployed.

## Design decisions

This is not an exhaustive list of design decisions. Some here are gaps left open on purpose due to the nature of this being a minimal demo, and some are choices that are not obvious from the code.

### The recipe list is carried from server to browser by hand

Angular's automatic state transfer only covers `HttpClient`, which Firestore never touches, so `recipe-store.ts` writes the server's query result into `TransferState` and reads it back on the client. Without it the server-rendered list is blanked by the first client render and reappears when the listener responds.

Worth knowing what this does not fix. The browser still opens its own Firestore listener and reads the same documents again, so the visible flash is gone but the second read is not.

### The store idles until a page asks for the list

`RecipeStore` is provided in root so the listener survives navigation, which means `/create-recipe` injects it too, purely to generate. A `listWanted` signal keeps the query parameters `undefined` until a page that actually displays recipes calls `watchRecipes()`. Without it, `/create-recipe`'s server render would block on a Firestore read whose result it never shows.

### Each recipe stores its own like count

The number of likes is kept on the recipe document as `likeCount`, duplicating something you could work out by counting the documents under `users/{uid}/likes/{recipeId}`. Storing the total is what makes the list cheap: rendering twenty cards is one query, where counting likes per card would be twenty more.

The cost of keeping that copy is that nothing derives it for you, so keeping it in step is deliberate work. `toggleLike` writes the user's like document and the recipe's counter in a single `writeBatch`, and the security rules refuse either write without the other, so the two can only move together.

### There are no Cloud Functions

Everything runs in the browser or during server rendering. That single choice is why two of the [Production gaps](#production-gaps) below exist: nothing cleans up like documents when a recipe is deleted, and nothing rate-limits generation per user.

### There are no unit tests

This demo app is meant to be a minimal app, so unit tests were omitted. This was deliberate.

### It runs against a live Firebase project, not the emulators

Simpler to set up, and it avoids emulator-specific behavior. The cost is that you need a real project and a network connection to run anything at all.

### The per-request server app is released by the garbage collector

Rendering a page for a signed-in visitor creates a `FirebaseServerApp` carrying that visitor's identity, and the Firebase SDK requires the application to dispose of it. There are two ways to do that, and this branch takes the one AngularFire's own auth guide teaches: the server factory hands the request context to `initializeServerApp` as `releaseOnDeref`, and the SDK watches that object with a `FinalizationRegistry`, releasing the server app once the object is collected.

## Production gaps

Deliberately left open, and labeled rather than solved.

- **No pagination.** The list is a flat `limit(20)`, so a 21st recipe is unreachable. A real app would page with `startAfter()`.
- **Like documents are left behind on delete.** Deleting a recipe removes the recipe, but every user who liked it keeps a `users/{uid}/likes/{recipeId}` document pointing at a recipe that no longer exists. Clearing those needs a Cloud Functions trigger, which is out of scope for this demo.
- **No rate limiting on generation.** The only brake on the Generate recipe button is that it disables itself while a request is in flight. A real app would limit per user, server-side.
- **No server-side App Check token forwarding.** If the browser forwarded an App Check token with the page request and the server passed it to `initializeServerApp` as `appCheckToken`, and the seed script authenticated with a registered debug token, App Check could be enforced on Firestore and Auth as well. Until then, anyone who copies the public web config out of this repo can read and write Firestore from a script of their own, held back only by the security rules and not by any check that the request came from this app.
- **The recipe read is unvalidated.** `collectionData(query, { idField: 'id' })` returns untyped documents, and nothing checks that a document matches the `Recipe` interface before the templates read it. `recipe-store.ts` handles that with two casts, `map(documents => documents as Recipe[])` on the browser listener and `as Recipe` on the server read. 
- **The server knows who the visitor is, but never reads anything as them.** `initializeServerApp` is handed the visitor's ID token, so `auth.currentUser` is populated while the page renders on the server. Nothing then uses it. The recipe list is a public read that returns the same documents whoever asks, and the likes data only loads in the browser. So no Firestore security rule is ever evaluated against that token, and this app has not shown that the token would satisfy one.

## Setup

This section explains how to set up this demo app using your own Firebase project. It serves both as a guide for the curious and as a record of how the Firebase project was configured.

### 1. A Firebase project

The committed `src/app/firebase-config.ts` points at the project this demo was built against. To run it against your own, create a project on the Blaze plan and turn on all four of the following. Then replace the config in `src/app/firebase-config.ts`, and the copy of it in `seed.mjs`, which Node cannot import from the TypeScript module.

- **Authentication** with the Email/Password provider enabled.
- **Cloud Firestore**, Standard edition, production mode.
- **Firebase AI Logic** with the **Agent Platform (formerly Vertex AI)** provider enabled. See below, because this one is easy to get wrong.
- **App Check**, with the web app registered against reCAPTCHA v3. Put the site key in `src/app/firebase-config.ts` as `recaptchaSiteKey`. The secret key stays in the console. Set replay protection to monitoring only, because the app never requests limited-use tokens.

### 2. The AI Logic provider, which is not optional

`app.config.client.ts` provides AI as `provideAI(() => getAI(inject(FirebaseApp), { backend: new AgentPlatformBackend() }))`, so enabling only the Gemini Developer API provider is not enough. Enable the Agent Platform provider or generation fails. Two failure signatures are worth recognizing:

- **429 `RESOURCE_EXHAUSTED`, saying prepayment credits are depleted.** The request went to the Gemini Developer API backend, whose prepay balance Google Cloud credit cannot fund. Enable the Agent Platform provider.
- **404 `NOT_FOUND` naming `locations/us-central1`.** The request went through the deprecated `VertexAIBackend`, whose no-argument default is `us-central1`. `AgentPlatformBackend` defaults to `global`, which is what Firebase recommends, and what this app uses.

### 3. App Check enforcement

Enforcement is **on for AI Logic only**. Firestore and Auth are left unenforced on purpose:

- The server render never carries an App Check token, and the reCAPTCHA provider cannot run in Node, so enforcing App Check on Firestore would break every server render.
- `seed.mjs` signs in and writes from Node with no provider either, so enforcing on Auth or Firestore would break the seed script.

AI Logic is called only from the browser, where App Check does run. That is where it matters most. The web config in this repo is public, so anyone can copy it and call this project's Gemini endpoint from a script of their own, and the bill lands on the project. Firestore has security rules to limit what a stranger can do with the same config. AI Logic has no equivalent, so App Check is the only thing requiring those calls to come from this app. Closing the rest of the hole needs server-side token forwarding, which is listed under [Production gaps](#production-gaps).

### 4. Rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

`firebase.json` points at `firestore.rules` and `firestore.indexes.json`, and `.firebaserc` names the project. The two composite indexes are what the cuisine filter needs on top of each sort order.

### 5. Seed data

The seed writes five recipes as its own account, so that account has to exist first. Create it through the app's own Create account button, or in the Authentication console.

```bash
SEED_EMAIL=you@example.com SEED_PASSWORD=... node seed.mjs
```

Re-running deletes that account's own recipes before writing, so it doubles as a reset.

### 6. AngularFire is installed by hand, not with `ng add`

`@angular/fire` is pinned to an exact canary in `package.json` and its providers are written by hand. `ng add @angular/fire` was not used, because it throws on this app's configuration layout.

The cause is narrower than "the split client and server config". The schematic's `findAppConfig` cannot resolve a config that is the result of a `mergeApplicationConfig` call assigned to a variable, which is what both `app.config.client.ts` and `app.config.server.ts` do.

## Running it

```bash
npm ci

# Development server on http://localhost:4200/
npm start

# Production build, then the built SSR server on http://localhost:4000/
npm run build
npm run serve:ssr:recipe-demo
```

### Reviewer note, please read before reporting a failure

**Browse via `localhost`, not `127.0.0.1`.** The built server rejects the numeric address with `HTTP 400`, because `angular.json` does not list it among the allowed hosts. That happens before any JavaScript in the app runs.

The raw SDK branch had a second reason for the same advice, and this branch does not. That branch set the App Check debug flag itself, guarded on `location.hostname` being exactly `localhost`, so any other host name reached real reCAPTCHA instead of a debug token. Nothing here sets that flag. AngularFire's `appCheckInstanceFactory` sets it, on a condition wider than the hand-written one at both ends: it fires whenever the platform is not the server and either `isDevMode()` is true or the hostname is one of `localhost`, `0.0.0.0` and `127.0.0.1`.

**A fresh machine or a fresh browser profile mints a new App Check debug token.** On the first load from `localhost` the console logs one line:

```
Firebase App Check debug token: 00000000-0000-0000-0000-000000000000
```

That token has to be registered in the Firebase console, under App Check, on the web app's Manage debug tokens. Until it is, AI Logic returns `401` and the console repeats `exchangeDebugToken` `403`. Everything except recipe generation keeps working, because enforcement is AI Logic only.

If you would rather not register a token, use the deployed URL above instead.

## How Angular 22 would differ

The short version is that the application code would barely move and the dependency would not resolve at all.

**How this was checked, because it limits how much the next two points are worth.** Nobody built this app against Angular 22, and nobody can: npm refuses to install the two together, because no published `@angular/fire` allows an Angular 22 peer. So instead of compiling anything, the two versions of Angular's published type declaration files were downloaded and compared by reading, at 21.2.21 and 22.1.3. That is weaker evidence than a build. It catches a changed signature and it would not catch a changed behavior.

**One thing changes.**

- **`rxResource` stops being experimental.** The recipe list is an `rxResource` over `collectionData`. In 21.2.21 both of its overloads, and the `RxResourceOptions` interface behind them, are tagged `@experimental`. In 22.1.3 all three are tagged `@publicApi 22.0`. That is nearly the whole difference between the two declaration files: fourteen changed lines, being those three tags, three import paths, and the version number in the file's license header. The call in `recipe-store.ts` would compile unchanged.

**Where to look first, once AngularFire supports Angular 22.** The parts worth re-checking are the ones where the library reads Angular's own state rather than re-exporting a Firebase call: `ɵzoneWrap`, which decides both its log level and its wrapping path from Angular internals, and the `PendingTasks` registration inside it that holds the server render open until a read settles.
