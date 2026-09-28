import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createCanvas, loadImage} from '@napi-rs/canvas';
import {episode, outputDir, encoder, run, hash} from './lib.mjs';

const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const report = JSON.parse(readFileSync(`${outputDir}/review/teaching.json`, 'utf8'));
const file = `${outputDir}/episode-${episode}.mp4`;
if (!report.pass || report.videoSha256 !== hash(readFileSync(file))) throw new Error('Teaching checks missing or stale');
const directory = `${outputDir}/review/teaching-frames`;
mkdirSync(directory, {recursive: true});
for (const [index, sample] of report.samples.entries()) {
  const scene = timeline.scenes.find(item => item.id === sample.scene);
  const globalTime = scene.start + sample.time;
  run(encoder, ['-y', '-v', 'error', '-ss', globalTime.toFixed(5), '-i', file, '-frames:v', '1', `${directory}/${String(index + 1).padStart(2, '0')}-${sample.kind}.png`]);
}
const canvas = createCanvas(1920, 2850);
const context = canvas.getContext('2d');
for (const [index, scene] of timeline.scenes.entries()) {
  const left = index % 2 * 960;
  const top = Math.floor(index / 2) * 570;
  context.fillStyle = '#eeeeee'; context.fillRect(left, top, 960, 570);
  context.fillStyle = '#172D38'; context.font = '20px sans-serif';
  context.fillText(`Scene ${scene.id} / decoded MP4`, left + 14, top + 22);
  context.drawImage(await loadImage(`${outputDir}/frames/video-${scene.id}.png`), left, top + 30, 960, 540);
}
writeFileSync(`${outputDir}/frames/final-contact-sheet.jpg`, canvas.toBuffer('image/jpeg'));
run(encoder, ['-y', '-v', 'error', '-ss', (timeline.narrationDuration + 4).toFixed(5), '-i', file, '-frames:v', '1', `${outputDir}/frames/video-credits.png`]);
console.log(`PASS: ${report.samples.length} teaching moments decoded from episode ${episode}; contact sheet updated`);
