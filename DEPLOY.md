# IDGate — Deploying the demo

IDGate is a static, client-only single-page app (React + Vite). The production
build in `dist/` is just HTML/CSS/JS — it can be hosted anywhere, with **no
server or database**. All demo data is seeded into the browser's `localStorage`.

Because the app uses **HashRouter** (URLs look like `…/#/home`) and a **relative
asset base** (`base: './'` in `vite.config.ts`), the same build works from a root
domain, a Netlify/Vercel site, or a GitHub Pages project subpath — no rewrite
rules needed.

```bash
npm install
npm run build       # → dist/
npm run preview     # serve dist/ locally at http://localhost:4173
```

Pick one host below.

## Option A — Netlify (fastest one-off share)

```bash
npm run build
npx netlify-cli deploy --dir=dist --prod
```

The first run opens a browser to log in / create a free account, then prints a
public `https://<name>.netlify.app` URL. `netlify.toml` is already configured, so
from a connected Git repo you can also just push and Netlify auto-builds.

## Option B — Vercel

```bash
npm run build
npx vercel --prod
```

First run prompts you to log in and links the project. `vercel.json` sets the
build command and output dir.

## Option C — GitHub Pages (free, auto-deploys on push)

A CI workflow is included at `.github/workflows/deploy.yml`.

1. Create a repo and push this project:
   ```bash
   git init && git add -A && git commit -m "IDGate demo"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` builds and publishes to
   `https://<you>.github.io/<repo>/`.

(The relative base + HashRouter make the project-subpath URL work as-is.)
