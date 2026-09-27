import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {episode, outputDir, tempDir, absolute, settings, readScenes, run, encoder, mediaInfo, parseSrt, makeSrt, saveJson, makeDirectories, hash} from './lib.mjs';

makeDirectories();
const scenes = readScenes();
const version = run('uv', ['tool', 'run', '--from', 'edge-tts==7.2.8', 'edge-tts', '--version']).trim();
let elapsed = 0;
const allCues = [];
for (const scene of scenes) {
  const stem = `${outputDir}/speech/${scene.id}`;
  const fingerprint = hash(JSON.stringify({narration: scene.narration, voice: settings.voice, rate: settings.rate, version}));
  const cacheFile = `${stem}.cache.json`;
  const cached = existsSync(cacheFile) && JSON.parse(readFileSync(cacheFile, 'utf8')).fingerprint === fingerprint;
  if (!cached || !existsSync(`${stem}.mp3`) || !existsSync(`${stem}.srt`)) {
    writeFileSync(`${tempDir}/speech/${scene.id}.txt`, scene.narration);
    console.log(`SYNTHESIZE ${scene.id}: ${scene.title}`);
    run('uv', ['tool', 'run', '--from', 'edge-tts==7.2.8', 'edge-tts', '--voice', settings.voice, `--rate=${settings.rate}`, '--file', `${tempDir}/speech/${scene.id}.txt`, '--write-media', `${stem}.mp3`, '--write-subtitles', `${stem}.srt`]);
    writeFileSync(`${stem}.srt`, readFileSync(`${stem}.srt`, 'utf8').trimEnd() + '\n');
    saveJson(cacheFile, {fingerprint, version, voice: settings.voice, rate: settings.rate});
  }
  const sourceDuration = Number(mediaInfo(`${stem}.mp3`).format.duration);
  const sourceCues = parseSrt(readFileSync(`${stem}.srt`, 'utf8'));
  for (let index = 0; index < sourceCues.length - 1; index++) sourceCues[index].end = Math.min(sourceCues[index].end, sourceCues[index + 1].start);
  if (!sourceCues.length || sourceCues.at(-1).end > sourceDuration + 0.3) throw new Error(`Invalid speech timing: ${scene.id}`);
  const duration = Math.ceil((settings.lead + sourceDuration + settings.tail) * settings.fps) / settings.fps;
  const cues = sourceCues.map(cue => ({...cue, start: cue.start + settings.lead, end: cue.end + settings.lead}));
  run(encoder, ['-y', '-v', 'error', '-i', `${stem}.mp3`, '-af', `adelay=${settings.lead * 1000}|${settings.lead * 1000},apad`, '-t', duration.toFixed(6), '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', `${stem}.wav`]);
  Object.assign(scene, {start: elapsed, duration, frames: Math.round(duration * settings.fps), sourceDuration, cues, fingerprint});
  for (const cue of cues) allCues.push({...cue, start: cue.start + elapsed, end: cue.end + elapsed});
  elapsed += duration;
  console.log(`READY ${scene.id}: voice ${sourceDuration.toFixed(2)}s / scene ${duration.toFixed(2)}s / ${cues.length} subtitles`);
}
const creditsDuration = 9;
saveJson(`${outputDir}/timeline.json`, {settings, scenes, narrationDuration: elapsed, creditsDuration, duration: elapsed + creditsDuration, disclosure: '中文旁白由 AI 合成 / Microsoft zh-CN-XiaoxiaoNeural / edge-tts', generatedAt: new Date().toISOString()});
writeFileSync(`${outputDir}/episode-${episode}.zh-CN.srt`, makeSrt(allCues));
writeFileSync(`${outputDir}/chapters.txt`, scenes.map(scene => `${Math.floor(scene.start / 60).toString().padStart(2, '0')}:${Math.floor(scene.start % 60).toString().padStart(2, '0')} ${scene.id} ${scene.title}`).join('\n') + `\n${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${Math.floor(elapsed % 60).toString().padStart(2, '0')} 资料与制作\n`);
writeFileSync(`${tempDir}/speech/concat.txt`, scenes.map(scene => `file '${absolute(`${outputDir}/speech/${scene.id}.wav`)}'`).join('\n'));
run(encoder, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${tempDir}/speech/concat.txt`, '-af', 'loudnorm=I=-18:TP=-2:LRA=7,apad', '-t', (elapsed + creditsDuration).toFixed(6), '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', `${outputDir}/speech/episode-${episode}.wav`]);
console.log(`PASS: speech + subtitles ready; ${allCues.length} cues; ${(elapsed + creditsDuration).toFixed(2)} seconds including credits`);
