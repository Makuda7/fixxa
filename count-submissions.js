const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'submissions.json');

if (!fs.existsSync(dataFile)) {
  console.log("No submissions yet.");
  process.exit();
}

const submissions = JSON.parse(fs.readFileSync(dataFile));
const workerCounts = {};

submissions.forEach(sub => {
  workerCounts[sub.workerId] = (workerCounts[sub.workerId] || 0) + 1;
});

console.log("Submissions per worker:", workerCounts);
