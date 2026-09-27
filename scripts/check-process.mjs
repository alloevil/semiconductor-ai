import {readFileSync} from 'node:fs';
import {createCanvas, loadImage} from '@napi-rs/canvas';
import {encoder, run, makeDirectories, saveJson, outputDir, tempDir, episode} from './lib.mjs';

if (episode !== '02') throw new Error('Use --episode=02 for this process-sequence check');
makeDirectories();
const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const context = createCanvas(1920, 1080).getContext('2d');
const cases = [
  {scene: '03', label: '曝光后：光束覆盖的光刻胶仍在', point: [340, 475], color: '#F2CE8F'},
  {scene: '03', label: '曝光后：目标膜未被光移除', point: [370, 550], color: '#007F78'},
  {scene: '04', label: '显影后：曝光胶被去除', point: [340, 475], color: '#FFFDF8'},
  {scene: '04', label: '显影后：目标膜仍完整', point: [370, 550], color: '#007F78'},
  {scene: '05', label: '刻蚀后：开口下的目标膜被移除', point: [370, 550], color: '#FFFDF8'},
  {scene: '05', label: '刻蚀后：保护区域的胶仍在', point: [220, 475], color: '#E4A64A'},
  {scene: '05', label: '刻蚀后：保护区域的膜仍在', point: [220, 550], color: '#007F78'},
  {scene: '06', label: '去胶后：保护胶被移除', point: [220, 475], color: '#FFFDF8'},
  {scene: '06', label: '去胶后：已图案化目标膜保留', point: [220, 550], color: '#007F78'},
];
const results = [];
for (const sceneId of ['03', '04', '05', '06']) {
  const scene = timeline.scenes.find(item => item.id === sceneId);
  const time = scene.start + scene.duration * 0.9;
  const path = `${tempDir}/process-${sceneId}.png`;
  run(encoder, ['-y', '-v', 'error', '-ss', time.toFixed(4), '-i', `${outputDir}/episode-02.mp4`, '-frames:v', '1', path]);
  context.drawImage(await loadImage(path), 0, 0);
  for (const item of cases.filter(item => item.scene === sceneId)) {
    const pixel = [...context.getImageData(...item.point, 1, 1).data].slice(0, 3);
    const expected = item.color.slice(1).match(/../g).map(value => parseInt(value, 16));
    const difference = Math.max(...pixel.map((value, index) => Math.abs(value - expected[index])));
    const pass = difference <= 20;
    results.push({...item, time, actualRgb: pixel, maxChannelDifference: difference, pass});
    console.log(`${pass ? 'PASS' : 'FAIL'} ${item.label}: actual=${pixel} expected=${expected}`);
  }
}
saveJson(`${outputDir}/process-verification.json`, {method: 'Decode final MP4 at 90% of each process scene; sample material colors at fixed cross-section coordinates; tolerance 20/255 per RGB channel for encoding', pass: results.every(item => item.pass), results});
if (results.some(item => !item.pass)) process.exitCode = 1;
