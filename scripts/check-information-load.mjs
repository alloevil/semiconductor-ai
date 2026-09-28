import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {drawFrame} from './art-business.mjs';
import {knowledgeState} from './knowledge-scene.mjs';
import {episode, hash} from './lib.mjs';

if (episode !== '05') throw new Error('Use --episode=05');
const timeline = JSON.parse(readFileSync('output/episode-05/timeline.json', 'utf8'));
const scene = timeline.scenes[1];
const context = createCanvas(1920, 1080).getContext('2d');
const fillText = context.fillText.bind(context);
const roundRect = context.roundRect.bind(context);
let labels = [];
let cards = [];
let panelHeights = [];
const failures = [];
let minimumIdSize = Infinity;
let minimumNoteSize = Infinity;
context.fillText = (value, left, top, ...rest) => {
  const transform = context.getTransform();
  const size = Number(context.font.match(/([\d.]+)px/)?.[1] || 0) * Math.hypot(transform.c, transform.d);
  const metric = context.measureText(value);
  const start = context.textAlign === 'center' ? left - metric.width / 2 : context.textAlign === 'right' ? left - metric.width : left;
  const corners = [[start, top - metric.actualBoundingBoxAscent], [start + metric.width, top + metric.actualBoundingBoxDescent]].map(([horizontal, vertical]) => ({x: transform.a * horizontal + transform.c * vertical + transform.e, y: transform.b * horizontal + transform.d * vertical + transform.f}));
  if (corners.some(point => point.x < 0 || point.x > 1920 || point.y < 0 || point.y > 1080)) failures.push({type: 'out-of-bounds', value, corners});
  if (value === 'Doc-A / R1') minimumIdSize = Math.min(minimumIdSize, size);
  if (value === '合成手册示例 · 非维修步骤') minimumNoteSize = Math.min(minimumNoteSize, size);
  labels.push(value);
  return fillText(value, left, top, ...rest);
};
context.roundRect = (left, top, width, height, ...rest) => {
  const matrix = context.getTransform();
  if (width === 410 && height === 215) cards.push({left: matrix.a * left + matrix.e, top: matrix.d * top + matrix.f, width: width * matrix.a, height: height * matrix.d});
  if ([890, 760].includes(width)) panelHeights.push(height);
  return roundRect(left, top, width, height, ...rest);
};
const required = ['ET-01 / R2', 'Doc-A / R1', 'Doc-B / R2', '仍需补充故障上下文', '工程师确认 / 安全规程 / 数据权限', '教学建议 · 不直接控制设备', '中文旁白由 AI 合成'];
for (let frame = 0; frame < scene.frames; frame++) {
  labels = []; cards = []; panelHeights = [];
  const time = frame / 30;
  drawFrame(context, scene, time, timeline);
  const state = knowledgeState(scene, time);
  for (const phrase of required) if (!labels.some(label => label.includes(phrase))) failures.push({frame, type: 'missing-information', phrase});
  if (labels.includes('流畅，不等于正确；版本和权限不能省略') || labels.includes('证据不足就说明，不编造维修步骤。')) failures.push({frame, type: 'duplicate-wrapper'});
  if (state.insufficient > 0 && (!labels.includes('暂不能确定，需补充信息') || !labels.includes('不编造维修步骤，不向设备下指令'))) failures.push({frame, type: 'missing-safety-response'});
  if (cards.length !== 2 || panelHeights.length !== 2 || panelHeights.some(height => height !== 610)) failures.push({frame, type: 'unexpected-layout'});
  if (cards.length === 2) {
    const [first, second] = cards;
    const overlapWidth = Math.min(first.left + first.width, second.left + second.width) - Math.max(first.left, second.left);
    const overlapHeight = Math.min(first.top + first.height, second.top + second.height) - Math.max(first.top, second.top);
    if (overlapWidth > .1 && overlapHeight > .1) failures.push({frame, type: 'documents-overlap'});
    if (cards.some(card => card.left < 100 || card.left + card.width > 990 || card.top < 252 || card.top + card.height > 862)) failures.push({frame, type: 'document-outside-panel'});
  }
}
const before = JSON.parse(readFileSync('output/information-load/before/audit-05.json', 'utf8')).samples.find(sample => sample.scene === '02' && sample.fraction === .65);
const after = JSON.parse(readFileSync('output/information-load/after/audit-05.json', 'utf8')).samples.find(sample => sample.scene === '02' && sample.fraction === .65);
const checks = [
  {name: '逐帧字幕外的核心信息与安全边界保留', pass: !failures.length, evidence: {frames: scene.frames, failures: failures.slice(0, 10)}},
  {name: '旧文档ID最小有效字号至少22px', pass: minimumIdSize >= 22, evidence: minimumIdSize},
  {name: '文档说明最小有效字号至少15px', pass: minimumNoteSize >= 15, evidence: minimumNoteSize},
  {name: '同时间点字符数减少且原字幕不动', pass: after.renderedCharacters < before.renderedCharacters && before.drawn.filter(label => label.layer === 'captions').map(label => label.text).join('') === after.drawn.filter(label => label.layer === 'captions').map(label => label.text).join(''), evidence: {beforeCharacters: before.renderedCharacters, afterCharacters: after.renderedCharacters, beforeTextCalls: before.textCalls, afterTextCalls: after.textCalls}},
];
const report = {pass: checks.every(check => check.pass), scene: '05/02', phase: process.argv.includes('--source-only') ? 'source-preview' : 'final-video', videoSha256: process.argv.includes('--source-only') ? null : hash(readFileSync('output/episode-05/episode-05.mp4')), checks, layout: {beforePanelHeight: 445, afterPanelHeight: 610, beforeOldDocumentScale: .52, afterOldDocumentScale: .72}, limitation: 'Geometric measurements and retention checks are not cognitive-load measurements or learner outcome evidence. Actual MP4 frames inspected separately.'};
mkdirSync('output/information-load', {recursive: true});
writeFileSync('output/information-load/verification.json', JSON.stringify(report, null, 2) + '\n');
for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}: ${JSON.stringify(check.evidence)}`);
if (!report.pass) process.exitCode = 1;
