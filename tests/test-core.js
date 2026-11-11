const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const context = {window: {}, console, document: {getElementById: () => null}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/data.js','utf8'), context);
vm.runInContext(fs.readFileSync('js/app.js','utf8'), context);
const movies = context.window.CINEQUEST_MOVIES;
const core = context.window.CineQuestCore;
assert.equal(movies.length, 120, '120 movies in dataset');
assert.equal(new Set(movies.map(m => m.id)).size, 120, 'all ids unique');
for (const cat of ['Hindi', 'English', 'Animated']) {
 const list = movies.filter(m => m.category === cat);
 assert.equal(list.length,40, `${cat} includes 40`);
 const first = core.questionSet(list,20,[]);
 assert.equal(new Set(first.map(m=>m.id)).size,20);
 const second = core.questionSet(list,20,first.map(m=>m.id));
 assert.equal(second.filter(m=>first.some(x=>x.id===m.id)).length,0, 'next round avoids recent movies');
}
for (const m of movies) {
 const opts = core.choicesFor(m,movies);
 assert.equal(opts.length,4);
 assert.equal(new Set(opts.map(x=>x.id)).size,4);
 assert.equal(opts.filter(x=>x.id===m.id).length,1);
 assert(fs.existsSync(`assets/posters/${m.id}.svg`),`missing art for ${m.id}`);
}
const stats = core.computeStats([{outcome:'correct',points:100},{outcome:'wrong',points:0},{outcome:'timeout',points:0},{outcome:'correct',points:70}]);
assert.equal(stats.points,170);assert.equal(stats.accuracy,50);assert.equal(stats.correct,2);
console.log('PASS: 120 movies, 120 clue images, randomization, 4 distinct choices, 20 unique questions, score accuracy.');
