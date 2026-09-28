import {palette, text, rect, line, dot, arrow, subtitleLines} from '../../scripts/art.mjs';

export {subtitleLines};
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {const position = clamp(value); return position * position * (3 - 2 * position);};
const lerp = (start, end, progress) => start + (end - start) * progress;
export const identity = Object.freeze({device: 'ET-01', run: 'RUN-17', wafer: 'W03'});

export function animationState(timeline, time) {
  const current = timeline.beats.find(beat => time >= beat.start && time < beat.start + beat.duration);
  const index = current ? Number(current.id) - 1 : 6;
  const alignBeat = timeline.beats[1];
  const alignedCue = alignBeat.cues.find(cue => cue.text.includes('匹配后'));
  const alignComplete = alignBeat.start + (alignedCue?.start ?? alignBeat.duration - 2);
  const alignStart = alignBeat.start + 1;
  const aligned = ease((time - alignStart) / Math.max(2, alignComplete - alignStart - .25));
  const wrongBeat = timeline.beats[2];
  const rejected = ease((time - wrongBeat.start - .7) / 3);
  const missing = clamp((time - wrongBeat.start - 3.7) / .8);
  const focus = ease((time - timeline.beats[3].start - .3) / 2.2);
  const predicted = ease((time - timeline.beats[4].start - .3) / 2.1);
  const summary = ease((time - timeline.beats[5].start - .4) / 2);
  const scan = clamp((time - alignStart) / Math.max(2, alignComplete - alignStart));
  return {
    time, index, current, aligned, rejected, missing, focus, predicted, summary,
    highlightRow: index === 1 && aligned < 1 ? Math.min(2, Math.floor(scan * 3)) : -1,
    currentIdentity: identity,
    wrongIdentity: {device: 'ET-01', run: 'RUN-16', wafer: 'W03'},
    associated: aligned === 1,
    wrongRecordAccepted: false,
    actualThickness: null,
    predictionValidated: false,
    claim: index < 2 ? 'pending-association' : index === 2 && rejected < 1 ? 'rejecting-candidate' : index < 4 ? 'missing-label' : 'cannot-validate',
    alignComplete,
  };
}

function label(context, value, left, top, width, color = palette.teal) {
  rect(context, left, top, width, 40, palette.pale, 20);
  text(context, value, left + width / 2, top + 20, 22, color, 500, 'center');
}

function record(context, {left, top, scale = 1, title, kind, selected = -1, conflict = false, dim = 1}) {
  context.save(); context.translate(left, top); context.scale(scale, scale); context.globalAlpha *= dim;
  const color = kind === 'wrong' ? palette.coral : kind === 'recipe' ? palette.blue : palette.teal;
  rect(context, 0, 0, 490, 280, palette.white, 18, conflict ? palette.coral : palette.line);
  rect(context, 0, 0, 7, 280, color, 3);
  text(context, title, 26, 40, 29, color, 700);
  const values = [identity.device, kind === 'wrong' ? 'RUN-16' : identity.run, identity.wafer];
  ['设备', '加工轮次', '晶圆'].forEach((name, index) => {
    const top = 82 + index * 49;
    if (selected === index || conflict && index === 1) rect(context, 20, top - 20, 450, 40, conflict && index === 1 ? palette.peach : palette.pale, 6);
    text(context, name, 30, top, 23, palette.muted);
    text(context, values[index], 460, top, 28, conflict && index === 1 ? palette.coral : palette.ink, 600, 'right');
  });
  if (kind === 'process') {
    const points = [];
    for (let step = 0; step <= 56; step++) points.push([30 + step * 7.5, 242 + Math.sin(step * .2) * 9]);
    line(context, points, color, 3);
  } else text(context, kind === 'recipe' ? '配方版本：R2（示意）' : '量测内容：其他轮次，不引用数值', 30, 243, 21, palette.muted);
  context.restore();
}

function actualCard(context, left, top, scale, opacity, focused) {
  context.save(); context.globalAlpha *= opacity; context.translate(left, top); context.scale(scale, scale);
  rect(context, 0, 0, 490, 280, palette.white, 18, focused ? palette.coral : palette.line);
  text(context, '当前晶圆 · 真实膜厚', 26, 40, 29, palette.ink, 700);
  text(context, 'ET-01 / RUN-17 / W03', 26, 87, 24, palette.muted);
  rect(context, 24, 116, 442, 91, palette.peach, 12);
  text(context, '—', 245, 156, 52, palette.coral, 600, 'center');
  text(context, '没有可靠量测记录', 245, 182, 20, palette.coral, 500, 'center');
  text(context, '缺少标签 ≠ 膜厚等于零', 26, 243, 23, palette.coral, 500);
  context.restore();
}

export function drawPilot(context, timeline, time) {
  const state = animationState(timeline, time);
  context.fillStyle = palette.paper; context.fillRect(0, 0, 1920, 1080);
  if (state.index === 6) {
    context.fillStyle = palette.dark; context.fillRect(0, 0, 1920, 1080);
    text(context, '实验小样 / 不是正式替代课程', 110, 112, 29, palette.mint, 600);
    text(context, '记录对齐了，证据不一定齐了。', 110, 303, 62, palette.white, 700);
    text(context, '没有可靠真实值，就不能验证当前预测是否准确。', 110, 411, 37, palette.mint);
    text(context, '来源：原第五集第 05 / 07 / 08 段 · 全部数据为教学示意', 110, 572, 28, '#CADAD5');
    text(context, '方法参考：LLManim 的分步变化 · 分镜先行 · 过渡状态检查', 110, 634, 28, '#CADAD5');
    text(context, '未验证学习效果 / 未经独立专业审校 / 未人工逐句试听', 110, 772, 27, '#CADAD5');
    text(context, 'AI 合成中文旁白 · 配音使用条款尚待核实', 110, 842, 28, palette.orange);
    text(context, '原五集与原质量门禁保持不变', 110, 943, 24, palette.mint);
    return state;
  }
  text(context, 'FIELD NOTES / 分镜实验', 90, 56, 24, palette.teal, 700);
  text(context, '同一对象 · 一次变化 · 一个结论', 1810, 56, 23, palette.muted, 400, 'right');
  line(context, [[90, 94], [1830, 94]], palette.line, 2);
  text(context, state.current.title, 90, 151, 54, palette.ink, 700);
  label(context, '关注晶圆', 94, 214, 156);
  text(context, 'ET-01   /   RUN-17   /   W03', 281, 234, 31, palette.ink, 600);
  text(context, '合成记录 · 不是实际设备界面', 1818, 234, 25, palette.muted, 400, 'right');

  const alignedTop = 340;
  const processLeft = lerp(140, 120, state.aligned);
  const processTop = lerp(374, alignedTop, state.aligned);
  const recipeLeft = lerp(714, 690, state.aligned);
  const recipeTop = lerp(421, alignedTop, state.aligned);
  const contextScale = lerp(1, .66, state.focus);
  record(context, {left: lerp(processLeft, 125, state.focus), top: lerp(processTop, 629, state.focus), scale: contextScale, title: '过程记录', kind: 'process', selected: state.highlightRow});
  record(context, {left: lerp(recipeLeft, 489, state.focus), top: lerp(recipeTop, 629, state.focus), scale: contextScale, title: '配方记录', kind: 'recipe', selected: state.highlightRow});

  const wrongLeft = lerp(1262, 1332, state.rejected);
  const wrongTop = lerp(329, 718, state.rejected);
  const wrongScale = lerp(1, .48, state.rejected);
  record(context, {left: wrongLeft, top: wrongTop, scale: wrongScale, title: state.rejected === 1 ? '已排除 · 不是这次加工' : '候选量测记录', kind: 'wrong', conflict: state.index >= 2, dim: lerp(1, .6, state.summary)});

  if (state.index === 1) {
    const yPosition = 422 + Math.max(0, state.highlightRow) * 49;
    if (state.highlightRow >= 0) arrow(context, 625, yPosition, 675, yPosition, palette.teal);
    text(context, state.associated ? '2 份记录已关联' : '逐项核对中…', 620, 715, 38, palette.teal, 700, 'center');
    text(context, 'ID 不改写，记录不丢失', 620, 774, 28, palette.muted, 400, 'center');
  } else if (state.index === 0) {
    text(context, '三份记录 ≠ 一个完整的验证样本', 960, 789, 36, palette.teal, 600, 'center');
  }

  const actualLeft = lerp(1262, 1015, state.focus);
  const actualTop = lerp(329, 342, state.focus);
  const actualScale = lerp(1, 1.28, state.focus) - state.predicted * .28;
  actualCard(context, lerp(actualLeft, 1130, state.predicted), actualTop, actualScale, state.missing, state.focus > 0);

  if (state.index === 2) {
    text(context, 'RUN-16  ≠  RUN-17', 608, 716, 44, palette.coral, 700, 'center');
    text(context, state.rejected === 1 ? '候选已排除，当前真实值仍缺失' : '轮次冲突，移出当前样本…', 608, 779, 30, palette.muted, 400, 'center');
  }
  if (state.focus > 0) {
    context.save(); context.globalAlpha = state.focus * (1 - state.predicted);
    text(context, '过程 ✓    配方 ✓', 128, 395, 38, palette.teal, 700);
    text(context, '还缺什么？', 128, 469, 45, palette.ink, 700);
    text(context, '真实结果，才是比较的依据。', 128, 539, 31, palette.muted);
    arrow(context, 750, 487, 980, 487, palette.coral);
    context.restore();
    text(context, '原始上下文仍保留', 128, 598, 24, palette.muted);
  }
  if (state.predicted > 0) {
    context.save(); context.globalAlpha = state.predicted;
    rect(context, 125, 345, 666, 216, palette.white, 18, palette.blue);
    text(context, '模型预测', 157, 391, 32, palette.blue, 700);
    text(context, '预测值（示意，不给出数值）', 157, 457, 31, palette.ink, 600);
    text(context, '有输出，并不代表输出正确', 157, 518, 26, palette.muted);
    text(context, '对照', 960, 407, 30, palette.muted, 500, 'center');
    line(context, [[839, 462], [1078, 462]], palette.coral, 3, [8, 8]);
    text(context, '？', 958, 490, 49, palette.coral, 700, 'center');
    text(context, '缺少真实值', 958, 541, 27, palette.coral, 500, 'center');
    text(context, '无法核对误差', 958, 580, 27, palette.coral, 500, 'center');
    context.restore();
  }
  if (state.summary > 0) {
    context.save(); context.globalAlpha = state.summary;
    rect(context, 92, 620, 1730, 239, palette.paper, 16);
    text(context, '待办，不是已经完成', 118, 650, 28, palette.coral, 600);
    ['授权补齐量测', '核对记录', '独立数据验证'].forEach((value, index) => {
      rect(context, 120 + index * 580, 684, 520, 67, palette.white, 14, palette.line);
      text(context, value, 380 + index * 580, 718, 30, palette.teal, 600, 'center');
      if (index < 2) arrow(context, 655 + index * 580, 718, 681 + index * 580, 718, palette.muted);
    });
    text(context, '当前可先做：记录检索 / 异常提示    ≠    膜厚结论', 958, 810, 30, palette.ink, 600, 'center');
    context.restore();
  }
  text(context, '关联条件仅为简化示意，实际还需核对位置、量测定义和时间语义', 94, 893, 22, palette.muted);
  text(context, 'AI 合成配音 / 实验小样', 1818, 893, 22, palette.muted, 400, 'right');
  rect(context, 90, 926, 1740, 106, palette.dark, 15);
  const cue = timeline.cues.find(cue => time >= cue.start && time < cue.end);
  if (cue) {
    const lines = subtitleLines(context, cue.text);
    lines.forEach((value, index) => text(context, value, 960, 980 + (index - (lines.length - 1) / 2) * 44, 37, palette.white, 400, 'center'));
  } else text(context, state.index === 5 ? '先补证据，再判断模型表现' : '看清这一步发生了什么', 960, 980, 27, '#BCD2CB', 400, 'center');
  rect(context, 90, 1053, 1740, 4, palette.line, 2);
  rect(context, 90, 1053, 1740 * clamp(time / timeline.duration), 4, palette.teal, 2);
  return state;
}
