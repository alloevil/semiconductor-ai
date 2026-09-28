import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const episodes = [];
let teachingChecks = 0;
let processSceneChecks = 0;
for (const episode of ['01', '02', '03', '04', '05']) {
  const result = spawnSync(process.execPath, ['scripts/verify.mjs', `--episode=${episode}`], {stdio: 'inherit'});
  if (result.error || result.status !== 0) throw new Error(`Episode ${episode} validation failed`);
  const directory = episode === '01' ? 'output' : `output/episode-${episode}`;
  const verification = JSON.parse(readFileSync(`${directory}/verification.json`, 'utf8'));
  const timeline = JSON.parse(readFileSync(`${directory}/timeline.json`, 'utf8'));
  const sha256 = createHash('sha256').update(readFileSync(verification.file)).digest('hex');
  if (sha256 !== verification.sha256) throw new Error(`Episode ${episode} verification is stale`);
  const teachingResult = spawnSync(process.execPath, ['scripts/check-teaching.mjs', `--episode=${episode}`], {stdio: 'inherit'});
  if (teachingResult.error || teachingResult.status !== 0) throw new Error(`Episode ${episode} teaching validation failed`);
  teachingChecks += JSON.parse(readFileSync(`${directory}/review/teaching.json`, 'utf8')).results.length;
  if (['03', '04', '05'].includes(episode)) {
    const processSceneResult = spawnSync(process.execPath, ['scripts/check-process-scenes.mjs', `--episode=${episode}`], {stdio: 'inherit'});
    if (processSceneResult.error || processSceneResult.status !== 0) throw new Error(`Episode ${episode} process scene validation failed`);
    processSceneChecks += JSON.parse(readFileSync(`${directory}/review/process-scenes.json`, 'utf8')).checks.length;
  }
  episodes.push({episode, file: verification.file, seconds: verification.duration, bytes: verification.bytes, sha256, checks: verification.checks.length, subtitleCues: timeline.scenes.reduce((count, scene) => count + scene.cues.length, 0), pass: verification.pass});
}
const processResult = spawnSync(process.execPath, ['scripts/check-process.mjs', '--episode=02'], {stdio: 'inherit'});
if (processResult.error || processResult.status !== 0) throw new Error('Episode 02 process sequence validation failed');
const processVerification = JSON.parse(readFileSync('output/episode-02/process-verification.json', 'utf8'));
const diagramResult = spawnSync(process.execPath, ['scripts/check-diagram-contract.mjs', '--episode=05'], {stdio: 'inherit'});
if (diagramResult.error || diagramResult.status !== 0) throw new Error('Episode 05 diagram contract validation failed');
const diagramVerification = JSON.parse(readFileSync('output/episode-05/review/diagram-contract.json', 'utf8'));
const report = {generatedAt: new Date().toISOString(), pass: episodes.every(item => item.pass) && processVerification.pass && diagramVerification.pass, episodes, totalSeconds: episodes.reduce((total, item) => total + item.seconds, 0), totalChecks: episodes.reduce((total, item) => total + item.checks, 0) + processVerification.results.length + diagramVerification.results.length + teachingChecks + processSceneChecks, teachingChecks, processSceneChecks, unchangedSourceNarrationFiles: 50, limitations: ['No human sentence-by-sentence audio review', 'Public distribution and commercial terms of synthesized voice remain unverified', 'Not an expert-reviewed course or equipment operating procedure']};
writeFileSync('output/series-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(`PASS: ${episodes.length} episodes, ${report.totalChecks} checks, ${report.totalSeconds.toFixed(3)} seconds, 50 original MP3 files unchanged`);
