import {readFileSync, existsSync, statSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createCanvas, loadImage} from '@napi-rs/canvas';
import {episode, outputDir, encoder, probe, run, readScenes, parseSrt, mediaInfo, saveJson, hash} from './lib.mjs';
import {subtitleLines} from './art.mjs';

const checks = [];
function check(name, condition, evidence) {
  checks.push({name, pass: Boolean(condition), evidence});
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${name} — ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
}

const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const script = readScenes();
check('十段旁白与原稿一致', script.length === 10 && timeline.scenes.every((scene, index) => scene.narration === script[index].narration), `${script.length} scenes`);
let cursor = 0;
for (const scene of timeline.scenes) {
  check(`场景 ${scene.id} 时间连续`, Math.abs(scene.start - cursor) < 0.001 && Math.abs(scene.frames / 30 - scene.duration) < 0.001, `${scene.start.toFixed(3)}–${(scene.start + scene.duration).toFixed(3)}s`);
  check(`场景 ${scene.id} 无截断配音`, scene.duration >= scene.sourceDuration + 2.7, `voice=${scene.sourceDuration.toFixed(3)}s, scene=${scene.duration.toFixed(3)}s`);
  cursor += scene.duration;
}
const normalize = value => value.replace(/[^\p{L}\p{N}]/gu, '');
const cues = parseSrt(readFileSync(`${outputDir}/episode-${episode}.zh-CN.srt`, 'utf8'));
const context = createCanvas(1920, 1080).getContext('2d');
check('字幕文字完整覆盖旁白', normalize(cues.map(cue => cue.text).join('')) === normalize(script.map(scene => scene.narration).join('')), `${cues.length} cues`);
check('字幕时间不重叠且在视频范围内', cues.every((cue, index) => cue.start >= 0 && cue.end > cue.start && cue.end <= timeline.duration && (index === 0 || cue.start >= cues[index - 1].end - 0.001)), `${cues.length} cues`);
check('字幕最多两行', cues.every(cue => subtitleLines(context, cue.text).length <= 2), `maximum=${Math.max(...cues.map(cue => subtitleLines(context, cue.text).length))} lines`);

const file = `${outputDir}/episode-${episode}.mp4`;
if (existsSync(file)) {
  const info = mediaInfo(file);
  const video = info.streams.find(stream => stream.codec_type === 'video');
  const audio = info.streams.find(stream => stream.codec_type === 'audio');
  check('视频编码和尺寸', video.codec_name === 'h264' && video.width === 1920 && video.height === 1080 && video.pix_fmt === 'yuv420p', `${video.codec_name} ${video.width}x${video.height} ${video.pix_fmt}`);
  check('帧率为 30 fps', video.avg_frame_rate === '30/1', video.avg_frame_rate);
  const expectedFrames = timeline.scenes.reduce((sum, scene) => sum + scene.frames, 0) + timeline.creditsDuration * 30;
  check('总帧数完整', Number(video.nb_frames) === expectedFrames, `${video.nb_frames}/${expectedFrames}`);
  check('中文音轨存在', audio?.codec_name === 'aac' && Number(audio.sample_rate) === 48000, audio ? `${audio.codec_name} ${audio.sample_rate}Hz ${audio.channels} channel` : 'missing');
  check('音画时长一致', Math.abs(Number(video.duration) - Number(audio?.duration)) < 0.1 && Math.abs(Number(info.format.duration) - timeline.duration) < 0.1, {video: video.duration, audio: audio?.duration, target: timeline.duration});
  const chapters = JSON.parse(run(probe, ['-v', 'error', '-show_chapters', '-of', 'json', file])).chapters;
  check('章节已嵌入视频', chapters.length === 11, `${chapters.length} chapters`);
  const decoding = spawnSync(encoder, ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1024 * 1024});
  check('全片音视频解码', decoding.status === 0 && !decoding.stderr.trim(), decoding.status === 0 ? 'FFmpeg decoded every video frame and audio packet without error' : decoding.stderr);
  const volume = spawnSync(encoder, ['-hide_banner', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  const mean = Number(volume.stderr.match(/mean_volume: ([\d.-]+) dB/)?.[1]);
  const peak = Number(volume.stderr.match(/max_volume: ([\d.-]+) dB/)?.[1]);
  check('音轨非静音且无满幅削波', Number.isFinite(mean) && mean > -35 && peak < -0.1, {meanDb: mean, peakDb: peak});
  for (const scene of timeline.scenes) {
    const seconds = scene.start + scene.duration * 0.65;
    run(encoder, ['-y', '-v', 'error', '-ss', seconds.toFixed(4), '-i', file, '-frames:v', '1', `${outputDir}/frames/video-${scene.id}.png`]);
    run(encoder, ['-y', '-v', 'error', '-ss', (scene.start + scene.duration * 0.22).toFixed(4), '-i', file, '-frames:v', '1', `${outputDir}/frames/video-${scene.id}-early.png`]);
    const firstImage = await loadImage(`${outputDir}/frames/video-${scene.id}-early.png`);
    const secondImage = await loadImage(`${outputDir}/frames/video-${scene.id}.png`);
    context.drawImage(firstImage, 0, 0);
    const firstPixels = context.getImageData(100, 300, 1720, 470).data;
    context.drawImage(secondImage, 0, 0);
    const secondPixels = context.getImageData(100, 300, 1720, 470).data;
    let changed = 0;
    for (let index = 0; index < firstPixels.length; index += 4) {
      if (Math.abs(firstPixels[index] - secondPixels[index]) + Math.abs(firstPixels[index + 1] - secondPixels[index + 1]) + Math.abs(firstPixels[index + 2] - secondPixels[index + 2]) > 50) changed++;
    }
    const fraction = changed / (1720 * 470);
    check(`场景 ${scene.id} 主画面随时间变化`, fraction > 0.001, `${(fraction * 100).toFixed(2)}% of diagram pixels changed (subtitles excluded)`);
  }
  run(encoder, ['-y', '-v', 'error', '-ss', '5', '-i', file, '-frames:v', '1', `${outputDir}/cover.png`]);
  const verification = {generatedAt: new Date().toISOString(), pass: checks.every(item => item.pass), file, bytes: statSync(file).size, sha256: hash(readFileSync(file)), duration: Number(info.format.duration), checks, visualEvidence: timeline.scenes.map(scene => `${outputDir}/frames/video-${scene.id}.png`), limitations: ['画面通过实际解码抽帧检查；不将机器检查等同于人工完整观看和试听。']};
  saveJson(`${outputDir}/verification.json`, verification);
  writeFileSync(`${outputDir}/verification.txt`, checks.map(item => `${item.pass ? 'PASS' : 'FAIL'} ${item.name}: ${JSON.stringify(item.evidence)}`).join('\n') + '\n');
  console.log(`ARTIFACT: ${file} ${(statSync(file).size / 1024 / 1024).toFixed(1)} MiB SHA256=${verification.sha256}`);
} else {
  check('成片存在', false, file);
}
if (checks.some(item => !item.pass)) process.exitCode = 1;
