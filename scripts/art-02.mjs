import {palette, text, rect, line, arrow, dot, tag, reveal, callout, wafer, subtitleLines, clamp} from './art.mjs';

export {subtitleLines};
const ease = value => 1 - (1 - clamp(value)) ** 3;
const windows = [[180, 120], [520, 120], [860, 120]];
const protectedAreas = [[0, 180], [300, 220], [640, 220], [980, 120]];
const headings = [
  ['从一片硅，到复杂电路。', '不是粘上零件，而是在晶圆上反复加工'],
  ['沉积：在表面形成一层薄膜。', '不同功能，使用不同材料与方法'],
  ['曝光：先改变光刻胶的性质。', '这里用正性光刻胶举例，不代表所有工艺'],
  ['显影：把胶上的图案变成开口。', '开口下面的目标薄膜，此时还没有被刻掉'],
  ['刻蚀：移除开口下的目标材料。', '控制深度、形状，以及对其他材料的影响'],
  ['去胶与清洗：准备下一步的表面。', '清洗穿插在制造过程，不是只在最后做一次'],
  ['还要改变材料性质、调整表面形状。', '用途举例，下面三项不代表固定工艺顺序'],
  ['机器没报警，不等于结果合格。', '量测回答“有多少”，检测帮助发现“哪里异常”'],
  ['反复加工，逐步构成器件和连接。', '每一轮的材料、图案与工艺组合都可能不同'],
  ['现在，你能读懂设备的任务了。', '先理解它改变什么，再理解公司如何分工'],
];

function timeOf(scene, phrase, fraction = 0.4) {
  return scene.cues.find(cue => cue.text.includes(phrase))?.start ?? scene.duration * fraction;
}

function progress(scene, time, phrase, duration = 3, fraction = 0.4) {
  return ease((time - timeOf(scene, phrase, fraction)) / duration);
}

function notes(context, entries, time, scene) {
  entries.forEach(([label, detail, phrase], index) => reveal(context, time, phrase ? timeOf(scene, phrase, index * 0.17) : 0.4 + index * 0.9, () => {
    const top = 385 + index * 116;
    text(context, label, 1320, top, 26, palette.teal, 600);
    text(context, detail, 1320, top + 48, 31, palette.ink, 600);
  }));
}

function section(context, {film = 1, resist = 0, exposed = 0, developed = 0, etched = 0, stripped = 0, residual = 0} = {}) {
  rect(context, 100, 294, 1160, 491, palette.white, 23, palette.line);
  tag(context, '同一块示意剖面', 130, 338, palette.ink, palette.paper);
  const left = 130;
  rect(context, left, 585, 1100, 106, '#A9BDC8', 4);
  text(context, '已有衬底 / 下层结构', left + 550, 640, 28, '#476677', 400, 'center');
  const filmHeight = 85 * film;
  if (filmHeight > 0) {
    for (const [start, width] of protectedAreas) rect(context, left + start, 585 - filmHeight, width, filmHeight, palette.teal, 0);
    for (const [start, width] of windows) rect(context, left + start, 585 - filmHeight * (1 - etched), width, filmHeight * (1 - etched), palette.teal, 0);
  }
  if (resist > 0 && stripped < 1) {
    const height = 52 * resist * (1 - stripped);
    for (const [start, width] of protectedAreas) rect(context, left + start, 500 - height, width, height, palette.orange, 0);
    for (const [start, width] of windows) rect(context, left + start, 500 - height * (1 - developed), width, height * (1 - developed), exposed > 0.5 ? '#F8DFAD' : palette.orange, 0);
  }
  if (residual > 0) {
    context.save(); context.globalAlpha = residual;
    [[72, 490], [371, 490], [720, 490], [883, 574], [228, 574], [552, 574]].forEach(([horizontal, vertical], index) => dot(context, left + horizontal, vertical, 5 + index % 3, palette.coral));
    context.restore();
  }
  tag(context, '衬底 / 下层', 149, 740, '#476677', '#E1E9EC');
  tag(context, '目标薄膜', 408, 740, palette.teal, palette.pale);
  if (resist > 0 && stripped < 1) tag(context, '光刻胶', 640, 740, '#95651D', '#F9EBCB');
}

function particles(context, time, {top = 374, bottom = 490, color = palette.teal, active = 1, openingsOnly = false} = {}) {
  context.save(); context.globalAlpha *= active * 0.7;
  for (let index = 0; index < 22; index++) {
    const horizontal = openingsOnly ? 130 + windows[index % 3][0] + 18 + (index * 17 % 84) : 160 + index * 48;
    const vertical = top + ((time * 37 + index * 21) % (bottom - top));
    dot(context, horizontal, vertical, 4, color);
  }
  context.restore();
}

function intro(context, time, scene) {
  wafer(context, 960, 536, 280, time, progress(scene, time, '反复加工', 7));
  const actions = [['增加材料', 230, 345], ['形成图案', 1390, 345], ['去掉材料', 1390, 635], ['检查结果', 230, 635]];
  actions.forEach(([label, left, top], index) => reveal(context, time, 1 + index * 1.4, () => {
    rect(context, left, top, 300, 113, palette.white, 20, palette.line);
    text(context, `0${index + 1}`, left + 25, top + 30, 22, palette.muted);
    text(context, label, left + 150, top + 70, 37, palette.teal, 700, 'center');
  }));
  arrow(context, 570, 384, 1350, 384, palette.teal, ease((time - 3) / 2));
  arrow(context, 1540, 478, 1540, 612, palette.teal, ease((time - 5) / 2));
  arrow(context, 1350, 740, 570, 740, palette.teal, ease((time - 7) / 2));
  arrow(context, 380, 610, 380, 478, palette.teal, ease((time - 9) / 2));
  callout(context, '看的是工艺的作用，不是实际生产配方。', '简化循环 · 实际顺序因产品而异');
}

function deposition(context, time, scene) {
  const grown = progress(scene, time, '形成一层', 9, 0.15);
  section(context, {film: grown});
  particles(context, time, {active: grown > 0 && grown < 1 ? 1 : 0.15, bottom: 578 - grown * 85});
  if (grown > 0.8) {
    line(context, [[1178, 502], [1198, 502], [1188, 502], [1188, 582], [1178, 582], [1198, 582]], palette.white, 3);
    text(context, '厚度', 1110, 544, 26, palette.white, 600);
  }
  notes(context, [['材料', '导电 / 绝缘等', '根据用途'], ['质量', '厚度与均匀性', '厚度'], ['形状', '复杂结构的覆盖', '覆盖']], time, scene);
  callout(context, '“有一层膜”还不够，还要满足加工要求。', '颜色用于区分材料');
}

function exposure(context, time, scene) {
  const coated = progress(scene, time, '光刻胶', 2, 0.3);
  const exposed = progress(scene, time, '曝光', 4, 0.55);
  section(context, {resist: coated, exposed});
  if (coated > 0.5) {
    tag(context, '图案投影（功能框图）', 474, 385, palette.blue, palette.ice);
    context.save(); context.globalAlpha = exposed * 0.3;
    for (const [start, width] of windows) rect(context, 130 + start, 412, width, 88, '#E4A64A', 0);
    context.restore();
    if (exposed > 0) text(context, '曝光区域：性质改变，材料还在', 684, 708, 26, '#946A2D', 600, 'center');
  }
  notes(context, [['第一步', '涂上光刻胶', '光刻胶'], ['第二步', '用光改变胶的性质', '曝光'], ['不是', '直接雕刻硅片', '不是用光']], time, scene);
  callout(context, '曝光改变的是光刻胶，不是直接挖掉硅。', '正性光刻胶示例');
}

function develop(context, time, scene) {
  const developed = progress(scene, time, '选择性去除', 6, 0.3);
  section(context, {resist: 1, exposed: 1, developed});
  for (const [start, width] of windows) {
    if (developed > 0.1) arrow(context, 130 + start + width / 2, 405, 130 + start + width / 2, 492, palette.blue, developed);
  }
  notes(context, [['显影前', '胶层仍然连续', '曝光之后'], ['显影后', '开口露出目标膜', '开口'], ['留意下面', '绿色薄膜仍完整', '目标薄膜']], time, scene);
  callout(context, '曝光改变性质；显影形成开口。', '这一步尚未刻蚀目标膜');
}

function etch(context, time, scene) {
  const etched = progress(scene, time, '移除', 7, 0.15);
  section(context, {resist: 1, exposed: 1, developed: 1, etched});
  particles(context, time, {openingsOnly: true, color: palette.blue, bottom: 500 + etched * 76, active: etched < 1 ? 1 : 0.15});
  notes(context, [['控制什么', '去除深度', '多少'], ['还要看', '侧壁形状', '侧壁'], ['不能忽略', '保留材料是否受损', '受损']], time, scene);
  callout(context, '去掉该去的材料，保住该保留的结构。', '简化方向性刻蚀示意');
}

function cleaning(context, time, scene) {
  const stripped = progress(scene, time, '去除', 4, 0.3);
  const cleaned = progress(scene, time, '因此需要清洗', 7, 0.5);
  section(context, {resist: 1, exposed: 1, developed: 1, etched: 1, stripped, residual: stripped * (1 - cleaned)});
  if (cleaned > 0 && cleaned < 1) {
    const left = 145 + cleaned * 1070;
    line(context, [[left, 435], [left, 590]], '#4482B488', 5);
  }
  notes(context, [['去胶', '移除暂时的保护层', '光刻胶'], ['清洗', '处理颗粒和残留', '清洗'], ['时机', '穿插多个工序', '穿插']], time, scene);
  callout(context, '清洗不是“最后冲一下”，而是贯穿过程。', '颗粒放大示意 · 非操作指南');
}

function extraSteps(context, time, scene) {
  const headings = ['离子注入', '热处理', '平坦化'];
  const subtitles = ['调整电学性质', '修复损伤、激活掺杂等', '让表面更平整'];
  const phrases = ['离子注入', '热处理', '平坦化'];
  headings.forEach((heading, index) => {
    const left = 100 + index * 587;
    const active = progress(scene, time, phrases[index], 7, 0.1 + index * 0.25);
    rect(context, left, 310, 546, 453, palette.white, 22, palette.line);
    text(context, heading, left + 273, 366, 37, palette.teal, 700, 'center');
    rect(context, left + 50, 534, 446, 99, '#BACAD2', 3);
    if (index === 0) {
      for (let particle = 0; particle < 9; particle++) {
        const horizontal = left + 78 + particle * 47;
        const vertical = 445 + ((time * 28 + particle * 31) % 155);
        if (active > 0) dot(context, horizontal, vertical, 6, palette.blue);
      }
      line(context, [[left + 63, 409], [left + 481, 409]], palette.blue, 5);
    } else if (index === 1) {
      for (let row = 0; row < 3; row++) for (let column = 0; column < 7; column++) {
        const shift = (1 - active) * Math.sin(column * 2 + row * 4) * 10;
        dot(context, left + 96 + column * 58 + shift, 555 + row * 29, 6, active > 0.5 ? palette.teal : palette.coral);
      }
      if (active > 0) for (let plume = 0; plume < 4; plume++) {
        const points = [];
        for (let tick = 0; tick < 30; tick++) points.push([left + 153 + plume * 82 + Math.sin(tick / 4 + time) * 8, 485 - tick * 2]);
        line(context, points, '#CB674F88', 3);
      }
    } else {
      for (let bar = 0; bar < 9; bar++) {
        const height = 25 + (bar % 3) * 23 * (1 - active);
        rect(context, left + 50 + bar * 49.5, 534 - height, 50, height, palette.teal, 0);
      }
      rect(context, left + 65 + Math.sin(time) * active * 12, 405 + active * 83, 411, 22, palette.orange, 5);
    }
    text(context, subtitles[index], left + 273, 710, 27, palette.muted, 400, 'center');
  });
  callout(context, '改变性质与形状，也是制造的重要部分。', '三项用途示例，不是顺序图');
}

function metrology(context, time, scene) {
  rect(context, 100, 309, 1120, 456, palette.white, 22, palette.line);
  tag(context, '教学示例：归一化量测值', 130, 351, palette.blue, palette.ice);
  rect(context, 240, 443, 846, 134, palette.pale, 2);
  text(context, '示例目标带', 240, 414, 25, palette.teal);
  line(context, [[235, 401], [235, 666], [1114, 666]], palette.muted, 3);
  text(context, '位置 / 样本', 1097, 708, 24, palette.muted, 400, 'right');
  const samples = [520, 504, 534, 521, 488, 383, 476, 515, 525, 501, 497];
  const drawn = clamp((time - 1) / 12);
  const count = Math.max(1, Math.ceil(samples.length * drawn));
  line(context, samples.slice(0, count).map((vertical, index) => [255 + index * 80, vertical]), palette.blue, 5);
  samples.slice(0, count).forEach((vertical, index) => dot(context, 255 + index * 80, vertical, index === 5 ? 9 : 5, index === 5 ? palette.coral : palette.blue));
  if (count > 5) {text(context, '超出目标带', 742, 408, 25, palette.coral, 600); arrow(context, 734, 403, 670, 386, palette.coral);}
  notes(context, [['量测', '厚度、尺寸、套刻', '量测可以'], ['检测', '颗粒与异常图案', '检测帮助'], ['反馈', '比较要求，再判断', '与要求比较']], time, scene);
  callout(context, '不是“测到了数值”就结束，还要对照要求。', '教学曲线，无单位、非工厂实测');
}

function repeat(context, time, scene) {
  rect(context, 100, 309, 1040, 456, palette.white, 22, palette.line);
  tag(context, '器件与连接的分层示意', 130, 351);
  rect(context, 179, 644, 880, 58, '#A9BDC8', 2);
  const building = progress(scene, time, '多层连接', 8, 0.3);
  for (let layer = 0; layer < 5; layer++) {
    const opacity = clamp(building * 5 - layer);
    context.save(); context.globalAlpha = opacity;
    rect(context, 179, 601 - layer * 45, 880, 41, layer % 2 ? '#E1ECE6' : '#C9DBD6', 1);
    const offset = layer % 2 * 63;
    for (let stripe = 0; stripe < 4; stripe++) {
      rect(context, 210 + stripe * 194 + offset, 610 - layer * 45, 117, 12, palette.teal, 1);
      rect(context, 254 + stripe * 194, 609 - layer * 45, 13, 40, palette.orange, 1);
    }
    context.restore();
  }
  text(context, '每层图案、材料与作用都可能不同', 620, 733, 26, palette.muted, 400, 'center');
  const labels = ['反复加工', '清洗 / 检查', '晶圆测试', '分割 / 封装'];
  labels.forEach((label, index) => reveal(context, time, index * 2 + 0.3, () => {
    const top = 357 + index * 110;
    tag(context, label, 1296, top, index < 2 ? palette.teal : palette.blue, index < 2 ? palette.pale : palette.ice, 410);
    if (index < 3) arrow(context, 1500, top + 33, 1500, top + 71, palette.muted);
  }));
  callout(context, '一轮图案转移，只是漫长制造中的一小段。', '后续流程随产品变化');
}

function quiz(context, time, scene) {
  const second = timeOf(scene, '清洗只在最后');
  const next = timeOf(scene, '下一集');
  if (time < next) {
    const cleaning = time >= second;
    const phrase = cleaning ? '清洗只在最后' : '直接雕刻';
    const questionCue = scene.cues.find(cue => cue.text.includes(phrase));
    const answered = time > (questionCue?.end ?? 10);
    rect(context, 190, 314, 1540, 450, palette.white, 26, palette.line);
    tag(context, `问题 ${cleaning ? '2' : '1'} / 2`, 246, 365);
    text(context, cleaning ? '清洗只在最后做一次吗？' : '光刻机直接把硅片雕出沟槽吗？', 960, 467, 48, palette.ink, 700, 'center');
    text(context, answered ? '不是' : '想一想…', 960, 571, answered ? 67 : 35, answered ? palette.coral : palette.muted, 600, 'center');
    if (answered) text(context, cleaning ? '清洗穿插在许多工序之间。' : '曝光改变光刻胶；显影开口；刻蚀移除目标材料。', 960, 685, 30, palette.teal, 500, 'center');
  } else {
    text(context, '下一集：半导体产业链，谁在做什么？', 960, 364, 48, palette.ink, 700, 'center');
    [['设计芯片', '设计公司'], ['制造芯片', '晶圆厂'], ['提供工具与材料', '设备 / 材料商']].forEach(([role, label], index) => reveal(context, time, next + index * 0.4, () => {
      const left = 140 + index * 574;
      rect(context, left, 456, 494, 220, palette.white, 20, palette.line);
      text(context, label, left + 247, 523, 38, palette.teal, 700, 'center');
      text(context, role, left + 247, 600, 30, palette.muted, 400, 'center');
    }));
  }
  callout(context, '设备的名字，来自它承担的加工或检查任务。');
}

const drawers = [intro, deposition, exposure, develop, etch, cleaning, extraSteps, metrology, repeat, quiz];

export function drawFrame(context, scene, time, timeline) {
  context.fillStyle = palette.paper; context.fillRect(0, 0, 1920, 1080);
  line(context, [[100, 99], [1820, 99]], palette.line, 2);
  text(context, 'FIELD NOTES', 100, 58, 22, palette.teal, 700);
  text(context, '半导体入门  /  制造过程', 304, 58, 23, palette.muted);
  text(context, 'EPISODE 02', 1819, 58, 22, palette.teal, 700, 'right');
  const index = Number(scene.id) - 1;
  text(context, headings[index][0], 100, 160, 54, palette.ink, 700);
  text(context, headings[index][1], 104, 229, 26, palette.muted);
  text(context, scene.id, 1715, 167, 73, palette.teal, 600, 'right');
  text(context, '/ 10', 1736, 181, 26, palette.muted);
  context.save(); context.globalAlpha = Math.min(ease(time / 0.5), ease((scene.duration - time) / 0.5));
  drawers[index](context, time, scene); context.restore();
  text(context, '原理示意 · 非真实比例 · 非完整器件工艺', 100, 903, 19, palette.muted);
  text(context, '中文旁白由 AI 合成', 1819, 903, 19, palette.muted, 400, 'right');
  rect(context, 100, 925, 1720, 103, palette.dark, 16);
  const cue = scene.cues.find(item => time >= item.start && time < item.end);
  if (cue) {
    const lines = subtitleLines(context, cue.text);
    lines.forEach((value, position) => text(context, value, 960, 976 + (position - (lines.length - 1) / 2) * 45, 39, palette.white, 400, 'center'));
  } else text(context, '半导体入门  /  02', 960, 976, 26, '#B4C5C4', 400, 'center');
  rect(context, 100, 1050, 1720, 4, palette.line, 2);
  rect(context, 100, 1050, 1720 * clamp((scene.start + time) / timeline.duration), 4, palette.teal, 2);
}

export function drawCredits(context, time) {
  context.fillStyle = palette.dark; context.fillRect(0, 0, 1920, 1080);
  text(context, 'FIELD NOTES  /  半导体入门 · 第二集', 110, 94, 26, palette.mint, 600);
  text(context, '从加工动作，看懂制造过程。', 110, 248, 64, palette.white, 700);
  text(context, '增加材料 / 形成图案 / 去除材料 / 检查反馈', 110, 343, 37, palette.mint);
  text(context, '内容依据', 110, 467, 27, palette.orange, 600);
  ['ASML · Semiconductor manufacturing / Metrology', 'Lam Research · Deposition / Etch / Strip & Clean', '补充：离子注入、退火与 CMP 的机理资料'].forEach((label, index) => text(context, label, 110, 532 + index * 62, 29, '#D4E2DB'));
  text(context, '链接与适用边界：content/episode-02.md', 110, 744, 26, palette.mint);
  rect(context, 1240, 443, 570, 304, '#1E3B42', 22, '#436069');
  text(context, '下一集', 1280, 496, 28, palette.orange, 600);
  text(context, '产业链里的公司', 1280, 579, 43, palette.white, 700);
  text(context, '分别在做什么？', 1280, 652, 43, palette.white, 700);
  text(context, 'JavaScript 原创动画 · 中文旁白由 AI 合成 · 无背景音乐', 110, 866, 28, palette.mint);
  text(context, '科普试播版 · 非操作指南 · 未经行业专家审校', 110, 933, 25, '#B4C7C0');
  text(context, 'Microsoft Xiaoxiao Neural / 配音使用条款尚待核实', 110, 987, 23, '#B4C7C0');
  rect(context, 110, 1030, 1700 * clamp(time / 9), 4, palette.mint, 2);
}
