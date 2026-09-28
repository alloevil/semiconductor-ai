import {existsSync, readFileSync, writeFileSync, appendFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createCanvas} from '@napi-rs/canvas';
import {episode, outputDir, tempDir, artFile, episodeTitle, settings, encoder, run, mediaInfo, hash, saveJson, makeDirectories} from './lib.mjs';
const {drawFrame, drawCredits, subtitleLines} = await import(`./${artFile}`);

makeDirectories();
const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const canvas = createCanvas(settings.width, settings.height);
const context = canvas.getContext('2d');
for (const scene of timeline.scenes) for (const cue of scene.cues) {
  if (subtitleLines(context, cue.text).length > 2) throw new Error(`Subtitle exceeds two lines: scene ${scene.id}: ${cue.text}`);
}

function log(message) {
  console.log(message);
  appendFileSync(`${outputDir}/render.log`, `${new Date().toISOString()} ${message}\n`);
}

if (process.argv.includes('--stills')) {
  for (const scene of timeline.scenes) {
    for (const fraction of [0.22, 0.65, 0.9]) {
      drawFrame(context, scene, scene.duration * fraction, timeline);
      const suffix = Math.round(fraction * 100);
      writeFileSync(`${outputDir}/frames/scene-${scene.id}-${suffix}.png`, canvas.toBuffer('image/png'));
    }
  }
  drawCredits(context, 4);
  writeFileSync(`${outputDir}/frames/credits.png`, canvas.toBuffer('image/png'));
  log('PASS: 31 storyboard frames rendered at 1920x1080; subtitles fit within two lines');
} else {
  const sourceHash = hash(readFileSync(`scripts/${artFile}`, 'utf8') + (artFile === 'art-business.mjs' ? readFileSync('scripts/process-scenes.mjs', 'utf8') + readFileSync('scripts/knowledge-scene.mjs', 'utf8') : '') + readFileSync('scripts/art.mjs', 'utf8') + readFileSync('scripts/teaching.mjs', 'utf8') + readFileSync('scripts/lib.mjs', 'utf8') + readFileSync('scripts/render.mjs', 'utf8'));
  const entries = [...timeline.scenes, {id: 'credits', start: timeline.narrationDuration, duration: timeline.creditsDuration, frames: Math.round(timeline.creditsDuration * settings.fps)}];
  for (const entry of entries) {
    const segment = `${tempDir}/segments/${entry.id}.mp4`;
    const cacheFile = `${tempDir}/segments/${entry.id}.json`;
    const fingerprint = hash(JSON.stringify({sourceHash, entry, settings, duration: timeline.duration}));
    if (existsSync(segment) && existsSync(cacheFile) && JSON.parse(readFileSync(cacheFile, 'utf8')).fingerprint === fingerprint) {
      log(`CACHE ${entry.id}: verified segment reused`);
      continue;
    }
    const started = performance.now();
    const temporary = `${tempDir}/segments/${entry.id}.partial.mp4`;
    const child = spawn(encoder, ['-y', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${settings.width}x${settings.height}`, '-framerate', String(settings.fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-threads', '4', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', temporary], {stdio: ['pipe', 'ignore', 'pipe']});
    let errorText = '';
    child.stderr.on('data', value => {errorText += value;});
    const finished = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(new Error(`Encoding ${entry.id} failed (${code}): ${errorText}`)));
    });
    child.stdin.on('error', error => {errorText += error.message;});
    log(`START ${entry.id}: ${entry.frames} frames / ${entry.duration.toFixed(2)} seconds`);
    for (let frame = 0; frame < entry.frames; frame++) {
      const seconds = frame / settings.fps;
      if (entry.id === 'credits') drawCredits(context, seconds);
      else drawFrame(context, entry, seconds, timeline);
      if (!child.stdin.write(canvas.data())) await once(child.stdin, 'drain');
      if (frame > 0 && frame % 450 === 0) log(`FRAME ${entry.id}: ${frame}/${entry.frames}`);
    }
    child.stdin.end();
    await finished;
    const video = mediaInfo(temporary).streams.find(stream => stream.codec_type === 'video');
    if (Number(video.nb_frames) !== entry.frames) throw new Error(`Frame count mismatch: ${entry.id}`);
    const {renameSync} = await import('node:fs');
    renameSync(temporary, segment);
    saveJson(cacheFile, {fingerprint, frames: entry.frames});
    log(`PASS ${entry.id}: ${entry.frames} frames in ${((performance.now() - started) / 1000).toFixed(1)}s`);
  }
  writeFileSync(`${tempDir}/segments/concat.txt`, entries.map(entry => `file '${entry.id}.mp4'`).join('\n'));
  const metadata = [';FFMETADATA1', `title=半导体入门 ${episode}：${episodeTitle}`, 'artist=原创 JavaScript 科普动画', 'comment=中文旁白由 AI 合成；原理图不按真实比例'];
  for (const entry of entries) metadata.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(entry.start * 1000)}`, `END=${Math.round((entry.start + entry.duration) * 1000)}`, `title=${entry.title || '资料与制作'}`);
  writeFileSync(`${tempDir}/segments/metadata.txt`, metadata.join('\n'));
  run(encoder, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${tempDir}/segments/concat.txt`, '-i', `${outputDir}/speech/episode-${episode}.wav`, '-f', 'ffmetadata', '-i', `${tempDir}/segments/metadata.txt`, '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '2', '-map_chapters', '2', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-t', timeline.duration.toFixed(6), `${outputDir}/episode-${episode}.mp4`]);
  for (const file of [`${outputDir}/episode-${episode}.mp4`]) if (!existsSync(file)) throw new Error(`Missing output: ${file}`);
  log(`PASS: ${outputDir}/episode-${episode}.mp4 exported, ${timeline.duration.toFixed(2)} seconds`);
}
