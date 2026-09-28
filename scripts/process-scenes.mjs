import {palette, text, rect, line, arrow, tag} from './art.mjs';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {const amount = clamp(value); return amount * amount * (3 - 2 * amount);};
const mix = (start, end, value) => start + (end - start) * value;
function anchor(scene, phrase) {
  const cue = scene.cues.find(item => item.text.includes(phrase));
  if (!cue) throw new Error(`Missing process anchor ${scene.id}: ${phrase}`);
  return cue.start;
}

export const processScenes = {'03': '04', '04': '04', '05': '07'};

export function processState(episode, scene, time) {
  if (episode === '03') {
    const placement = ease((time - anchor(scene, '封装不仅') - .4) / 3);
    const second = ease((time - anchor(scene, '先进封装') - 1.2) / 3);
    return {kind: 'packaging', placement, second, connections: ease((time - anchor(scene, '封装不仅') - 3.4) / 2), ids: ['裸片 A', '裸片 B'], base: '同一封装基底', certified: false};
  }
  if (episode === '04') {
    const align = ease((time - anchor(scene, '物料清单') - .3) / 3.4);
    const install = ease((time - anchor(scene, '质量检查') - .3) / 4.5);
    return {kind: 'assembly', align, install, ids: ['ET-01', 'P1 / R2', 'P2 / R1'], status: '待调试验证', certified: false};
  }
  const align = ease((time - anchor(scene, '关联到') - .3) / 3.2);
  const reject = ease((time - anchor(scene, '标签不准') - .2) / 2.8);
  return {kind: 'records', align, reject, ids: ['客户 A', 'ET-01', 'RUN-17', 'W03'], rejectedRun: 'RUN-16', actualThickness: null, acceptedWrongRecord: false, certified: false};
}

function bareDie(context, left, top, width, title, color) {
  rect(context, left, top + 7, width, 114, '#738B94', 5);
  rect(context, left, top, width, 114, '#D6E5DF', 5, color);
  rect(context, left + 16, top + 14, width - 32, 44, color, 3);
  for (let index = 0; index < 5; index++) line(context, [[left + 20 + index * 24, top + 71], [left + 20 + index * 24, top + 96]], '#AA8C43', 3);
  text(context, title, left + width / 2, top + 37, 24, palette.white, 600, 'center');
}

function drawPackaging(context, state) {
  rect(context, 100, 303, 1100, 482, palette.white, 22, palette.line);
  text(context, '同一组裸片，组合成封装结构', 138, 345, 30, palette.teal, 600);
  rect(context, 209, 624, 871, 59, '#C4D9CD', 8, '#7E9C8D');
  for (let index = 0; index < 12; index++) rect(context, 246 + index * 68, 682, 20, 12, '#BFA46C', 4);
  text(context, '封装基底与外部连接（示意）', 645, 745, 27, palette.muted, 400, 'center');
  bareDie(context, mix(276, 357, state.placement), mix(410, 500, state.placement), 180, state.ids[0], palette.teal);
  bareDie(context, mix(873, 733, state.second), mix(388, 500, state.second), 180, state.ids[1], palette.blue);
  if (state.placement === 1) {
    line(context, [[382, 617], [382, 651], [326, 651]], palette.orange, 4);
    line(context, [[508, 617], [508, 651], [574, 651]], palette.orange, 4);
  }
  if (state.second === 1) {
    line(context, [[758, 617], [758, 651], [690, 651]], palette.orange, 4);
    line(context, [[886, 617], [886, 651], [953, 651]], palette.orange, 4);
  }
  context.save(); context.globalAlpha = state.connections;
  line(context, [[276, 594], [276, 470], [972, 470], [972, 594]], palette.coral, 3, [9, 7]);
  text(context, '保护 / 热管理范围示意', 637, 436, 25, palette.coral, 500, 'center');
  context.restore();
  const labels = [['内部', '裸片不是外部封装'], ['连接', '连接裸片与外部电路'], ['多裸片', state.second === 1 ? '同一基底内的两个裸片' : '第二块裸片尚未落位']];
  labels.forEach(([title, detail], index) => {
    text(context, title, 1290, 380 + index * 137, 25, palette.teal, 600);
    text(context, detail, 1290, 428 + index * 137, 30, palette.ink, 600);
  });
  text(context, '仅说明功能关系，不是特定封装流程', 1290, 761, 22, palette.muted);
}

function component(context, left, top, code, color) {
  rect(context, left, top, 205, 83, palette.white, 11, color);
  rect(context, left + 13, top + 15, 46, 50, color, 6);
  text(context, code, left + 76, top + 43, 24, palette.ink, 600);
}

function drawAssembly(context, state) {
  rect(context, 100, 311, 730, 454, palette.white, 22, palette.line);
  text(context, '物料清单 / ET-01', 139, 356, 33, palette.teal, 700);
  [['P1', 'R2'], ['P2', 'R1']].forEach(([part, version], index) => {
    const top = 410 + index * 101;
    rect(context, 129, top, 670, 76, palette.pale, 10);
    text(context, `需要：${part} / ${version}`, 156, top + 37, 28, palette.teal, 600);
    text(context, state.install === 1 ? '已装入 · 保留记录' : '版本核对 / 装配中', 776, top + 37, 25, palette.muted, 400, 'right');
  });
  text(context, '版本身份在移动中保持不变', 139, 660, 28, palette.muted);
  text(context, '实际质量结论仍需试验和验收', 139, 715, 26, palette.coral);
  rect(context, 1165, 341, 585, 361, '#D9E5E0', 20, '#688482');
  text(context, '设备 ET-01', 1455, 386, 34, palette.ink, 700, 'center');
  for (let index = 0; index < 2; index++) {
    const top = 443 + index * 115;
    rect(context, 1330, top, 237, 91, '#F0F3EA', 10, '#8EA399');
    const startLeft = mix(855, 927, state.align);
    component(context, mix(startLeft, 1346, state.install), mix(421 + index * 159, top + 4, state.install), state.ids[index + 1], index ? palette.blue : palette.teal);
  }
  text(context, state.status, 1458, 742, 34, palette.coral, 700, 'center');
  text(context, '装入 ≠ 已通过验证', 983, 758, 25, palette.muted, 400, 'center');
}

function record(context, left, top, width, title, run, color, small = false) {
  const height = small ? 147 : 215;
  rect(context, left, top, width, height, palette.white, 13, color);
  text(context, title, left + 19, top + 30, small ? 22 : 28, color, 700);
  text(context, 'ET-01 / W03', left + 19, top + (small ? 68 : 86), small ? 22 : 27, palette.ink, 500);
  text(context, run, left + 19, top + (small ? 113 : 141), small ? 26 : 33, color, 700);
  if (!small) text(context, '记录身份仅作教学示意', left + 19, top + 187, 21, palette.muted);
}

function drawRecords(context, state) {
  text(context, '仅在授权范围内关联', 107, 291, 25, palette.teal, 600);
  rect(context, 100, 325, 1372, 443, '#E6EFE7', 20, palette.teal);
  text(context, '客户 A 数据边界', 130, 362, 29, palette.teal, 700);
  text(context, '联合关联键，不是工序顺序', 970, 362, 25, palette.muted);
  record(context, 129, mix(430, 401, state.align), 339, '过程记录', 'RUN-17', palette.teal);
  record(context, 499, mix(487, 401, state.align), 339, '配方记录', 'RUN-17', palette.blue);
  if (state.align === 1) {
    text(context, 'ET-01 + RUN-17 + W03', 479, 672, 28, palette.teal, 600, 'center');
    text(context, '相同加工上下文；还需核对量测定义与位置', 479, 720, 23, palette.muted, 400, 'center');
  } else text(context, '记录按身份归拢中…', 479, 710, 30, palette.teal, 600, 'center');
  record(context, mix(982, 916, state.reject), mix(418, 601, state.reject), 489, state.reject === 1 ? '隔离：不是同一轮加工' : '量测候选', state.rejectedRun, palette.coral, true);
  if (state.reject > .7) {
    context.save(); context.globalAlpha = (state.reject - .7) / .3;
    rect(context, 916, 401, 489, 174, palette.white, 12, palette.coral);
    text(context, 'RUN-17 / W03 的真实膜厚', 941, 438, 25, palette.ink, 600);
    text(context, '—  缺少可靠量测标签', 941, 497, 28, palette.coral, 700);
    text(context, '不能用另一轮记录填补', 941, 547, 22, palette.muted);
    context.restore();
  }
  rect(context, 1535, 325, 285, 443, palette.ice, 20, palette.blue);
  text(context, '客户 B 数据边界', 1677, 369, 25, palette.blue, 700, 'center');
  rect(context, 1595, 458, 165, 132, palette.white, 12, palette.blue);
  text(context, '未授权', 1677, 508, 30, palette.blue, 600, 'center');
  text(context, '不参与关联', 1677, 555, 24, palette.muted, 400, 'center');
  text(context, '更多记录 ≠ 更可靠', 1677, 700, 22, palette.blue, 500, 'center');
}

export function drawProcessScene(context, episode, scene, time) {
  const state = processState(episode, scene, time);
  if (state.kind === 'packaging') drawPackaging(context, state);
  else if (state.kind === 'assembly') drawAssembly(context, state);
  else drawRecords(context, state);
  return state;
}
