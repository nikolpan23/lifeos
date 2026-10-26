# Setting up Firebase for LifeOS

This guide connects LifeOS to **your own** Firebase project and deploys it to Firebase App Hosting. Everything is created in your Google account; nothing here uses anyone else's project. It takes about 20–30 minutes.

> Firebase occasionally renames menu items. If a label below doesn't match exactly, look for the closest equivalent in the left-hand **Build** menu.

## 1. Create your project

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Create a project**, name it (for example `lifeos`), and continue. Google Analytics is optional; LifeOS doesn't use it.
3. App Hosting needs the **Blaze (pay as you go)** plan. Open the plan badge at the bottom of the left menu and upgrade. Blaze includes the free tier; a small personal app usually stays within it, but you can set a budget alert in Google Cloud billing to be safe.

## 2. Turn on sign-in

1. **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password** (the first toggle only) and save.

## 3. Create the database

1. **Build → Firestore Database → Create database**.
2. Choose a location close to you (for Greece, a European location such as `eur3` or `europe-west`). This can't be changed later.
3. Start in **production mode**. LifeOS's own rules replace the defaults in step 5.

## 4. Register the web app and copy its config

1. Open **Project settings** (gear icon) → **General** → **Your apps** → the web icon `</>`.
2. Give it a nickname (for example `LifeOS web`). You don't need Firebase Hosting here, so leave that box unticked.
3. Firebase shows a `firebaseConfig` object. Copy `.env.example` to `.env.local` in the project folder and fill in:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...        # apiKey
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...    # authDomain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...     # projectId
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... # storageBucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

   These values identify your project and are safe to be public; your security rules are what protect the data.

4. For local development only, the server also needs credentials: **Project settings → Service accounts → Generate new private key**. Open the downloaded JSON, put it on a single line, and set `FIREBASE_SERVICE_ACCOUNT_KEY=` to it in `.env.local`. Keep this file private and never commit it. (`.env*` files are already git-ignored.)

## 5. Deploy the security rules

From the project folder:

```bash
npx firebase login                 # opens a browser to sign in with your Google account
npx firebase use --add             # pick your project, give it the alias "default"
npm run deploy:rules               # uploads firestore.rules and firestore.indexes.json
```

You can check the result under **Firestore Database → Rules**.

At this point `npm run dev` works with real accounts: open <http://localhost:3000/signup>.

## 6. Put the code on GitHub

App Hosting builds from a GitHub repository. Push this project to a repository in your GitHub account (private is fine).

## 7. Deploy with App Hosting

1. **Build → App Hosting → Get started**.
2. Choose a region, connect your GitHub account, and pick the LifeOS repository.
3. Settings: root directory `/`, live branch `main`, automatic rollouts on.
4. Name the backend `lifeos`, and when asked, associate it with the web app from step 4. That lets App Hosting pass the web config to the build automatically, so you don't copy keys into `apphosting.yaml`.
5. Click **Finish and deploy**. The first build takes a few minutes. Your app's URL appears on the backend's page (it ends in `.hosted.app`).

After the first rollout:

- **Authentication → Settings → Authorized domains**: make sure your `.hosted.app` domain (and any custom domain) is listed. Add it if it isn't.
- Sign up on the live site and finish onboarding to confirm everything works.

If sign-in on the live site fails with a "Could not start your session" message, the backend's service account may need permission to create session cookies. In the Google Cloud console for the same project, open **IAM**, find the App Hosting service account (`firebase-app-hosting-compute@<project-id>.iam.gserviceaccount.com`), and grant it **Firebase Authentication Admin**. If AI or account deletion report a permission error, also grant **Cloud Datastore User**.

## 8. Optional: AI-assisted planning

1. Create an API key at <https://console.anthropic.com> (this is billed by Anthropic, separately from Firebase).
2. Store it as an App Hosting secret:

   ```bash
   npx firebase apphosting:secrets:set ANTHROPIC_API_KEY
   ```

   Accept the prompt to grant the `lifeos` backend access.
3. In `apphosting.yaml`, uncomment the `ANTHROPIC_API_KEY` block, commit and push. A new rollout starts.
4. In the app, open **Settings → AI suggestions** and turn it on. Each person is limited to `AI_DAILY_LIMIT` requests a day (20 by default).

For local development, put `ANTHROPIC_API_KEY=...` in `.env.local` instead.

## Updating

Pushing to `main` deploys a new version. When `firestore.rules` changes, run `npm run deploy:rules` again (rules aren't deployed by App Hosting).
