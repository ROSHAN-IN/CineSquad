# Exact GitHub workflow — 4 students

## Roshan — leader: upload base game

1. Create/choose a **separate team repo** (do not use Personal-Portfolio). Add Aman, Deepak and Aarav as collaborators; everyone must accept their invitation.
2. Open terminal (Mac):

```bash
cd ~/Documents
git clone https://github.com/YOUR-GITHUB-OWNER/YOUR-TEAM-REPO.git cinequest-team
cd cinequest-team
```

3. Copy **all files from the unzipped CineQuest-Ultimate folder** into `cinequest-team` (but never copy a `.git` folder). For example, when ZIP is extracted into `~/Downloads/CineQuest-Ultimate`:

```bash
cp -R ~/Downloads/CineQuest-Ultimate/. ~/Documents/cinequest-team/
cd ~/Documents/cinequest-team
git add .
git commit -m "chore: add CineQuest 120 movie starter"
git push -u origin main
```

If repo already contains commits, `git clone` will fetch them. Preserve existing files and resolve any actual conflicts; do not use force push.

## Aman — frontend branch

```bash
cd ~/Documents
git clone https://github.com/YOUR-GITHUB-OWNER/YOUR-TEAM-REPO.git cinequest-aman
cd cinequest-aman
git switch -c feature/aman-frontend
open -a 'Visual Studio Code' .
```

Edit `index.html`: improve page content, add a visually clear Rules summary under the hero, improve alt text / ARIA labels, and validate semantic markup. Then:

```bash
git add index.html
git commit -m "feat: improve onboarding and accessible HTML screens"
git push -u origin feature/aman-frontend
```

On GitHub open **Compare & pull request**, base `main`, compare `feature/aman-frontend`. Tell Roshan to review.

## Deepak — design branch

```bash
cd ~/Documents
git clone https://github.com/YOUR-GITHUB-OWNER/YOUR-TEAM-REPO.git cinequest-deepak
cd cinequest-deepak
git switch -c feature/deepak-design
open -a 'Visual Studio Code' .
```

Edit `css/style.css`: improve hover micro-interactions, 375px mobile spacing, and answer-button feedback; preserve high text contrast and reduced-motion support.

```bash
git add css/style.css
git commit -m "style: refine animations and mobile responsive layout"
git push -u origin feature/deepak-design
```

Create PR from `feature/deepak-design` to `main`.

## Aarav — JavaScript / content branch

```bash
cd ~/Documents
git clone https://github.com/YOUR-GITHUB-OWNER/YOUR-TEAM-REPO.git cinequest-aarav
cd cinequest-aarav
git switch -c feature/aarav-game-engine
open -a 'Visual Studio Code' .
```

Edit `js/data.js` to improve at least 5 hint descriptions and verify the movie list. Edit `js/app.js` to improve gameplay handling, add a testable rule or refine timeout feedback; make genuine changes and run tests. No API keys in Git.

```bash
node --check js/app.js
node --check js/data.js
node tests/test-core.js
git add js/app.js js/data.js
git commit -m "feat: improve movie clues and quiz flow"
git push -u origin feature/aarav-game-engine
```

Create PR from `feature/aarav-game-engine` to `main`.

## Roshan — own PR plus reviews

After base push:

```bash
cd ~/Documents/cinequest-team
git switch -c feature/roshan-quality
```

Update `README.md` with team member GitHub links and add real manual test notes to `docs/DEMO_SCRIPT.md` after testing. Then:

```bash
git add README.md docs/
git commit -m "docs: add team credits and verified demo checklist"
git push -u origin feature/roshan-quality
```

Create your own PR. Ask another member to review that PR when possible; review and merge teammates' PRs, verify combined code and then pull:

```bash
git switch main
git pull origin main
node tests/test-core.js
open index.html
```

**Never** push another member's work under your own credentials; individual commits and Pull Requests must represent actual contributions.

## Error fixes

- `zsh: command not found: code`: use `open -a 'Visual Studio Code' .` instead.
- `destination path already exists`: clone with a different destination folder name or use your existing clone; never delete an unknown folder.
- `nothing to commit`: make and save an actual change first.
- GitHub authentication: use browser Git Credential Manager or a personal access token / SSH; GitHub account password does not work as `git push` HTTPS password.
- `rejected (non-fast-forward)`: do `git pull --rebase origin YOUR-BRANCH` after checking your work; never force push a team `main`.
