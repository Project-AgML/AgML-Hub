# AgML Hub

Web interface for browsing [AgML](https://github.com/Project-AgML/AgML) datasets and benchmarks.

## Quick start

```bash
cd frontend
npm install
npm run prebuild   # requires agml-source at ../agml-source
npm run dev
```

See [frontend/README.md](frontend/README.md) for full details.

## Deployment

Push to `main` to auto-deploy to [project-agml.github.io](https://project-agml.github.io/).

**Setup (one-time):** Use a deploy key (org-owned, no personal account):

1. Generate a key: `ssh-keygen -t ed25519 -C "agml-hub-deploy" -f deploy_key -N ""`
2. In **project-agml.github.io** → Settings → Deploy keys → Add deploy key: paste `deploy_key.pub`, enable "Allow write access"
3. In **AgML-Hub** → Settings → Secrets → Actions: add `ACTIONS_DEPLOY_KEY` with the contents of `deploy_key` (private key)
4. Delete the local key files
