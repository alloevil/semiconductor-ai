import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {episode, outputDir, encoder, run, hash} from './lib.mjs';
import {processState, processScenes} from './process-scenes.mjs';
import {drawFrame} from './art-business.mjs';

if (!processScenes[episode]) throw new Error('Use --episode=03, 04 or 05');
const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const scene = timeline.scenes.find(item => item.id === processScenes[episode]);
const context = createCanvas(1920, 1080).getContext('2d');
const original = context.fillText.bind(context);
let strings = [];
const overflow = [];
context.fillText = (value, left, top, ...rest) => {
  strings.push(value);
  const metrics = context.measureText(value);
  const start = context.textAlign === 'center' ? left - metrics.width / 2 : context.textAlign === 'right' ? left - metrics.width : left;
  const matrix = context.getTransform();
  for (const [horizontal, vertical] of [[start, top - metrics.actualBoundingBoxAscent], [start + metrics.width, top + metrics.actualBoundingBoxDescent]]) {
    const point = {left: matrix.a * horizontal + matrix.c * vertical + matrix.e, top: matrix.b * horizontal + matrix.d * vertical + matrix.f};
    if (point.left < 0 || point.left > 1920 || point.top < 0 || point.top > 1080) overflow.push({value, point});
  }
  return original(value, left, top, ...rest);
};
const errors = [];
let previous = processState(episode, scene, 0);
const ids = JSON.stringify(previous.ids);
for (let frame = 0; frame < scene.frames; frame++) {
  const time = frame / 30;
  const state = processState(episode, scene, time);
  if (state.certified || JSON.stringify(state.ids) !== ids) errors.push({time, reason: 'identity or certification changed'});
  for (const key of ['placement', 'second', 'connections', 'align', 'install', 'reject']) if (key in state && (state[key] < previous[key] || state[key] < 0 || state[key] > 1)) errors.push({time, reason: `non-monotonic ${key}`});
  if (state.kind === 'records' && (state.actualThickness !== null || state.acceptedWrongRecord || state.rejectedRun !== 'RUN-16')) errors.push({time, reason: 'wrong measurement accepted'});
  if (frame % 6 === 0) {
    strings = [];
    drawFrame(context, scene, time, timeline);
    if (state.kind === 'packaging' && state.second < 1 && strings.includes('同一基底内的两个裸片')) errors.push({time, reason: 'premature placement result'});
    if (state.kind === 'assembly' && (state.install < 1 && strings.includes('已装入 · 保留记录') || !strings.includes('待调试验证'))) errors.push({time, reason: 'premature assembly result'});
    if (state.kind === 'records' && state.reject < 1 && strings.includes('隔离：不是同一轮加工')) errors.push({time, reason: 'premature exclusion'});
  }
  previous = state;
}
const final = processState(episode, scene, scene.duration - .1);
const completed = episode === '03' ? final.placement === 1 && final.second === 1 : episode === '04' ? final.install === 1 : final.align === 1 && final.reject === 1;
const checks = [
  {name: '逐帧身份不变及状态单调', pass: errors.length === 0, evidence: {frames: scene.frames, errors: errors.slice(0, 5)}},
  {name: '动作完成但不伪造质量批准', pass: completed && !final.certified, evidence: final},
  {name: '含坐标变换的文字不越界', pass: overflow.length === 0, evidence: overflow.slice(0, 5)},
];
mkdirSync(`${outputDir}/review/process-frames`, {recursive: true});
const samples = [1, ...scene.cues.flatMap(cue => [cue.start + .3, cue.start + 1.5, Math.min(cue.end, cue.start + 4)]), scene.duration - 1].filter(time => time < scene.duration);
if (!process.argv.includes('--source-only')) {
  for (const [index, time] of samples.entries()) run(encoder, ['-y', '-v', 'error', '-ss', (scene.start + time).toFixed(5), '-i', `${outputDir}/episode-${episode}.mp4`, '-frames:v', '1', `${outputDir}/review/process-frames/${String(index).padStart(2, '0')}.png`]);
}
const report = {episode, scene: scene.id, pass: checks.every(item => item.pass), checks, samples, videoSha256: process.argv.includes('--source-only') ? null : hash(readFileSync(`${outputDir}/episode-${episode}.mp4`)), limits: 'Model invariants and rendered text checks do not establish physical fidelity or learner outcomes. Actual decoded frames require visual review.'};
writeFileSync(`${outputDir}/review/process-scenes.json`, JSON.stringify(report, null, 2) + '\n');
for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${episode}/${scene.id}: ${check.name}`);
if (!report.pass) process.exitCode = 1;
