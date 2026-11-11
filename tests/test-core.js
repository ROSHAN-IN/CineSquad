
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const context = {
  window: {},
  console,
  document: {
    getElementById: () => null
  }
};

vm.createContext(context);

vm.runInContext(
  fs.readFileSync("js/data.js", "utf8"),
  context
);

vm.runInContext(
  fs.readFileSync("js/app.js", "utf8"),
  context
);

const movies = context.window.CINEQUEST_MOVIES;
const core = context.window.CineQuestCore;

let passed = 0;

function test(name, callback) {
  callback();
  passed++;
  console.log(`✅ ${name}`);
}

// TEST 1: MOVIE DATABASE
test("Database contains exactly 120 movies", () => {
  assert.equal(movies.length, 120);
});

// TEST 2: UNIQUE MOVIE IDS
test("Every movie has a unique ID", () => {
  assert.equal(
    new Set(movies.map(movie => movie.id)).size,
    120
  );
});

// TEST 3: THREE CATEGORIES
test("Each category contains 40 movies", () => {
  for (const category of ["Hindi", "English", "Animated"]) {
    const categoryMovies = movies.filter(
      movie => movie.category === category
    );

    assert.equal(categoryMovies.length, 40);
  }
});

// TEST 4: MOVIE IMAGES
test("Every movie has a picture clue", () => {
  for (const movie of movies) {
    assert.ok(
      fs.existsSync(`assets/posters/${movie.id}.svg`),
      `Missing image: ${movie.id}`
    );
  }
});

// TEST 5: EXACTLY 20 QUESTIONS
test("Each game generates 20 questions", () => {
  const questions = core.questionSet(movies, 20, []);

  assert.equal(questions.length, 20);
});

// TEST 6: NO DUPLICATE QUESTIONS
test("Questions do not repeat within a game", () => {
  const questions = core.questionSet(movies, 20, []);

  assert.equal(
    new Set(questions.map(q => q.id)).size,
    20
  );
});

// TEST 7: NEW ROUND ROTATION
test("New round avoids previously played movies", () => {
  const firstRound = core.questionSet(movies, 20, []);

  const secondRound = core.questionSet(
    movies,
    20,
    firstRound.map(movie => movie.id)
  );

  const firstIds = new Set(
    firstRound.map(movie => movie.id)
  );

  assert.equal(
    secondRound.filter(movie => firstIds.has(movie.id)).length,
    0
  );
});

// TEST 8: EACH CATEGORY WORKS
test("All categories support 20-question rounds", () => {
  for (const category of ["Hindi", "English", "Animated"]) {
    const pool = movies.filter(
      movie => movie.category === category
    );

    const questions = core.questionSet(pool, 20, []);
    assert.equal(questions.length, 20);

    const nextRound = core.questionSet(
      pool,
      20,
      questions.map(movie => movie.id)
    );

    const previousIds = new Set(
      questions.map(movie => movie.id)
    );

    assert.equal(
      nextRound.filter(movie => previousIds.has(movie.id)).length,
      0
    );
  }
});

// TEST 9: FOUR UNIQUE OPTIONS
test("Every question provides four unique options", () => {
  for (const movie of movies) {
    const options = core.choicesFor(movie, movies);

    assert.equal(options.length, 4);

    assert.equal(
      new Set(options.map(option => option.id)).size,
      4
    );
  }
});

// TEST 10: CORRECT ANSWER PRESENT
test("Correct answer appears exactly once", () => {
  for (const movie of movies) {
    const options = core.choicesFor(movie, movies);

    assert.equal(
      options.filter(option => option.id === movie.id).length,
      1
    );
  }
});

// TEST 11: SCORE CALCULATION
test("Score calculation works correctly", () => {
  const results = [
    { outcome: "correct", points: 100 },
    { outcome: "correct", points: 70 },
    { outcome: "wrong", points: 0 },
    { outcome: "timeout", points: 0 }
  ];

  const stats = core.computeStats(results);

  assert.equal(stats.points, 170);
  assert.equal(stats.correct, 2);
  assert.equal(stats.wrong, 1);
  assert.equal(stats.skipped, 1);
  assert.equal(stats.accuracy, 50);
});

// TEST 12: ZERO SCORE
test("All incorrect answers produce zero points", () => {
  const results = Array.from({ length: 20 }, () => ({
    outcome: "wrong",
    points: 0
  }));

  const stats = core.computeStats(results);

  assert.equal(stats.points, 0);
  assert.equal(stats.correct, 0);
  assert.equal(stats.accuracy, 0);
});

// TEST 13: PERFECT SCORE
test("Twenty correct answers produce perfect score", () => {
  const results = Array.from({ length: 20 }, () => ({
    outcome: "correct",
    points: 100
  }));

  const stats = core.computeStats(results);

  assert.equal(stats.points, 2000);
  assert.equal(stats.correct, 20);
  assert.equal(stats.accuracy, 100);
});

// TEST 14: HINT PENALTY
test("Hint penalty reduces points correctly", () => {
  const stats = core.computeStats([
    { outcome: "correct", points: 70 }
  ]);

  assert.equal(stats.points, 70);
});

// TEST 15: EMPTY RESULTS
test("Empty results do not cause calculation errors", () => {
  const stats = core.computeStats([]);

  assert.equal(stats.points, 0);
  assert.equal(stats.correct, 0);
  assert.equal(stats.accuracy, 0);
});

console.log("\n================================");
console.log(`🎬 CINESQUAD: ${passed}/15 TESTS PASSED`);
console.log("================================");
