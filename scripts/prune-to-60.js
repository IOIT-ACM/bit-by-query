// One-time (but re-runnable) trim of problems/aug2026.json down to the
// final 60-question competition set: the 50 locked-in easy/medium problems
// plus the 10 selected hard-tier problems, in difficulty order. The
// remaining 25 unused hard-pool candidates (already fixed/tested, just not
// selected) are archived rather than deleted, in case they're useful for a
// future event.

const fs = require("fs");

const problems = JSON.parse(fs.readFileSync("problems/aug2026.json", "utf-8"));
const byId = Object.fromEntries(problems.map((p) => [p.id, p]));

const easyMediumIds = [
  2, 5, 10, 18, 19, 22, 25, 28, 29, 32, 33, 34, 37, 40, 43, 44, 45, 46, 48, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65, 66, 67, 68, 69, 70, 71,
  73, 76, 77, 78, 79, 80, 81, 87, 89, 95,
];
const selectedHardIds = [97, 101, 108, 112, 113, 117, 118, 124, 125, 130];

const finalIds = [...easyMediumIds, ...selectedHardIds];
const finalSet = new Set(finalIds);

const missing = finalIds.filter((id) => !byId[id]);
if (missing.length) {
  console.error("Missing expected ids:", missing);
  process.exit(1);
}

const finalProblems = finalIds.map((id) => byId[id]);
const archivedProblems = problems.filter((p) => !finalSet.has(p.id));

fs.writeFileSync("problems/aug2026.json", JSON.stringify(finalProblems, null, 2) + "\n");
fs.writeFileSync(
  "problems/aug2026-hard-pool-unused.json",
  JSON.stringify(archivedProblems, null, 2) + "\n",
);

console.log(`problems/aug2026.json: ${finalProblems.length} problems (${easyMediumIds.length} easy/medium + ${selectedHardIds.length} hard)`);
console.log(`problems/aug2026-hard-pool-unused.json: ${archivedProblems.length} problems (archived, not served)`);
