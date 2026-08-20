import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, deleteDoc, getDocs, getFirestore, query, serverTimestamp, where } from 'firebase/firestore';

if (!process.env.SEED_EMAIL || !process.env.SEED_PASSWORD) {
  console.error('Set SEED_EMAIL and SEED_PASSWORD before running the seed.');
  process.exit(1);
}

// Usage: SEED_EMAIL=... SEED_PASSWORD=... node seed.mjs
// Removes the seed account's own recipes first, so re-running doubles as
// the data reset before the screencast.
// Keep in sync with src/app/firebase-config.ts (Node cannot import that TS module).
const firebaseConfig = {
  apiKey: 'AIzaSyAt9lVugjwr0wpQeke0UXv3sOunlVDe94E',
  authDomain: 'recipe-demo-97859.firebaseapp.com',
  projectId: 'recipe-demo-97859',
  appId: '1:241663837838:web:27af061c81c4efec332bdf',
};

const recipes = [
  {
    title: 'Margherita Pizza',
    cuisine: 'Italian',
    ingredients: ['pizza dough', 'tomato sauce', 'fresh mozzarella', 'basil', 'olive oil'],
    instructions: ['Preheat the oven to 250C.', 'Stretch the dough.', 'Top with sauce, cheese, basil.', 'Bake 8-10 minutes.'],
  },
  {
    title: 'Chicken Teriyaki',
    cuisine: 'Japanese',
    ingredients: ['chicken thighs', 'soy sauce', 'mirin', 'sugar', 'rice'],
    instructions: ['Simmer soy, mirin, sugar into a glaze.', 'Pan-fry the chicken.', 'Coat with glaze.', 'Serve over rice.'],
  },
  {
    title: 'Tacos al Pastor',
    cuisine: 'Mexican',
    ingredients: ['pork shoulder', 'achiote paste', 'pineapple', 'corn tortillas', 'onion', 'cilantro'],
    instructions: ['Marinate the pork in achiote.', 'Roast with pineapple.', 'Slice thin.', 'Serve on tortillas with onion and cilantro.'],
  },
  {
    title: 'Chana Masala',
    cuisine: 'Indian',
    ingredients: ['chickpeas', 'onion', 'tomato', 'garam masala', 'ginger', 'garlic'],
    instructions: ['Saute onion, ginger, garlic.', 'Add tomato and garam masala.', 'Simmer the chickpeas in the sauce.', 'Serve with rice.'],
  },
  {
    title: 'Ratatouille',
    cuisine: 'French',
    ingredients: ['eggplant', 'zucchini', 'bell pepper', 'tomato', 'herbes de Provence'],
    instructions: ['Slice the vegetables thin.', 'Layer in a baking dish over tomato base.', 'Season and bake 45 minutes.'],
  },
];

const app = initializeApp(firebaseConfig);
const credentials = await signInWithEmailAndPassword(
  getAuth(app),
  process.env.SEED_EMAIL,
  process.env.SEED_PASSWORD,
);
const db = getFirestore(app);
const stale = await getDocs(query(collection(db, 'recipes'), where('createdBy', '==', credentials.user.uid)));
for (const staleDoc of stale.docs) {
  await deleteDoc(staleDoc.ref);
  console.log(`Removed: ${staleDoc.id}`);
}
for (const recipe of recipes) {
  await addDoc(collection(db, 'recipes'), {
    ...recipe,
    createdAt: serverTimestamp(),
    createdBy: credentials.user.uid,
    likeCount: 0,
  });
  console.log(`Seeded: ${recipe.title}`);
}
process.exit(0);
