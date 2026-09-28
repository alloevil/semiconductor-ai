import {palette, text, rect, line} from './art.mjs';

const smooth = value => {const amount = Math.max(0, Math.min(1, value)); return amount * amount * (3 - 2 * amount);};
const mix = (first, last, amount) => first + (last - first) * amount;
export function knowledgeState(scene, time) {
  const matching = scene.cues.find(cue => cue.text.includes('版本是否匹配'));
  const insufficient = scene.cues.find(cue => cue.text.includes('证据不足'));
  if (!matching || !insufficient) throw new Error('Missing knowledge narration anchors');
  return {identity: 'ET-01 / R2', oldId: 'Doc-A / R1', candidateId: 'Doc-B / R2', filtered: smooth((time - matching.start - .3) / 3.5), insufficient: smooth((time - insufficient.start - .2) / 2.3), acceptedOld: false, rootCause: null, commands: 0};
}

function documentCard(context, left, top, title, id, color, scale = 1) {
  context.save(); context.translate(left, top); context.scale(scale, scale);
  rect(context, 0, 0, 410, 215, palette.white, 16, color);
  text(context, title, 24, 38, 29, color, 700);
  text(context, id, 24, 93, 31, palette.ink, 600);
  text(context, '合成手册示例 · 非维修步骤', 24, 143, 22, palette.muted);
  line(context, [[24, 177], [326, 177]], palette.line, 5);
  context.restore();
}

export function drawKnowledge(context, scene, time) {
  const state = knowledgeState(scene, time);
  text(context, '同一问题：ET-01 / R2，异常该如何排查？', 111, 295, 29, palette.teal, 600);
  rect(context, 100, 326, 890, 445, palette.pale, 22, palette.line);
  text(context, '检索结果，不等于诊断结论', 132, 367, 28, palette.teal, 600);
  documentCard(context, mix(129, 147, state.filtered), mix(406, 638, state.filtered), state.filtered === 1 ? '排除：版本不符' : '检索到旧版', state.oldId, palette.coral, mix(1, .52, state.filtered));
  documentCard(context, mix(554, 493, state.filtered), mix(461, 410, state.filtered), state.filtered === 1 ? '仅作为候选依据' : '检索到匹配版本', state.candidateId, palette.blue);
  if (state.filtered === 1) text(context, '版本匹配，仍需检查权限与现场条件', 492, 718, 24, palette.muted);
  rect(context, 1060, 326, 760, 445, palette.white, 22, palette.line);
  text(context, '现场证据', 1096, 374, 33, palette.ink, 700);
  rect(context, 1096, 414, 686, 108, palette.peach, 12);
  text(context, '—  仍需补充故障上下文', 1439, 465, 31, palette.coral, 600, 'center');
  if (state.insufficient > 0) {
    context.save(); context.globalAlpha = state.insufficient;
    text(context, '暂不能确定，需补充信息', 1096, 588, 36, palette.coral, 700);
    text(context, '不编造维修步骤，不向设备下指令', 1096, 651, 28, palette.ink, 600);
    context.restore();
  } else text(context, '不能只凭文档就认定原因', 1096, 600, 29, palette.muted);
  text(context, '工程师确认 / 安全规程 / 数据权限', 1096, 728, 26, palette.muted);
  return state;
}
