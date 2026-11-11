# 4-member instructor demo script (suggested)

**Roshan (Team Leader, 60 seconds)**: "Our project is CineQuest, Guess the Movie. It has 120 film entries across Hindi, English and Animation. Each round randomly draws 20 unique questions. I organized GitHub, reviewed PRs, ran tests and integrated the final build." Open GitHub and point to 4 branches and merged Pull Requests.

**Aman (40 seconds)**: "I developed the semantic HTML structure: navigation, welcome page, category/difficulty selections, the accessible multiple-choice controls, the results and how-to-play dialog." Demo category switching and keyboard controls.

**Deepak (40 seconds)**: "I designed the responsive cinematic interface using CSS Grid, animated gradient backgrounds, game cards, progress, feedback colors and mobile layouts, while supporting reduced-motion preferences." Show desktop + mobile.

**Aarav (60 seconds)**: "I implemented the JS game engine: shuffle, avoiding repetition, four unique options, timers, one-time answer validation, hints, scoring, streaks, result stats and locally stored high scores." Demonstrate correct answer, wrong answer, hint and next question.

**Finish:** Show complete 20-question round and final results. If necessary use relaxed difficulty for the live demo and describe timer differences instead of letting every timer expire.

## Likely viva questions

- `document.getElementById` selects an HTML element.
- `addEventListener` runs code on clicks and key presses.
- `Math.random` powers Fisher–Yates shuffle; each round uses distinct IDs.
- `setInterval` updates a countdown; elapsed time is calculated with `performance.now`.
- `localStorage` stores the player's device-local best score and last question IDs; no server.
- CSS `@media` rules make the site responsive.
- `git switch -c` creates a feature branch, PR requests review before merge.
