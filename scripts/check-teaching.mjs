import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {episode, outputDir, artFile, encoder, run, hash} from './lib.mjs';
import {termsFor, termAt, isTopicActive, teachingRevision} from './teaching.mjs';

const {drawFrame} = await import(`./${artFile}`);
const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const context = createCanvas(1920, 1080).getContext('2d');
const results = [];
const samples = [];
function check(name, pass, evidence) {
  results.push({name, pass: Boolean(pass), evidence});
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
}
let captured = [];
const fillText = context.fillText.bind(context);
context.fillText = (value, ...args) => {captured.push(value); return fillText(value, ...args);};
function renderText(scene, time) {
  captured = [];
  drawFrame(context, scene, time, timeline);
  return [...captured];
}
check('教学时间轴版本正确', timeline.teachingRevision === teachingRevision, timeline.teachingRevision);
const originals = JSON.parse(readFileSync('output/teaching-review/original-narration.json', 'utf8')).files.filter(item => item.path.startsWith(`${outputDir}/speech/`));
check('原始合成旁白未改动', originals.length === 10 && originals.every(item => hash(readFileSync(item.path)) === item.sha256), `${originals.length} MP3 SHA-256 comparisons`);
for (const scene of timeline.scenes) {
  for (const term of termsFor(episode, scene)) {
    const visible = renderText(scene, term.start + .1).includes(term.text);
    const prior = termAt(episode, scene, Math.max(0, term.start - .1));
    check(`术语提示与语句同步：${term.phrase}`, visible && prior?.phrase !== term.phrase, {start: term.start, text: term.text});
    context.font = '600 29px "Noto CJK Bold"';
    check(`术语提示不越界：${term.phrase}`, context.measureText(term.text).width <= 1600, context.measureText(term.text).width);
    samples.push({scene: scene.id, time: term.start + .5, kind: 'term', label: term.phrase});
  }
}
const focusCases = {
  '03': [['07', 'EDA', 'EDA / IP'], ['07', '接口', '接口与工艺验证'], ['08', '外部', '外部制造 / 封测合作']],
  '04': [['04', '物料清单', '物料清单'], ['09', '脱敏', '授权 / 脱敏']],
  '05': [['02', '版本', '权限 / 版本筛选'], ['06', '装配检查', '装配检查'], ['07', '批次', '批次'], ['08', '规则', '现有规则 / 人工'], ['09', '只观察', '只读现场 + 审批']],
}[episode] || [];
for (const [sceneId, phrase, label] of focusCases) {
  const scene = timeline.scenes.find(item => item.id === sceneId);
  const cue = scene.cues.find(item => item.text.includes(phrase));
  if (!cue) throw new Error(`Missing focus cue ${episode}/${sceneId}/${phrase}`);
  const time = (cue.start + cue.end) / 2;
  check(`旁白主题高亮：${label}`, isTopicActive(scene, time, label) && !isTopicActive(scene, 0, label) && !isTopicActive(scene, scene.duration - .1, label), {start: cue.start, end: cue.end, sentence: cue.text});
  samples.push({scene: sceneId, time, kind: 'focus', label});
}
const pauses = timeline.scenes.flatMap(scene => (scene.pauses || []).map(pause => ({scene, pause})));
check('复习题停顿数量', pauses.length === ({'01': 3, '02': 2, '03': 2}[episode] || 0), pauses.length);
if (pauses.length) {
  const pcm = run(encoder, ['-v', 'error', '-i', `${outputDir}/episode-${episode}.mp4`, '-vn', '-ar', '16000', '-ac', '1', '-f', 's16le', 'pipe:1'], {encoding: null, maxBuffer: 32 * 1024 * 1024});
  for (const {scene, pause} of pauses) {
    const answer = scene.cues[pause.answerIndex];
    const question = scene.cues[pause.questionIndex];
    check(`答案前保留3秒：题${pause.answerIndex}`, Math.abs(answer.start - pause.start - 3) < .001 && Math.abs(question.end - answer.start) < .001, {silenceStart: pause.start, answerStart: answer.start});
    const mid = pause.start + 1.5;
    const labels = renderText(scene, mid);
    check(`停顿期间不提前显示答案：题${pause.answerIndex}`, labels.includes('想一想…') && !labels.some(label => ['是', '不是'].includes(label)), labels);
    check(`答案开始后显示结果：题${pause.answerIndex}`, renderText(scene, answer.start + .7).some(label => ['是', '不是'].includes(label)), answer.text);
    const start = Math.round((scene.start + pause.start + .15) * 16000);
    const stop = Math.round((scene.start + pause.start + 2.85) * 16000);
    let squares = 0;
    for (let sample = start; sample < stop; sample++) squares += (pcm.readInt16LE(sample * 2) / 32768) ** 2;
    const rms = Math.sqrt(squares / (stop - start));
    check(`实际MP4停顿静音：题${pause.answerIndex}`, rms < .001, {rms, threshold: .001, interval: [start / 16000, stop / 16000]});
    samples.push({scene: scene.id, time: mid, kind: 'question-hold', label: question.text});
  }
}
mkdirSync(`${outputDir}/review`, {recursive: true});
writeFileSync(`${outputDir}/review/teaching.json`, JSON.stringify({pass: results.every(item => item.pass), videoSha256: hash(readFileSync(`${outputDir}/episode-${episode}.mp4`)), results, samples, limitations: 'Sentence-aligned cues, not word-level alignment; checks do not measure learner comprehension.'}, null, 2) + '\n');
if (results.some(item => !item.pass)) process.exitCode = 1;
