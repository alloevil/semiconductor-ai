import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const episodes = [];
const previousHashes = {'01': '2ebb945dcb5ddb6e6bed779a10e767620afd36ccb0bceabd6cafb35b1f7259b4', '02': '4db7072d756ae84c5178ee7602562d80fb383be23117a0605827fe8b29604a3f'};
for (const episode of ['01', '02', '03', '04', '05']) {
  const result = spawnSync(process.execPath, ['scripts/verify.mjs', `--episode=${episode}`], {stdio: 'inherit'});
  if (result.error || result.status !== 0) throw new Error(`Episode ${episode} validation failed`);
  const directory = episode === '01' ? 'output' : `output/episode-${episode}`;
  const verification = JSON.parse(readFileSync(`${directory}/verification.json`, 'utf8'));
  const timeline = JSON.parse(readFileSync(`${directory}/timeline.json`, 'utf8'));
  const sha256 = createHash('sha256').update(readFileSync(verification.file)).digest('hex');
  if (sha256 !== verification.sha256) throw new Error(`Episode ${episode} verification is stale`);
  if (previousHashes[episode] && sha256 !== previousHashes[episode]) throw new Error(`Published episode ${episode} unexpectedly changed`);
  episodes.push({episode, file: verification.file, seconds: verification.duration, bytes: verification.bytes, sha256, checks: verification.checks.length, subtitleCues: timeline.scenes.reduce((count, scene) => count + scene.cues.length, 0), pass: verification.pass});
}
const processResult = spawnSync(process.execPath, ['scripts/check-process.mjs', '--episode=02'], {stdio: 'inherit'});
if (processResult.error || processResult.status !== 0) throw new Error('Episode 02 process sequence validation failed');
const processVerification = JSON.parse(readFileSync('output/episode-02/process-verification.json', 'utf8'));
const report = {generatedAt: new Date().toISOString(), pass: episodes.every(item => item.pass) && processVerification.pass, episodes, totalSeconds: episodes.reduce((total, item) => total + item.seconds, 0), totalChecks: episodes.reduce((total, item) => total + item.checks, 0) + processVerification.results.length, unchangedPublishedEpisodes: ['01', '02'], limitations: ['No human sentence-by-sentence audio review', 'Public distribution and commercial terms of synthesized voice remain unverified', 'Not an expert-reviewed course or equipment operating procedure']};
writeFileSync('output/series-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(`PASS: ${episodes.length} episodes, ${report.totalChecks} checks, ${report.totalSeconds.toFixed(3)} seconds, episodes 01/02 unchanged`);
