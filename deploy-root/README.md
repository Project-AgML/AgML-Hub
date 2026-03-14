# Deploy AgML Hub to project-agml.github.io (root URL)

To serve the hub at **https://project-agml.github.io/** (no subpath):

## 1. Create the repo

1. Create a new repo: **project-agml.github.io** in the Project-AgML org
2. Add a placeholder file (e.g. `README.md`) and push so the repo exists

## 2. Add the workflow

1. Create `.github/workflows/deploy.yml` in the project-agml.github.io repo
2. Copy the contents from `pages-workflow.yml` in this folder

## 3. Enable Pages

1. Repo **Settings** → **Pages**
2. **Source:** GitHub Actions

## 4. Push to trigger

Push to `main` to build and deploy. The workflow clones AgML-Hub, builds with `base: /`, and deploys to Pages.

---

The AgML-Hub repo will continue to deploy to https://project-agml.github.io/AgML-Hub/. You can disable that or keep both; the root URL will be the main entry point.
