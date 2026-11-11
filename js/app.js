
/*
  CINESQUAD — GUESS THE MOVIE
  Project 7: Movie Picture Challenge

  Team:
  Roshan — Team Leader & Testing
  Aman — HTML Developer
  Deepak — CSS & Animations
  Aarav — JavaScript Developer

  Features:
  - 120 movies
  - 20 random questions per game
  - 4 multiple-choice answers
  - 3 difficulty levels
  - Countdown timer
  - Final 5-second warning sound
  - Hint system
  - Automatic scoring
  - Confetti effects
  - Personal best
  - Play Again
*/

(() => {
  "use strict";

  // ========================================
  // 1. GAME CONFIGURATION
  // ========================================

  const movies = window.CINEQUEST_MOVIES || [];

  const $ = (id) => document.getElementById(id);

  const QUESTION_COUNT = 20;
  const POINTS = 100;

  const DIFFICULTIES = {
    easy: { seconds: 30 },
    normal: { seconds: 20 },
    hard: { seconds: 12 }
  };

  // ========================================
  // 2. RANDOM MOVIE SELECTION
  // ========================================

  function shuffle(items, random = Math.random) {
    const array = [...items];

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));

      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  function questionSet(
    pool,
    count = 20,
    excludedIds = [],
    random = Math.random
  ) {
    const unique = [
      ...new Map(
        pool.map((movie) => [movie.id, movie])
      ).values()
    ];

    if (unique.length < count) {
      throw new Error(
        `Need ${count} movies; found ${unique.length}`
      );
    }

    const excluded = new Set(excludedIds);

    const fresh = shuffle(
      unique.filter((movie) => !excluded.has(movie.id)),
      random
    );

    const previous = shuffle(
      unique.filter((movie) => excluded.has(movie.id)),
      random
    );

    return [...fresh, ...previous].slice(0, count);
  }

  // ========================================
  // 3. GENERATE FOUR ANSWER OPTIONS
  // ========================================

  function choicesFor(
    movie,
    allMovies,
    random = Math.random
  ) {
    const peers = allMovies.filter(
      (item) =>
        item.id !== movie.id &&
        item.category === movie.category
    );

    const fallback = allMovies.filter(
      (item) =>
        item.id !== movie.id &&
        item.category !== movie.category
    );

    const incorrect = shuffle(peers, random)
      .concat(shuffle(fallback, random))
      .slice(0, 3);

    return shuffle([movie, ...incorrect], random);
  }

  // ========================================
  // 4. SCORE CALCULATION
  // ========================================

  function computeStats(answers) {
    const correct = answers.filter(
      (answer) => answer.outcome === "correct"
    ).length;

    const wrong = answers.filter(
      (answer) => answer.outcome === "wrong"
    ).length;

    const skipped = answers.filter(
      (answer) => answer.outcome === "timeout"
    ).length;

    const points = answers.reduce(
      (total, answer) => total + (answer.points || 0),
      0
    );

    const accuracy = answers.length
      ? Math.round((correct / answers.length) * 100)
      : 0;

    return {
      correct,
      wrong,
      skipped,
      total: answers.length,
      points,
      accuracy
    };
  }

  // Expose helper functions for automated testing
  window.CineQuestCore = {
    shuffle,
    questionSet,
    choicesFor,
    computeStats
  };

  // Stop DOM setup during Node.js unit tests
  if (!movies.length || !$("startBtn")) {
    return;
  }

  // ========================================
  // 5. GAME STATE
  // ========================================

  let selectedCategory = "All";
  let selectedDifficulty = "normal";

  let questions = [];
  let records = [];

  let index = 0;
  let score = 0;
  let streak = 0;

  let answered = false;
  let hintUsed = false;

  let timerId = null;
  let nextTimeout = null;

  let endsAt = 0;
  let secondsLeft = 20;

  // Aarav's timer warning improvement
  let timerWarningPlayed = false;

  let soundOn = getPreference(
    "cinequest:sound",
    true
  );

  let motionOn = getPreference(
    "cinequest:motion",
    true
  );

  let audioContext = null;

  const screens = [
    "homeScreen",
    "setupScreen",
    "gameScreen",
    "resultScreen"
  ];

  // ========================================
  // 6. LOCAL STORAGE
  // ========================================

  function getPreference(key, fallback) {
    try {
      const stored = localStorage.getItem(key);

      return stored === null
        ? fallback
        : stored === "true";
    } catch {
      return fallback;
    }
  }

  function readStore(key, fallback) {
    try {
      return JSON.parse(
        localStorage.getItem(key)
      ) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {
      // Storage may be unavailable
    }
  }

  // ========================================
  // 7. SCREEN NAVIGATION
  // ========================================

  function view(id) {
    stopClock();
    clearTimeout(nextTimeout);

    screens.forEach((screen) => {
      $(screen).classList.toggle(
        "hidden",
        screen !== id
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }

  // ========================================
  // 8. SOUND EFFECT ENGINE
  // ========================================

  function sound(type) {
    if (!soundOn) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) return;

      audioContext ??= new AudioContextClass();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Corrected syntax: every sound entry
      // is separated by a comma.
      const tones = {
        click: [
          [460, 0, 0.06]
        ],

        correct: [
          [523, 0, 0.11],
          [659, 0.12, 0.11],
          [784, 0.24, 0.17]
        ],

        wrong: [
          [240, 0, 0.17],
          [160, 0.16, 0.19]
        ],

        hint: [
          [690, 0, 0.08],
          [830, 0.1, 0.11]
        ],

        win: [
          [523, 0, 0.12],
          [659, 0.14, 0.12],
          [784, 0.3, 0.12],
          [1046, 0.45, 0.25]
        ],

        tick: [
          [880, 0, 0.08]
        ]
      };

      const notes = tones[type] || tones.click;

      for (const [frequency, offset, duration] of notes) {
        const oscillator =
          audioContext.createOscillator();

        const gain =
          audioContext.createGain();

        const start =
          audioContext.currentTime + offset;

        oscillator.type =
          type === "wrong" ? "sawtooth" : "sine";

        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(
          0.0001,
          start
        );

        gain.gain.exponentialRampToValueAtTime(
          0.12,
          start + 0.015
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          start + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(start);
        oscillator.stop(start + duration + 0.015);
      }
    } catch {
      // Sound is optional
    }
  }

  // ========================================
  // 9. SOUND AND MOTION TOGGLES
  // ========================================

  function setToggleButtons() {
    $("soundBtn").textContent =
      soundOn ? "🔊" : "🔇";

    $("soundBtn").setAttribute(
      "aria-pressed",
      String(soundOn)
    );

    $("motionBtn").textContent =
      motionOn ? "✦" : "◌";

    $("motionBtn").setAttribute(
      "aria-pressed",
      String(motionOn)
    );

    document.documentElement.classList.toggle(
      "reduce-motion",
      !motionOn
    );
  }

  // ========================================
  // 10. CATEGORY AND DIFFICULTY
  // ========================================

  function selectItem(wrapperId, attribute, value) {
    const buttons = document.querySelectorAll(
      `#${wrapperId} [${attribute}]`
    );

    buttons.forEach((button) => {
      const property = attribute
        .replace("data-", "")
        .replace(
          /-([a-z])/g,
          (_, letter) => letter.toUpperCase()
        );

      const active =
        button.dataset[property] === value;

      button.classList.toggle("selected", active);

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });
  }

  function openSetup() {
    sound("click");
    view("setupScreen");
  }

  function openHome() {
    sound("click");
    view("homeScreen");
  }

  // ========================================
  // 11. START NEW GAME
  // ========================================

  function buildGame() {
    const eligible =
      selectedCategory === "All"
        ? movies
        : movies.filter(
            (movie) =>
              movie.category === selectedCategory
          );

    const memoryKey =
      `cinequest:recent:${selectedCategory}`;

    const previous = readStore(memoryKey, []);

    questions = questionSet(
      eligible,
      QUESTION_COUNT,
      previous
    );

    writeStore(
      memoryKey,
      questions.map((movie) => movie.id)
    );

    index = 0;
    score = 0;
    streak = 0;
    records = [];

    sound("click");
    view("gameScreen");

    drawQuestion();
  }

  function currentMovie() {
    return questions[index];
  }

  // ========================================
  // 12. COUNTDOWN TIMER
  // ========================================

  function stopClock() {
    if (timerId !== null) {
      clearInterval(timerId);
    }

    timerId = null;
  }

  function updateTimer() {
    if (answered) return;

    secondsLeft = Math.max(
      0,
      Math.ceil(
        (endsAt - performance.now()) / 1000
      )
    );

    $("timerValue").textContent =
      secondsLeft + "s";

    $("timerPanel").classList.toggle(
      "danger",
      secondsLeft <= 5
    );

    // Warning sound once in the final 5 seconds
    if (
      secondsLeft <= 5 &&
      secondsLeft > 0 &&
      !timerWarningPlayed
    ) {
      timerWarningPlayed = true;
      sound("tick");
    }

    if (secondsLeft === 0) {
      finishAnswer("timeout");
    }
  }

  function startClock() {
    stopClock();

    timerWarningPlayed = false;

    secondsLeft =
      DIFFICULTIES[selectedDifficulty].seconds;

    endsAt =
      performance.now() + secondsLeft * 1000;

    $("timerValue").textContent =
      secondsLeft + "s";

    $("timerPanel").classList.remove("danger");

    timerId = setInterval(
      updateTimer,
      150
    );
  }

  // ========================================
  // 13. DISPLAY MOVIE QUESTION
  // ========================================

  function drawQuestion() {
    answered = false;
    hintUsed = false;

    clearTimeout(nextTimeout);

    const movie = currentMovie();

    $("questionNumber").textContent =
      String(index + 1).padStart(2, "0");

    $("scoreValue").textContent = score;

    $("streakValue").textContent =
      streak + " 🔥";

    $("progressFill").style.width =
      ((index / QUESTION_COUNT) * 100) + "%";

    $("genreBadge").textContent =
      movie.category.toUpperCase() + " CINEMA";

    $("hintText").classList.add("hidden");
    $("hintText").textContent = "";

    $("hintBtn").disabled = false;

    $("hintBtn").innerHTML =
      "💡 REVEAL HINT <small>−30 PTS</small>";

    $("feedback").className = "feedback";

    $("feedback").textContent =
      "Look at the picture clues, then choose one answer.";

    $("nextBtn").classList.add("hidden");

    $("nextBtn").textContent =
      index === QUESTION_COUNT - 1
        ? "SEE MY RESULTS →"
        : "NEXT QUESTION →";

    // Movie illustration
    const imagePath =
      `assets/posters/${movie.id}.svg`;

    $("clueImage").src =
      movie.poster || imagePath;

    $("clueImage").alt =
      `Visual clues for a ${movie.category.toLowerCase()} movie`;

    // Four multiple-choice options
    const buttons = choicesFor(movie, movies);

    const answers = $("answers");

    answers.replaceChildren();

    buttons.forEach((choice, choiceIndex) => {
      const button =
        document.createElement("button");

      button.type = "button";
      button.className = "answer";

      button.dataset.movieId = choice.id;

      const letter =
        document.createElement("span");

      letter.className = "option-letter";

      letter.textContent =
        "ABCD"[choiceIndex];

      const title =
        document.createElement("span");

      title.textContent = choice.title;

      button.append(letter, title);

      button.addEventListener("click", () => {
        finishAnswer("choice", choice.id);
      });

      answers.append(button);
    });

    startClock();
  }

  // ========================================
  // 14. HINT SYSTEM
  // ========================================

  function revealHint() {
    if (answered || hintUsed) return;

    hintUsed = true;

    const movie = currentMovie();

    $("hintText").textContent =
      `Released ${movie.year} · ${movie.hint}`;

    $("hintText").classList.remove("hidden");

    $("hintBtn").disabled = true;
    $("hintBtn").textContent = "HINT USED ✓";

    sound("hint");
  }

  // ========================================
  // 15. CHECK USER ANSWER
  // ========================================

  function finishAnswer(
    method,
    choiceId = null
  ) {
    if (answered) return;

    answered = true;

    stopClock();

    const movie = currentMovie();

    const correct =
      method === "choice" &&
      movie.id === choiceId;

    const outcome =
      method === "timeout"
        ? "timeout"
        : correct
          ? "correct"
          : "wrong";

    const points = correct
      ? POINTS - (hintUsed ? 30 : 0)
      : 0;

    score += points;

    streak = correct ? streak + 1 : 0;

    const chosenMovie = choiceId
      ? movies.find(
          (item) => item.id === choiceId
        )
      : null;

    records.push({
      movie: movie.title,
      outcome,
      points,
      chosen: chosenMovie?.title || null
    });

    $("scoreValue").textContent = score;

    $("streakValue").textContent =
      streak + " 🔥";

    document.querySelectorAll(
      "#answers .answer"
    ).forEach((button) => {
      button.disabled = true;

      if (button.dataset.movieId === movie.id) {
        button.classList.add("correct");
      } else if (
        choiceId === button.dataset.movieId
      ) {
        button.classList.add("wrong");
      }
    });

    $("hintBtn").disabled = true;

    $("feedback").className =
      "feedback " + (correct ? "ok" : "bad");

    if (correct) {
      $("feedback").textContent =
        `✓ Correct! +${points} points` +
        (hintUsed ? " (hint used)." : ".");
    } else if (outcome === "timeout") {
      $("feedback").textContent =
        `⏰ Time's up! Correct: ${movie.title}.`;
    } else {
      $("feedback").textContent =
        `✕ Not quite! Correct: ${movie.title}.`;
    }

    $("nextBtn").classList.remove("hidden");

    sound(correct ? "correct" : "wrong");

    if (correct && streak >= 3) {
      confetti(16);
    }

    if (outcome === "timeout") {
      nextTimeout = setTimeout(
        nextQuestion,
        1600
      );
    }
  }

  // ========================================
  // 16. NEXT QUESTION
  // ========================================

  function nextQuestion() {
    if (
      !answered ||
      $("gameScreen").classList.contains("hidden")
    ) {
      return;
    }

    clearTimeout(nextTimeout);

    index++;

    if (index >= QUESTION_COUNT) {
      showResult();
    } else {
      drawQuestion();
    }
  }

  // ========================================
  // 17. FINAL RESULT SCREEN
  // ========================================

  function showResult() {
    view("resultScreen");

    const stats = computeStats(records);

    const max = QUESTION_COUNT * POINTS;

    $("finalScore").textContent =
      stats.points;

    $("correctCount").textContent =
      stats.correct;

    $("wrongCount").textContent =
      stats.wrong;

    $("skippedCount").textContent =
      stats.skipped;

    $("accuracyValue").textContent =
      stats.accuracy + "%";

    $("resultTitle").textContent =
      stats.accuracy >= 85
        ? "CINEMA LEGEND!"
        : stats.accuracy >= 60
          ? "MOVIE BUFF ENERGY!"
          : "THE SHOW GOES ON!";

    $("resultSubtitle").textContent =
      `You cracked ${stats.correct} out of ` +
      `${QUESTION_COUNT} movie mysteries.`;

    // Personal best record
    const key =
      `cinequest:best:${selectedCategory}:${selectedDifficulty}`;

    const oldBest = Number(
      readStore(key, 0)
    );

    if (stats.points > oldBest) {
      writeStore(key, stats.points);

      $("recordText").textContent =
        "★ NEW PERSONAL BEST!";
    } else {
      $("recordText").textContent =
        `★ PERSONAL BEST: ${oldBest} / ${max}`;
    }

    // Show answer review
    const review = $("review");

    review.replaceChildren();

    const details =
      document.createElement("details");

    const summary =
      document.createElement("summary");

    summary.textContent =
      "VIEW ALL 20 ANSWERS ▾";

    details.append(summary);

    records.forEach((result, i) => {
      const line =
        document.createElement("div");

      line.className = "review-line";

      const number =
        document.createElement("span");

      number.textContent =
        String(i + 1).padStart(2, "0");

      const name =
        document.createElement("strong");

      name.textContent = result.movie;

      const outcome =
        document.createElement("span");

      outcome.textContent =
        result.outcome === "correct"
          ? "✓ +" + result.points
          : result.outcome === "wrong"
            ? "✕"
            : "⏰";

      line.append(
        number,
        name,
        outcome
      );

      details.append(line);
    });

    review.append(details);

    if (stats.correct >= 12) {
      sound("win");
      confetti(90);
    }
  }

  // ========================================
  // 18. CONFETTI ANIMATIONS
  // ========================================

  function confetti(count) {
    if (!motionOn) return;

    const container = $("confetti");

    const colors = [
      "#ff4e7b",
      "#f5be54",
      "#64e6e0",
      "#ab71ff",
      "#ffffff"
    ];

    for (let i = 0; i < count; i++) {
      const piece =
        document.createElement("span");

      piece.className = "piece";

      piece.style.left =
        Math.random() * 100 + "%";

      piece.style.background =
        colors[i % colors.length];

      piece.style.animationDelay =
        Math.random() * 0.6 + "s";

      piece.style.animationDuration =
        1.8 + Math.random() * 1.8 + "s";

      container.append(piece);

      piece.addEventListener(
        "animationend",
        () => piece.remove(),
        { once: true }
      );
    }
  }

  // ========================================
  // 19. BUTTON EVENT LISTENERS
  // ========================================

  $("movieCount").textContent = movies.length;

  setToggleButtons();

  // Sound button
  $("soundBtn").addEventListener("click", () => {
    soundOn = !soundOn;

    writeStore("cinequest:sound", soundOn);

    setToggleButtons();

    sound("click");
  });

  // Motion button
  $("motionBtn").addEventListener("click", () => {
    motionOn = !motionOn;

    writeStore("cinequest:motion", motionOn);

    setToggleButtons();
  });

  // Start button
  $("startBtn").addEventListener(
    "click",
    openSetup
  );

  // Back home
  $("backHomeBtn").addEventListener(
    "click",
    openHome
  );

  // Brand logo
  $("brand").addEventListener("click", (event) => {
    event.preventDefault();

    if (confirm("Return home? Your current game progress will be lost.")) {
      openHome();
    }
  });

  // Select movie category
  $("categoryGrid").addEventListener("click", (event) => {
    const button =
      event.target.closest("[data-category]");

    if (!button) return;

    selectedCategory = button.dataset.category;

    selectItem(
      "categoryGrid",
      "data-category",
      selectedCategory
    );

    sound("click");
  });

  // Select difficulty
  $("difficultyGrid").addEventListener("click", (event) => {
    const button =
      event.target.closest("[data-difficulty]");

    if (!button) return;

    selectedDifficulty =
      button.dataset.difficulty;

    selectItem(
      "difficultyGrid",
      "data-difficulty",
      selectedDifficulty
    );

    sound("click");
  });

  // Launch game
  $("launchBtn").addEventListener(
    "click",
    buildGame
  );

  // Hint button
  $("hintBtn").addEventListener(
    "click",
    revealHint
  );

  // Next question
  $("nextBtn").addEventListener(
    "click",
    nextQuestion
  );

  // Quit game
  $("quitBtn").addEventListener("click", () => {
    if (confirm("Quit this round? Your progress will be lost.")) {
      openHome();
    }
  });

  // Play again
  $("playAgainBtn").addEventListener(
    "click",
    buildGame
  );

  // Change category
  $("changeCategoryBtn").addEventListener(
    "click",
    openSetup
  );

  // Rules dialog
  $("rulesBtn").addEventListener("click", () => {
    $("rulesDialog").showModal();
  });

  $("closeRulesBtn").addEventListener("click", () => {
    $("rulesDialog").close();
  });

  $("rulesPlayBtn").addEventListener("click", () => {
    $("rulesDialog").close();
    openSetup();
  });

  $("rulesDialog").addEventListener("click", (event) => {
    if (event.target === $("rulesDialog")) {
      $("rulesDialog").close();
    }
  });

  // ========================================
  // 20. KEYBOARD CONTROLS
  // ========================================

  document.addEventListener("keydown", (event) => {
    if (!$("rulesDialog").open &&
        !$("gameScreen").classList.contains("hidden") &&
        !event.altKey &&
        !event.metaKey &&
        !event.ctrlKey) {

      // 1, 2, 3, 4: choose answers
      if (!answered && /^[1-4]$/.test(event.key)) {
        const button = $("answers").children[
          Number(event.key) - 1
        ];

        button?.click();
      }

      // Enter: next question
      if (answered && event.key === "Enter") {
        event.preventDefault();
        nextQuestion();
      }

      // H: reveal hint
      if (
        !answered &&
        event.key.toLowerCase() === "h"
      ) {
        revealHint();
      }
    }
  });

})();
