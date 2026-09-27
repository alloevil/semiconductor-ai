import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {episode, outputDir} from './lib.mjs';
import {drawFrame, drawCredits} from './art-business.mjs';

if (!['03', '04', '05'].includes(episode)) throw new Error('Text review supports episodes 03–05');
const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const context = createCanvas(1920, 1080).getContext('2d');
const original = context.fillText.bind(context);
const violations = [];
let drawnTextCalls = 0;
let position = '';
context.fillText = (value, left, top, ...rest) => {
  const metrics = context.measureText(value);
  const start = context.textAlign === 'center' ? left - metrics.width / 2 : context.textAlign === 'right' ? left - metrics.width : left;
  const transform = context.getTransform();
  const corners = [[start, top - metrics.actualBoundingBoxAscent], [start + metrics.width, top + metrics.actualBoundingBoxDescent]].map(([horizontal, vertical]) => ({left: transform.a * horizontal + transform.c * vertical + transform.e, top: transform.b * horizontal + transform.d * vertical + transform.f}));
  drawnTextCalls++;
  if (corners.some(point => point.left < 0 || point.left > 1920 || point.top < 0 || point.top > 1080)) violations.push({position, value, corners});
  return original(value, left, top, ...rest);
};
for (const scene of timeline.scenes) for (const fraction of [.08, .22, .65, .9]) {
  position = `scene-${scene.id}-${fraction}`;
  drawFrame(context, scene, scene.duration * fraction, timeline);
}
position = 'credits';
drawCredits(context, 4);
mkdirSync(`${outputDir}/review`, {recursive: true});
writeFileSync(`${outputDir}/review/text-bounds.json`, JSON.stringify({episode, pass: !violations.length, drawnTextCalls, method: 'Measure drawn strings at four moments per scene and credits, applying current canvas transforms; bounds check, not collision detection', violations}, null, 2) + '\n');
console.log(`${violations.length ? 'FAIL' : 'PASS'}: episode ${episode}, ${drawnTextCalls} text draws, ${violations.length} canvas-bound violations`);
if (violations.length) process.exitCode = 1;
