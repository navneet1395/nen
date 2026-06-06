// Filesystem helpers: every run is saved under bench/results/<timestamp>/ and
// also mirrored to bench/results/latest/ for easy linking.
const fs = require('fs');
const path = require('path');

const RESULTS_ROOT = path.join(__dirname, '..', 'results');

function runStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function newRunDir(stamp = runStamp()) {
  const dir = path.join(RESULTS_ROOT, stamp);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, stamp };
}

function saveJSON(dir, name, obj) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

function saveText(dir, name, text) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, text);
  return p;
}

/** Copy a finished run dir's files into results/latest/. */
function mirrorLatest(dir) {
  const latest = path.join(RESULTS_ROOT, 'latest');
  fs.mkdirSync(latest, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    fs.copyFileSync(path.join(dir, f), path.join(latest, f));
  }
  return latest;
}

module.exports = { RESULTS_ROOT, runStamp, newRunDir, saveJSON, saveText, mirrorLatest };
