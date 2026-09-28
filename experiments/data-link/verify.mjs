import {readFileSync, writeFileSync, mkdirSync, statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createCanvas, loadImage} from '@napi-rs/canvas';
import {run, encoder, probe, mediaInfo, parseSrt, hash} from '../../scripts/lib.mjs';
import {animationState, drawPilot, subtitleLines} from './art.mjs';

const directory = 'output/pilots/data-link';
mkdirSync(`${directory}/review`, {recursive: true});
const timeline = JSON.parse(readFileSync(`${directory}/timeline.json`, 'utf8'));
const script = JSON.parse(readFileSync('experiments/data-link/narration.json', 'utf8'));
const canvas = createCanvas(1920, 1080);
const context = canvas.getContext('2d');
const results = [];
function check(name, pass, evidence) {
  results.push({name, pass: Boolean(pass), evidence});
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(evidence)}`);
}
const normalize = value => value.replace(/[^\p{L}\p{N}]/gu, '');
check('分镜六节拍与旁白一致', timeline.beats.length === 6 && timeline.beats.every((beat, index) => beat.text === script.beats[index].text), script.beats.length);
check('旁白版本一致', timeline.narrationSha256 === hash(readFileSync('experiments/data-link/narration.json')), timeline.narrationSha256);
const cues = parseSrt(readFileSync(`${directory}/data-link.zh-CN.srt`, 'utf8'));
check('字幕覆盖全部旁白', normalize(cues.map(cue => cue.text).join('')) === normalize(script.beats.map(beat => beat.text).join('')), cues.length);
check('字幕时间合法无重叠', cues.every((cue, index) => cue.end > cue.start && cue.start >= 0 && cue.end <= timeline.duration && (index === 0 || cue.start >= cues[index - 1].end - .001)), cues.length);
check('字幕至多两行', cues.every(cue => subtitleLines(context, cue.text).length <= 2), Math.max(...cues.map(cue => subtitleLines(context, cue.text).length)));
let elapsed = 0;
for (const beat of timeline.beats) {
  check(`节拍 ${beat.id} 连续并保留音频`, Math.abs(beat.start - elapsed) < .001 && beat.duration >= beat.sourceDuration + 1.7, {start: beat.start, duration: beat.duration, sourceDuration: beat.sourceDuration});
  elapsed += beat.duration;
}

let textCalls = 0;
let captured = [];
const bounds = [];
const fillText = context.fillText.bind(context);
context.fillText = (value, left, top, ...rest) => {
  captured.push(value);
  const metric = context.measureText(value);
  const start = context.textAlign === 'center' ? left - metric.width / 2 : context.textAlign === 'right' ? left - metric.width : left;
  const transform = context.getTransform();
  const positions = [[start, top - metric.actualBoundingBoxAscent], [start + metric.width, top + metric.actualBoundingBoxDescent]].map(([horizontal, vertical]) => ({left: transform.a * horizontal + transform.c * vertical + transform.e, top: transform.b * horizontal + transform.d * vertical + transform.f}));
  if (positions.some(point => point.left < 0 || point.left > 1920 || point.top < 0 || point.top > 1080)) bounds.push({value, positions});
  textCalls++;
  return fillText(value, left, top, ...rest);
};
const stateErrors = [];
const textErrors = [];
const frames = Math.round(timeline.duration * 30);
const reviewTimes = [];
for (let frame = 0; frame < Math.round(timeline.contentDuration * 30); frame++) {
  const time = frame / 30;
  const state = animationState(timeline, time);
  if (state.currentIdentity.run !== 'RUN-17' || state.currentIdentity.wafer !== 'W03' || state.wrongIdentity.run !== 'RUN-16' || state.wrongRecordAccepted || state.actualThickness !== null || state.predictionValidated) stateErrors.push({time, state});
  if (frame % 6 === 0) {
    captured = [];
    drawPilot(context, timeline, time);
    if (captured.includes('2 份记录已关联') && state.aligned < 1) textErrors.push({time, error: 'early association label'});
    if (captured.includes('已排除 · 不是这次加工') && state.rejected < 1) textErrors.push({time, error: 'early rejection label'});
    if (state.missing > 0 && !captured.includes('没有可靠量测记录')) textErrors.push({time, error: 'missing-value label absent'});
    if (captured.some(value => /预测正确|验证通过|真实膜厚：\s*\d/.test(value))) textErrors.push({time, error: 'fabricated conclusion'});
  }
}
drawPilot(context, timeline, timeline.contentDuration + 3);
check('每帧身份与未知量不变量', stateErrors.length === 0, {framesChecked: Math.round(timeline.contentDuration * 30), failures: stateErrors.slice(0, 5)});
check('过渡中不提前宣布状态', textErrors.length === 0, {sampleIntervalSeconds: .2, failures: textErrors.slice(0, 5)});
check('含变换后的文字不越界', bounds.length === 0, {textCalls, failures: bounds.slice(0, 10)});
const alignment = animationState(timeline, timeline.beats[1].start + timeline.beats[1].duration - 1);
check('说匹配后之前已完成对齐', animationState(timeline, alignment.alignComplete).associated, alignment.alignComplete);
check('错误候选先移出再显示真实值空格', animationState(timeline, timeline.beats[2].start + 3.6).missing === 0 && animationState(timeline, timeline.beats[2].start + 4.6).missing === 1, [3.6, 4.6]);

const file = `${directory}/data-link.mp4`;
const info = mediaInfo(file);
const video = info.streams.find(stream => stream.codec_type === 'video');
const audio = info.streams.find(stream => stream.codec_type === 'audio');
check('H264 1080p 30fps兼容像素格式', video.codec_name === 'h264' && video.width === 1920 && video.height === 1080 && video.avg_frame_rate === '30/1' && video.pix_fmt === 'yuv420p', {codec: video.codec_name, width: video.width, height: video.height, fps: video.avg_frame_rate, pixelFormat: video.pix_fmt});
check('帧数完整', Number(video.nb_frames) === frames, {actual: video.nb_frames, expected: frames});
check('AAC音轨与视频时长一致', audio?.codec_name === 'aac' && Number(audio.sample_rate) === 48000 && Math.abs(Number(video.duration) - Number(audio.duration)) < .1, {audio: audio?.duration, video: video.duration});
const chapters = JSON.parse(run(probe, ['-v', 'error', '-show_chapters', '-of', 'json', file])).chapters;
check('六节拍与片尾章节完整', chapters.length === 7, chapters.length);
const decoded = spawnSync(encoder, ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], {encoding: 'utf8'});
check('全片解码无错误', decoded.status === 0 && !decoded.stderr.trim(), decoded.stderr || 'all video and audio decoded');
const volume = spawnSync(encoder, ['-hide_banner', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const mean = Number(volume.match(/mean_volume: ([\d.-]+) dB/)?.[1]);
const peak = Number(volume.match(/max_volume: ([\d.-]+) dB/)?.[1]);
check('音量非静音且无满幅削波', mean > -35 && peak < -.1, {meanDb: mean, peakDb: peak});

for (const beat of timeline.beats) {
  for (const [phase, offset] of [['before', .2], ['during', 2.2], ['after', 4.8], ['settled', beat.duration - 1]]) {
    const time = beat.start + Math.min(offset, beat.duration - .1);
    const path = `${directory}/frames/video-${beat.id}-${phase}.png`;
    run(encoder, ['-y', '-v', 'error', '-ss', time.toFixed(5), '-i', file, '-frames:v', '1', path]);
    reviewTimes.push({beat: beat.id, phase, time, file: path});
  }
}
run(encoder, ['-y', '-v', 'error', '-ss', '4', '-i', file, '-frames:v', '1', `${directory}/cover.png`]);
const board = createCanvas(1920, 1710);
const boardContext = board.getContext('2d');
for (const [index, beat] of timeline.beats.entries()) {
  const left = index % 2 * 960;
  const top = Math.floor(index / 2) * 570;
  boardContext.fillStyle = '#eeeeee'; boardContext.fillRect(left, top, 960, 570);
  boardContext.font = '20px "Noto CJK"'; boardContext.fillStyle = '#172D38'; boardContext.fillText(`Beat ${beat.id} / final video`, left + 10, top + 22);
  boardContext.drawImage(await loadImage(`${directory}/frames/video-${beat.id}-settled.png`), left, top + 30, 960, 540);
}
writeFileSync(`${directory}/frames/final-contact-sheet.jpg`, board.toBuffer('image/jpeg'));
const course = JSON.parse(readFileSync('output/series-verification.json', 'utf8')).episodes;
check('原五集未改变', course.every(item => hash(readFileSync(item.file)) === item.sha256), course.map(item => item.episode));
const quality = spawnSync(process.execPath, ['scripts/check-quality.mjs', '--gate'], {encoding: 'utf8'});
check('原质量批次有效但正式发布仍被阻断', quality.status === 1 && quality.stdout.includes('PASS materials') && quality.stdout.includes('Content release: BLOCKED'), quality.stdout.trim());
const report = {generatedAt: new Date().toISOString(), pass: results.every(item => item.pass), file, bytes: statSync(file).size, seconds: Number(info.format.duration), videoSha256: hash(readFileSync(file)), sourceSha256: hash(readFileSync('experiments/data-link/art.mjs')), checks: results, reviewTimes, limits: ['State/geometry checks do not establish learner outcomes', 'Not independent professional review or human audio listening', 'Separate pilot does not inherit original course approval; original content gate remains blocked']};
writeFileSync(`${directory}/verification.json`, JSON.stringify(report, null, 2) + '\n');
if (!report.pass) process.exitCode = 1;
