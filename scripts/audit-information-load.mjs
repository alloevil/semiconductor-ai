import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {episode, outputDir, artFile, hash} from './lib.mjs';

const {drawFrame} = await import(`./${artFile}`);
const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const context = createCanvas(1920, 1080).getContext('2d');
const drawText = context.fillText.bind(context);
let drawn = [];
context.fillText = (value, left, top, ...args) => {
  const metrics = context.measureText(value);
  const matrix = context.getTransform();
  const globalY = matrix.b * left + matrix.d * top + matrix.f;
  const fontSize = Number(context.font.match(/([\d.]+)px/)?.[1] || 0) * Math.hypot(matrix.c, matrix.d);
  if (context.globalAlpha > .15) drawn.push({text: value, centerY: globalY, fontSize: Number(fontSize.toFixed(2)), width: Number((metrics.width * Math.hypot(matrix.a, matrix.b)).toFixed(2)), layer: globalY < 100 ? 'metadata' : globalY < 200 ? 'title' : globalY < 275 ? 'subtitle' : globalY < 800 ? 'diagram' : globalY < 890 ? 'takeaway' : globalY < 925 ? 'disclosure' : 'captions'});
  return drawText(value, left, top, ...args);
};
const samples = [];
for (const scene of timeline.scenes) {
  for (const fraction of [.22, .5, .65, .9]) {
    drawn = [];
    drawFrame(context, scene, scene.duration * fraction, timeline);
    const layerCount = {};
    for (const label of drawn) layerCount[label.layer] = (layerCount[label.layer] || 0) + 1;
    samples.push({scene: scene.id, title: scene.title, globalTime: Number((scene.start + scene.duration * fraction).toFixed(3)), fraction, layerCount, textCalls: drawn.length, renderedCharacters: drawn.reduce((count, label) => count + [...label.text].length, 0), diagramMinFontPx: Math.min(...drawn.filter(label => label.layer === 'diagram').map(label => label.fontSize)), drawn});
  }
}
const phase = process.argv.includes('--after') ? 'after' : 'before';
mkdirSync(`output/information-load/${phase}`, {recursive: true});
writeFileSync(`output/information-load/${phase}/audit-${episode}.json`, JSON.stringify({episode, phase, videoSha256: hash(readFileSync(`${outputDir}/episode-${episode}.mp4`)), method: 'Source text measurements at 22%,50%,65%,90% per scene; y-based layers are heuristic. Neither repeated wording nor character count proves cognitive overload. Verify with actual frames and reader testing.', samples}, null, 2) + '\n');
console.log(`${phase} ${episode}: ${samples.length} sampled moments, ${samples.reduce((sum, sample) => sum + sample.textCalls, 0)} text draws; no quality verdict inferred`);
