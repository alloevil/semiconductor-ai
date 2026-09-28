import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {episode, outputDir} from './lib.mjs';
import {drawFrame} from './art-business.mjs';

if (episode !== '05') throw new Error('Use --episode=05');
const timeline = JSON.parse(readFileSync(`${outputDir}/timeline.json`, 'utf8'));
const context = createCanvas(1920, 1080).getContext('2d');
const originalText = context.fillText.bind(context);
const originalMove = context.moveTo.bind(context);
const originalLine = context.lineTo.bind(context);
let labels = [];
let segments = [];
let previous = null;
context.fillText = (value, ...args) => {labels.push(value); return originalText(value, ...args);};
context.moveTo = (left, top) => {previous = [left, top]; return originalMove(left, top);};
context.lineTo = (left, top) => {
  if (previous) segments.push([...previous, left, top]);
  previous = [left, top];
  return originalLine(left, top);
};
const results = [];
function check(name, pass) {
  results.push({name, pass});
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
}
function hasSegment(expected) {
  return segments.some(segment => segment.every((value, index) => Math.abs(value - expected[index]) < 0.1));
}
for (const sceneId of ['06', '07', '08']) {
  const scene = timeline.scenes.find(item => item.id === sceneId);
  labels = []; segments = [];
  drawFrame(context, scene, scene.duration * .65, timeline);
  if (sceneId === '06') {
    check('产品算法与内部提效有独立标题', labels.includes('设备产品能力') && labels.includes('公司内部提效'));
    check('内部提效包含具体任务而非缺陷分类结果', ['装配检查', '调试报告', '软件测试'].every(label => labels.includes(label)));
  } else if (sceneId === '07') {
    check('数据字段明确为联合关联键', labels.includes('联合关联键，不是工序顺序'));
    check('字段之间不保留原来的流程箭头', !hasSegment([585, 372, 710, 372]) && !hasSegment([1180, 372, 1305, 372]));
    check('关联前强调授权与客户边界', labels.includes('仅在授权范围内关联') && labels.includes('客户 A 数据边界') && labels.includes('客户 B 数据边界'));
  } else {
    check('模型在评测前冻结', labels.includes('冻结模型与配置') && labels.includes('测试期间不再调参'));
    check('两种方法使用同一份留出数据', labels.includes('同一份留出测试数据') && labels.includes('现有规则 / 人工') && labels.includes('AI 方法'));
    check('同一测试节点分别指向两种方法', hasSegment([685, 535, 455, 625]) && hasSegment([1235, 535, 1420, 625]));
    check('训练数据连接冻结模型而不是孤立标签', hasSegment([885, 372, 1035, 372]));
  }
}
mkdirSync(`${outputDir}/review`, {recursive: true});
const report = {pass: results.every(item => item.pass), scope: 'Rendered source text and arrow regression contracts at 65% of scenes 06–08. Does not prove conceptual correctness; compare actual decoded frames separately.', results};
writeFileSync(`${outputDir}/review/diagram-contract.json`, JSON.stringify(report, null, 2) + '\n');
if (!report.pass) process.exitCode = 1;
