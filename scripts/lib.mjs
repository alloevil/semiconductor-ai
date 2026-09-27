import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import {resolve} from 'node:path';

export const episode = process.argv.find(argument => argument.startsWith('--episode='))?.split('=')[1] || '01';
if (!['01', '02'].includes(episode)) throw new Error(`Unsupported episode: ${episode}`);
export const outputDir = episode === '01' ? 'output' : `output/episode-${episode}`;
export const tempDir = episode === '01' ? 'tmp' : `tmp/episode-${episode}`;
export const artFile = episode === '01' ? 'art.mjs' : `art-${episode}.mjs`;
export const episodeTitle = episode === '01' ? '半导体、晶体管、芯片和晶圆' : '芯片是怎样制造出来的？';
export const absolute = resolve;

export const settings = {width: 1920, height: 1080, fps: 30, lead: 1.0, tail: 1.8, voice: 'zh-CN-XiaoxiaoNeural', rate: '-10%'};
export const encoder = ffmpeg;
export const probe = ffprobe.path;

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...options});
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error || result.stderr || result.stdout}`);
  return result.stdout;
}

export function mediaInfo(file) {
  return JSON.parse(run(probe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]));
}

export function readScenes() {
  const document = readFileSync(`content/episode-${episode}.md`, 'utf8');
  return [...document.matchAll(/^## (\d{2})｜[^\n]+｜([^\n]+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(match => ({
    id: match[1], title: match[2], narration: match[3].match(/### 旁白\n\n([\s\S]*?)\n\n### 分镜/)[1].trim(),
  }));
}

export function parseSrt(text) {
  return text.trim().split(/\r?\n\s*\r?\n/).filter(Boolean).map(block => {
    const lines = block.split(/\r?\n/);
    const [start, end] = lines[1].split(' --> ').map(value => {
      const [hours, minutes, seconds] = value.replace(',', '.').split(':').map(Number);
      return hours * 3600 + minutes * 60 + seconds;
    });
    return {start, end, text: lines.slice(2).join('')};
  });
}

export function srtTime(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const wholeSeconds = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')},${String(milliseconds % 1000).padStart(3, '0')}`;
}

export function makeSrt(cues) {
  return cues.map((cue, index) => `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`).join('\n');
}

export function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function saveJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

export function makeDirectories() {
  for (const directory of [outputDir, `${outputDir}/speech`, `${outputDir}/frames`, `${tempDir}/segments`, `${tempDir}/speech`]) mkdirSync(directory, {recursive: true});
}
