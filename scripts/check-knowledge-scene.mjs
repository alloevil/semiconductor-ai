import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {knowledgeState, drawKnowledge} from './knowledge-scene.mjs';
import {hash, run, encoder} from './lib.mjs';

const timeline = JSON.parse(readFileSync('output/episode-05/timeline.json', 'utf8'));
const scene = timeline.scenes[1];
const context = createCanvas(1920, 1080).getContext('2d');
const fillText = context.fillText.bind(context);
let labels = [];
context.fillText = (value, ...args) => {labels.push(value); return fillText(value, ...args);};
const errors = [];
let previous = knowledgeState(scene, 0);
for (let frame = 0; frame < scene.frames; frame++) {
  const time = frame / 30;
  const state = knowledgeState(scene, time);
  if (state.identity !== 'ET-01 / R2' || state.oldId !== 'Doc-A / R1' || state.candidateId !== 'Doc-B / R2' || state.acceptedOld || state.rootCause !== null || state.commands !== 0 || state.filtered < previous.filtered || state.insufficient < previous.insufficient) errors.push({time, state});
  if (frame % 6 === 0) {
    labels = []; drawKnowledge(context, scene, time);
    if (state.filtered < 1 && labels.includes('排除：版本不符')) errors.push({time, error: 'premature exclusion'});
    if (state.insufficient === 0 && labels.includes('暂不能确定，需补充信息')) errors.push({time, error: 'premature response'});
    if (labels.some(value => /验证通过|原因已确定|执行维修/.test(value))) errors.push({time, error: 'invented diagnosis'});
  }
  previous = state;
}
const directory = 'output/knowledge-revision';
mkdirSync(`${directory}/frames`, {recursive: true});
const times = [1, ...scene.cues.flatMap(cue => [cue.start + .2, cue.start + 1.8, Math.min(cue.end, cue.start + 4)]), scene.duration - 1];
if (!process.argv.includes('--source-only')) for (const [index, time] of times.entries()) run(encoder, ['-y', '-v', 'error', '-ss', (scene.start + time).toFixed(5), '-i', 'output/episode-05/episode-05.mp4', '-frames:v', '1', `${directory}/frames/${String(index).padStart(2, '0')}.png`]);
const report = {pass: !errors.length && previous.filtered === 1 && previous.insufficient === 1, framesChecked: scene.frames, errors, times, finalState: previous, videoSha256: process.argv.includes('--source-only') ? null : hash(readFileSync('output/episode-05/episode-05.mp4')), limit: 'Source state checks do not prove semantic correctness; inspect decoded transition frames separately.'};
writeFileSync(`${directory}/verification.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.pass ? 'PASS' : 'FAIL'}: knowledge identity, exclusion, uncertainty and no device commands (${scene.frames} frames)`);
if (!report.pass) process.exitCode = 1;
