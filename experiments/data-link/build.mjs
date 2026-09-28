import {readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, renameSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createCanvas} from '@napi-rs/canvas';
import {resolve} from 'node:path';
import {run, encoder, mediaInfo, parseSrt, makeSrt, hash} from '../../scripts/lib.mjs';
import {drawPilot} from './art.mjs';

const directory = 'output/pilots/data-link';
const temporary = 'tmp/data-link';
for (const path of [directory, `${directory}/speech`, `${directory}/frames`, temporary]) mkdirSync(path, {recursive: true});
const script = JSON.parse(readFileSync('experiments/data-link/narration.json', 'utf8'));
const log = value => {console.log(value); appendFileSync(`${directory}/build.log`, `${new Date().toISOString()} ${value}\n`);};

if (process.argv.includes('--audio')) {
  const cues = [];
  let elapsed = 0;
  const beats = [];
  for (const beat of script.beats) {
    const stem = `${directory}/speech/${beat.id}`;
    const fingerprint = hash(JSON.stringify({text: beat.text, voice: script.voice, rate: script.rate, version: 'edge-tts==7.2.8'}));
    if (!existsSync(`${stem}.json`) || JSON.parse(readFileSync(`${stem}.json`, 'utf8')).fingerprint !== fingerprint || !existsSync(`${stem}.mp3`) || !existsSync(`${stem}.srt`)) {
      writeFileSync(`${temporary}/${beat.id}.txt`, beat.text);
      log(`SYNTHESIZE ${beat.id}`);
      run('uv', ['tool', 'run', '--from', 'edge-tts==7.2.8', 'edge-tts', '--voice', script.voice, `--rate=${script.rate}`, '--file', `${temporary}/${beat.id}.txt`, '--write-media', `${stem}.mp3`, '--write-subtitles', `${stem}.srt`]);
      writeFileSync(`${stem}.srt`, readFileSync(`${stem}.srt`, 'utf8').trimEnd() + '\n');
      writeFileSync(`${stem}.json`, JSON.stringify({fingerprint, voice: script.voice, rate: script.rate}, null, 2) + '\n');
    }
    const sourceDuration = Number(mediaInfo(`${stem}.mp3`).format.duration);
    const localCues = parseSrt(readFileSync(`${stem}.srt`, 'utf8'));
    for (let index = 0; index < localCues.length - 1; index++) localCues[index].end = Math.min(localCues[index].end, localCues[index + 1].start);
    const lead = .6;
    const duration = Math.ceil((sourceDuration + lead + 1.2) * 30) / 30;
    const timedCues = localCues.map(cue => ({...cue, start: cue.start + lead, end: cue.end + lead}));
    run(encoder, ['-y', '-v', 'error', '-i', `${stem}.mp3`, '-af', `adelay=${lead * 1000},apad`, '-t', duration.toFixed(6), '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', `${temporary}/${beat.id}.wav`]);
    beats.push({...beat, start: elapsed, duration, sourceDuration, cues: timedCues});
    for (const cue of timedCues) cues.push({...cue, start: cue.start + elapsed, end: cue.end + elapsed});
    elapsed += duration;
    log(`READY ${beat.id}: ${duration.toFixed(3)}s, ${timedCues.length} cues`);
  }
  const timeline = {title: script.title, width: 1920, height: 1080, fps: 30, beats, cues, contentDuration: elapsed, creditsDuration: 7, duration: elapsed + 7, narrationSha256: hash(readFileSync('experiments/data-link/narration.json')), disclosure: 'Chinese voice synthesized using Microsoft Xiaoxiao via edge-tts; rights not independently verified'};
  writeFileSync(`${directory}/timeline.json`, JSON.stringify(timeline, null, 2) + '\n');
  writeFileSync(`${directory}/data-link.zh-CN.srt`, makeSrt(cues));
  writeFileSync(`${temporary}/concat.txt`, beats.map(beat => `file '${resolve(`${temporary}/${beat.id}.wav`)}'`).join('\n'));
  run(encoder, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${temporary}/concat.txt`, '-af', 'loudnorm=I=-18:TP=-2:LRA=7,apad', '-t', timeline.duration.toFixed(6), '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', `${temporary}/narration.wav`]);
  log(`PASS audio ready: ${timeline.duration.toFixed(3)}s / ${cues.length} cues`);
} else {
  const timeline = JSON.parse(readFileSync(`${directory}/timeline.json`, 'utf8'));
  const canvas = createCanvas(1920, 1080);
  const context = canvas.getContext('2d');
  if (process.argv.includes('--stills')) {
    for (const beat of timeline.beats) for (const offset of [.2, 2.2, 4.6, beat.duration - 1]) {
      const time = beat.start + Math.min(offset, beat.duration - .1);
      drawPilot(context, timeline, time);
      writeFileSync(`${directory}/frames/${beat.id}-${offset.toFixed(1)}.png`, canvas.toBuffer('image/png'));
    }
    drawPilot(context, timeline, timeline.contentDuration + 2);
    writeFileSync(`${directory}/frames/credits.png`, canvas.toBuffer('image/png'));
    log('PASS: 24 transition/state previews and credits generated');
  } else if (process.argv.includes('--render')) {
    const frames = Math.round(timeline.duration * 30);
    const child = spawn(encoder, ['-y', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '1920x1080', '-framerate', '30', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-threads', '4', '-pix_fmt', 'yuv420p', `${temporary}/silent.partial.mp4`], {stdio: ['pipe', 'ignore', 'pipe']});
    let errorText = '';
    child.stderr.on('data', bytes => {errorText += bytes;});
    const done = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(new Error(errorText)));
    });
    child.stdin.on('error', error => {errorText += error.message;});
    for (let frame = 0; frame < frames; frame++) {
      drawPilot(context, timeline, frame / 30);
      if (!child.stdin.write(canvas.data())) await once(child.stdin, 'drain');
      if (frame % 600 === 0) log(`FRAME ${frame}/${frames}`);
    }
    child.stdin.end(); await done;
    const metadata = [';FFMETADATA1', `title=${script.title}`, 'comment=独立教学实验小样；合成数据；AI合成旁白；未经独立审校'];
    for (const beat of [...timeline.beats, {title: '来源与边界', start: timeline.contentDuration, duration: 7}]) metadata.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(beat.start * 1000)}`, `END=${Math.round((beat.start + beat.duration) * 1000)}`, `title=${beat.title}`);
    writeFileSync(`${temporary}/metadata.txt`, metadata.join('\n'));
    run(encoder, ['-y', '-v', 'error', '-i', `${temporary}/silent.partial.mp4`, '-i', `${temporary}/narration.wav`, '-f', 'ffmetadata', '-i', `${temporary}/metadata.txt`, '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '2', '-map_chapters', '2', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', timeline.duration.toFixed(6), `${temporary}/final.partial.mp4`]);
    renameSync(`${temporary}/final.partial.mp4`, `${directory}/data-link.mp4`);
    log(`PASS: ${directory}/data-link.mp4 / ${frames} frames / ${timeline.duration.toFixed(3)} seconds`);
  } else throw new Error('Choose --audio, --stills or --render');
}
