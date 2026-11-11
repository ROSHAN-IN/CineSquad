# CINEQUEST — Guess the Movie: Picture Challenge

**College mini project 7** | Team: **Roshan (leader), Aman, Deepak, Aarav**

A cinematic web quiz with **120 movie records (40 Hindi + 40 English + 40 animated)** and **20 different questions per game**. After each round the next round in the same category prioritizes previously unseen films. One clue illustration per movie is stored locally, plus a optional second text hint.

## Run

Open `index.html` in Chrome / Safari or run a local dev server:

```bash
cd CineQuest-Ultimate
python3 -m http.server 5500
# Then visit http://localhost:5500
```

No `npm install`, API keys, backend or internet is required. Google Fonts is optional and falls back to system fonts when offline.

## Features

- Start screen, category selection (All/Hindi/English/Animated), difficulty settings
- 20 unique randomly selected questions each round from 120 films
- Four randomized multiple-choice movie titles; one answer per question
- Offline original illustrated clue image for each movie (120 SVGs)
- Optional hints with 30-point penalty; answers award 100/70 points
- Timer per question: 30s easy, 20s standard, 12s extreme
- Score, streak, remaining time, progress bar, reveal correct answer
- Sound effects generated in-browser using Web Audio, no external audio assets
- Results, answer review, best score stored locally, confetti and animations
- Mobile responsive; toggle sound / reduce motion; 1–4 keyboard shortcuts

**Photo note:** Images included are **original symbolic movie-themed clue illustrations, not official movie photographs or posters**. If your teacher requires actual movie photographs, use your own or properly permitted photo files as described in `docs/PHOTO_GUIDE.md`. Never claim the SVGs are movie stills.

## Team ownership

| Person | Files | What to improve in their own branch |
|---|---|---|
| Roshan (leader) | README.md, docs/, tests/ | Repository, architecture, test cases, PR reviews, final demo |
| Aman | index.html | Accessible structure, onboarding, categories and results markup |
| Deepak | css/style.css | Theme, responsive experience, transitions and motion polish |
| Aarav | js/app.js, js/data.js | Game logic, question selection, scoring, question content |

Do not merely rename a file or create empty commits. Every member should make genuine, reviewable edits and explain them.

## Tests

With Node.js installed:

```bash
node --check js/app.js
node --check js/data.js
node tests/test-core.js
```

Then play an entire 20-question game in the browser. Check at 375px mobile width and on desktop.

## Project structure

```text
CineQuest-Ultimate/
├── index.html              # Aman
├── css/style.css           # Deepak
├── js/app.js               # Aarav
├── js/data.js              # Aarav — movie database
├── assets/posters/         # 120 offline SVG clue illustrations
├── tests/test-core.js      # Roshan
├── docs/TEAM_WORKFLOW.md   # Roshan
├── docs/PHOTO_GUIDE.md
├── docs/DEMO_SCRIPT.md
└── README.md
```

## Scoring

- Correct answer without hint: **100 pts**
- Correct answer with hint: **70 pts**
- Wrong or timeout: **0 pts**
- Total possible per round: **2,000 pts**
- Session best: browser localStorage; not a shared online leaderboard

## Submission

Push the team repository to GitHub, create **genuine feature branches / individual commits / Pull Requests** for Aman, Deepak, Aarav and Roshan, review and merge to `main`, verify `index.html` works, and submit the repository URL. Instructor review and deadline: **12 November 2026**, according to the class abstract.
