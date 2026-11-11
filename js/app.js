/* CineQuest • game engine. Aarav: logic; Roshan: integration and review.
   No frameworks or network required; runs on file:// and GitHub Pages. */
(() => {
  'use strict';
  const movies = window.CINEQUEST_MOVIES || [];
  const $ = (id) => document.getElementById(id);
  const QUESTION_COUNT = 20;
  const POINTS = 100;
  const DIFFICULTIES = {
    easy: { seconds: 30 }, normal: { seconds: 20 }, hard: { seconds: 12 },
  };

  // Pure helpers are separately testable in tests/test-core.js.
  function shuffle(items, random = Math.random) {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  function questionSet(pool, count = 20, excludedIds = [], random = Math.random) {
    const unique = [...new Map(pool.map(m => [m.id, m])).values()];
    if (unique.length < count) throw Error(`Need ${count} movies; found ${unique.length}`);
    const excluded = new Set(excludedIds);
    // Prefer films not played in the last round; revisit only when necessary.
    const fresh = shuffle(unique.filter(m => !excluded.has(m.id)), random);
    const previous = shuffle(unique.filter(m => excluded.has(m.id)), random);
    return [...fresh, ...previous].slice(0, count);
  }
  function choicesFor(movie, allMovies, random = Math.random) {
    const peers = allMovies.filter(m => m.id !== movie.id && m.category === movie.category);
    const fallback = allMovies.filter(m => m.id !== movie.id && m.category !== movie.category);
    return shuffle([movie, ...shuffle(peers, random).concat(shuffle(fallback, random)).slice(0, 3)], random);
  }
  function computeStats(answers) {
    const correct = answers.filter(a => a.outcome === 'correct').length;
    const wrong = answers.filter(a => a.outcome === 'wrong').length;
    const skipped = answers.filter(a => a.outcome === 'timeout').length;
    return { correct, wrong, skipped, total: answers.length, accuracy: answers.length ? Math.round(correct / answers.length * 100) : 0,
      points: answers.reduce((total, a) => total + (a.points || 0), 0) };
  }
  window.CineQuestCore = { shuffle, questionSet, choicesFor, computeStats };
  if (!movies.length || !$('startBtn')) return;

  let selectedCategory = 'All';
  let selectedDifficulty = 'normal';
  let questions = [], records = [], index = 0, score = 0, streak = 0;
  let answered = false, hintUsed = false, timerId = null, nextTimeout = null;
  let endsAt = 0, secondsLeft = 20;
  let timerWarningPlayed = false;
  let soundOn = getPreference('cinequest:sound', true);
  let motionOn = getPreference('cinequest:motion', true);
  let audioContext = null;
  const screens = ['homeScreen', 'setupScreen', 'gameScreen', 'resultScreen'];

  function getPreference(key, fallback) {
    try { const stored = localStorage.getItem(key); return stored === null ? fallback : stored === 'true'; }
    catch { return fallback; }
  }
  function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function writeStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browser */ } }
  function view(id) {
    stopClock();
    clearTimeout(nextTimeout);
    screens.forEach(s => $(s).classList.toggle('hidden', s !== id));
    window.scrollTo({top: 0, behavior:'instant'});
  }
  function sound(type) {
    if (!soundOn) return;
    try {
      audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const tones = {
        click: [[460, 0, .06]], correct: [[523, 0, .11], [659, .12, .11], [784, .24, .17]],
        wrong: [[240, 0, .17], [160, .16, .19]], hint: [[690, 0, .08], [830, .1, .11]],
        win: [[523, 0, .12], [659, .14, .12], [784, .3, .12], [1046, .45, .25]]
        tick: [[880, 0, 0.08]],
      };
      for (const [freq, offset, duration] of (tones[type] || tones.click)) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = audioContext.currentTime + offset;
        osc.type = type === 'wrong' ? 'sawtooth' : 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(.12, start + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(start); osc.stop(start + duration + .015);
      }
    } catch { /* audio is optional */ }
  }
  function setToggleButtons() {
    $('soundBtn').textContent = soundOn ? '🔊' : '🔇';
    $('soundBtn').setAttribute('aria-pressed', String(soundOn));
    $('motionBtn').textContent = motionOn ? '✦' : '◌';
    $('motionBtn').setAttribute('aria-pressed', String(motionOn));
    document.documentElement.classList.toggle('reduce-motion', !motionOn);
  }
  function selectItem(wrapperId, attribute, value) {
    document.querySelectorAll(`#${wrapperId} [${attribute}]`).forEach(button => {
      const active = button.dataset[attribute.replace('data-', '').replace(/-([a-z])/g, (_,x) => x.toUpperCase())] === value;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function openSetup() { sound('click'); view('setupScreen'); }
  function openHome() { sound('click'); view('homeScreen'); }
  function buildGame() {
    const eligible = selectedCategory === 'All' ? movies : movies.filter(movie => movie.category === selectedCategory);
    const memoryKey = `cinequest:recent:${selectedCategory}`;
    const previous = readStore(memoryKey, []);
    questions = questionSet(eligible, QUESTION_COUNT, previous);
    writeStore(memoryKey, questions.map(m => m.id));
    index = 0; score = 0; streak = 0; records = [];
    sound('click'); view('gameScreen'); drawQuestion();
  }
  function currentMovie() { return questions[index]; }
  function stopClock() { if (timerId !== null) clearInterval(timerId); timerId = null; }
  function updateTimer() {
    if (answered) return;
    secondsLeft = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
    $('timerValue').textContent = secondsLeft + 's';
    $('timerPanel').classList.toggle('danger', secondsLeft <= 5);
    if (secondsLeft <= 5 &&
    secondsLeft > 0 &&
    !timerWarningPlayed) {
  timerWarningPlayed = true;
  sound('tick');
}
    if (secondsLeft === 0) finishAnswer('timeout');
  }
  function startClock() {
    stopClock();
    timerWarningPlayed = false;
    secondsLeft = DIFFICULTIES[selectedDifficulty].seconds;
    endsAt = performance.now() + secondsLeft * 1000;
    $('timerValue').textContent = secondsLeft + 's';
    $('timerPanel').classList.remove('danger');
    timerId = setInterval(updateTimer, 150);
  }
  function drawQuestion() {
    answered = false; hintUsed = false;
    clearTimeout(nextTimeout);
    const movie = currentMovie();
    $('questionNumber').textContent = String(index + 1).padStart(2,'0');
    $('scoreValue').textContent = score;
    $('streakValue').textContent = streak + ' 🔥';
    $('progressFill').style.width = ((index / QUESTION_COUNT) * 100) + '%';
    $('genreBadge').textContent = movie.category.toUpperCase() + ' CINEMA';
    $('hintText').classList.add('hidden');
    $('hintText').textContent = '';
    $('hintBtn').disabled = false;
    $('hintBtn').innerHTML = '💡 REVEAL HINT <small>−30 PTS</small>';
    $('feedback').className = 'feedback';
    $('feedback').textContent = 'Look at the picture clues, then choose one answer.';
    $('nextBtn').classList.add('hidden');
    $('nextBtn').textContent = index === QUESTION_COUNT - 1 ? 'SEE MY RESULTS →' : 'NEXT QUESTION →';
    const art = `assets/posters/${movie.id}.svg`;
    // Replace an .svg with your own licensed .jpg and change poster to that path in data.js if desired.
    $('clueImage').src = movie.poster || art;
    $('clueImage').alt = `Two visual clues for a ${movie.category.toLowerCase()} movie; guess the title`;
    const buttons = choicesFor(movie, movies);
    const answers = $('answers');
    answers.replaceChildren();
    for (const [choiceIndex, choice] of buttons.entries()) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'answer';
      button.dataset.movieId = choice.id;
      const letter = document.createElement('span');
      letter.className = 'option-letter'; letter.textContent = 'ABCD'[choiceIndex];
      const title = document.createElement('span'); title.textContent = choice.title;
      button.append(letter, title);
      button.addEventListener('click', () => finishAnswer('choice', choice.id));
      answers.append(button);
    }
    startClock();
  }
  function revealHint() {
    if (answered || hintUsed) return;
    hintUsed = true;
    $('hintText').textContent = `Released ${currentMovie().year} · ${currentMovie().hint}`;
    $('hintText').classList.remove('hidden');
    $('hintBtn').disabled = true;
    $('hintBtn').textContent = 'HINT USED ✓';
    sound('hint');
  }
  function finishAnswer(method, choiceId = null) {
    if (answered) return;
    answered = true;
    stopClock();
    const movie = currentMovie();
    const correct = method === 'choice' && movie.id === choiceId;
    const outcome = method === 'timeout' ? 'timeout' : correct ? 'correct' : 'wrong';
    const points = correct ? POINTS - (hintUsed ? 30 : 0) : 0;
    score += points;
    streak = correct ? streak + 1 : 0;
    records.push({movie: movie.title, outcome, points, chosen: choiceId ? movies.find(m => m.id === choiceId)?.title : null});
    $('scoreValue').textContent = score;
    $('streakValue').textContent = streak + ' 🔥';
    document.querySelectorAll('#answers .answer').forEach(button => {
      button.disabled = true;
      if (button.dataset.movieId === movie.id) button.classList.add('correct');
      else if (choiceId === button.dataset.movieId) button.classList.add('wrong');
    });
    $('hintBtn').disabled = true;
    $('feedback').className = 'feedback ' + (correct ? 'ok' : 'bad');
    $('feedback').textContent = correct
      ? `✓ Correct! +${points} points${hintUsed ? ' (hint used)' : ''}.`
      : outcome === 'timeout' ? `⏰ Time's up! Correct: ${movie.title}.` : `✕ Not quite! Correct: ${movie.title}.`;
    $('nextBtn').classList.remove('hidden');
    sound(correct ? 'correct' : 'wrong');
    if (correct && streak >= 3) confetti(16);
    if (outcome === 'timeout') nextTimeout = setTimeout(nextQuestion, 1600);
  }
  function nextQuestion() {
    if (!answered || $('gameScreen').classList.contains('hidden')) return;
    clearTimeout(nextTimeout);
    index++;
    if (index >= QUESTION_COUNT) showResult();
    else drawQuestion();
  }
  function showResult() {
    view('resultScreen');
    const stats = computeStats(records);
    const max = QUESTION_COUNT * POINTS;
    $('finalScore').textContent = stats.points;
    $('correctCount').textContent = stats.correct;
    $('wrongCount').textContent = stats.wrong;
    $('skippedCount').textContent = stats.skipped;
    $('accuracyValue').textContent = stats.accuracy + '%';
    $('resultTitle').textContent = stats.accuracy >= 85 ? 'CINEMA LEGEND!' : stats.accuracy >= 60 ? 'MOVIE BUFF ENERGY!' : 'THE SHOW GOES ON!';
    $('resultSubtitle').textContent = `You cracked ${stats.correct} out of ${QUESTION_COUNT} movie mysteries.`;
    const key = `cinequest:best:${selectedCategory}:${selectedDifficulty}`;
    const oldBest = Number(readStore(key, 0));
    if (stats.points > oldBest) { writeStore(key, stats.points); $('recordText').textContent = '★ NEW PERSONAL BEST!'; }
    else { $('recordText').textContent = `★ PERSONAL BEST: ${oldBest} / ${max}`; }
    const review = $('review'); review.replaceChildren();
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'VIEW ALL 20 ANSWERS ▾';
    details.append(summary);
    for (const [i, result] of records.entries()) {
      const line = document.createElement('div'); line.className = 'review-line';
      const number = document.createElement('span'); number.textContent = String(i + 1).padStart(2,'0');
      const name = document.createElement('strong'); name.textContent = result.movie;
      const outcome = document.createElement('span');
      outcome.textContent = (result.outcome === 'correct' ? '✓ +' + result.points : result.outcome === 'wrong' ? '✕' : '⏰');
      line.append(number, name, outcome); details.append(line);
    }
    review.append(details);
    if (stats.correct >= 12) { sound('win'); confetti(90); }
  }
  function confetti(count) {
    if (!motionOn) return;
    const container = $('confetti');
    const palette = ['#ff4e7b','#f5be54','#64e6e0','#ab71ff','#ffffff'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span'); el.className = 'piece';
      el.style.left = (Math.random() * 100) + '%';
      el.style.background = palette[i % palette.length];
      el.style.animationDelay = (Math.random() * .6) + 's';
      el.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      container.append(el);
      el.addEventListener('animationend', () => el.remove(), {once: true});
    }
  }
  $('movieCount').textContent = movies.length;
  setToggleButtons();
  $('soundBtn').addEventListener('click', () => { soundOn = !soundOn; writeStore('cinequest:sound', soundOn); setToggleButtons(); sound('click'); });
  $('motionBtn').addEventListener('click', () => { motionOn = !motionOn; writeStore('cinequest:motion', motionOn); setToggleButtons(); });
  $('startBtn').addEventListener('click', openSetup);
  $('backHomeBtn').addEventListener('click', openHome);
  $('brand').addEventListener('click', (event) => { event.preventDefault(); if (confirm('Return home? Your current game progress will be lost.')) openHome(); });
  $('categoryGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-category]'); if (!button) return;
    selectedCategory = button.dataset.category;
    selectItem('categoryGrid', 'data-category', selectedCategory); sound('click');
  });
  $('difficultyGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-difficulty]'); if (!button) return;
    selectedDifficulty = button.dataset.difficulty;
    selectItem('difficultyGrid', 'data-difficulty', selectedDifficulty); sound('click');
  });
  $('launchBtn').addEventListener('click', buildGame);
  $('hintBtn').addEventListener('click', revealHint);
  $('nextBtn').addEventListener('click', nextQuestion);
  $('quitBtn').addEventListener('click', () => { if (confirm('Quit this round? Your progress will be lost.')) openHome(); });
  $('playAgainBtn').addEventListener('click', buildGame);
  $('changeCategoryBtn').addEventListener('click', openSetup);
  $('rulesBtn').addEventListener('click', () => $('rulesDialog').showModal());
  $('closeRulesBtn').addEventListener('click', () => $('rulesDialog').close());
  $('rulesPlayBtn').addEventListener('click', () => { $('rulesDialog').close(); openSetup(); });
  $('rulesDialog').addEventListener('click', event => { if (event.target === $('rulesDialog')) $('rulesDialog').close(); });
  document.addEventListener('keydown', event => {
    if ($('gameScreen').classList.contains('hidden') || !$('rulesDialog').open) {
      if (!$('gameScreen').classList.contains('hidden') && !event.altKey && !event.metaKey && !event.ctrlKey) {
        if (!answered && /^[1-4]$/.test(event.key)) {
          const button = $('answers').children[Number(event.key) - 1]; button?.click();
        }
        if (answered && event.key === 'Enter') { event.preventDefault(); nextQuestion(); }
        if (!answered && event.key.toLowerCase() === 'h') revealHint();
      }
    }
  });
})();
