import {createCanvas, GlobalFonts} from '@napi-rs/canvas';

GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'Noto CJK');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'Noto CJK Bold');

export const palette = {
  paper: '#F4F1E9', ink: '#172D38', muted: '#64757A', line: '#D7DED8', teal: '#007F78',
  mint: '#A6D9C3', pale: '#E4EEE5', blue: '#4482B4', ice: '#DDEBF4', orange: '#E4A64A',
  peach: '#F1CFB9', coral: '#CB674F', white: '#FFFDF8', dark: '#102C35',
};
const colors = [palette.teal, palette.blue, palette.coral, '#A17230'];
export const clamp = value => Math.min(1, Math.max(0, value));
const ease = value => 1 - (1 - clamp(value)) ** 3;
const mix = (start, end, progress) => start + (end - start) * progress;
const TAU = Math.PI * 2;

export function text(context, value, left, top, size = 32, color = palette.ink, weight = 400, align = 'left') {
  context.font = `${weight} ${size}px "${weight >= 600 ? 'Noto CJK Bold' : 'Noto CJK'}"`;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.fillText(value, left, top);
}

function rect(context, left, top, width, height, fill, radius = 18, stroke) {
  context.beginPath();
  context.roundRect(left, top, width, height, radius);
  if (fill) {context.fillStyle = fill; context.fill();}
  if (stroke) {context.strokeStyle = stroke; context.lineWidth = 2; context.stroke();}
}

function line(context, points, color = palette.line, width = 3, dash = []) {
  context.beginPath();
  context.moveTo(...points[0]);
  for (const point of points.slice(1)) context.lineTo(...point);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.setLineDash(dash);
  context.stroke();
  context.setLineDash([]);
}

function arrow(context, left, top, right, bottom, color = palette.teal, progress = 1) {
  const endX = mix(left, right, progress);
  const endY = mix(top, bottom, progress);
  line(context, [[left, top], [endX, endY]], color, 4);
  if (progress > 0.95) {
    const angle = Math.atan2(bottom - top, right - left);
    line(context, [[right - 13 * Math.cos(angle - 0.55), bottom - 13 * Math.sin(angle - 0.55)], [right, bottom], [right - 13 * Math.cos(angle + 0.55), bottom - 13 * Math.sin(angle + 0.55)]], color, 4);
  }
}

function dot(context, centerX, centerY, radius, fill) {
  context.beginPath(); context.arc(centerX, centerY, radius, 0, TAU); context.fillStyle = fill; context.fill();
}

function tag(context, label, left, top, color = palette.teal, fill = palette.pale, width) {
  context.font = '500 24px "Noto CJK"';
  const tagWidth = width || context.measureText(label).width + 34;
  rect(context, left, top - 23, tagWidth, 46, fill, 23);
  text(context, label, left + tagWidth / 2, top, 24, color, 500, 'center');
}

function reveal(context, time, start, draw, distance = 22) {
  const progress = ease((time - start) / 0.85);
  if (progress <= 0) return;
  context.save(); context.globalAlpha *= progress; context.translate(0, (1 - progress) * distance); draw(); context.restore();
}

function cueTime(scene, keyword, fraction = 0.5) {
  return scene.cues?.find(cue => cue.text.includes(keyword))?.start ?? scene.duration * fraction;
}

function after(scene, time, keyword, fraction = 0.5) {
  return ease((time - cueTime(scene, keyword, fraction)) / 1.1);
}

function callout(context, heading, detail = '', color = palette.teal) {
  rect(context, 100, 808, 1720, 80, palette.white, 16, palette.line);
  rect(context, 100, 808, 7, 80, color, 3);
  text(context, heading, 133, 847, 30, color, 700);
  if (detail) text(context, detail, 1784, 847, 24, palette.muted, 400, 'right');
}

function lattice(context, centerX, centerY, scale = 1, time = 0, color = palette.teal) {
  const spacing = 57 * scale;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      const left = centerX + (column - 1.5) * spacing;
      const top = centerY + (row - 1.5) * spacing;
      if (column < 3) line(context, [[left, top], [left + spacing, top]], palette.line, 4 * scale);
      if (row < 3) line(context, [[left, top], [left, top + spacing]], palette.line, 4 * scale);
      dot(context, left, top, (8 + Math.sin(time + row + column) * 0.7) * scale, color);
    }
  }
}

function wafer(context, centerX, centerY, radius, time, patterned = 1, selected = false) {
  context.save(); context.translate(centerX, centerY); context.scale(1, 0.65);
  context.save(); context.translate(0, 17);
  dot(context, 0, 0, radius, '#42606C'); context.restore();
  const gradient = context.createLinearGradient(-radius, -radius, radius, radius);
  gradient.addColorStop(0, '#D4E3E8'); gradient.addColorStop(0.35, '#819AB6'); gradient.addColorStop(0.7, '#B7D5CC'); gradient.addColorStop(1, '#738FA8');
  dot(context, 0, 0, radius, gradient);
  context.save(); context.beginPath(); context.arc(0, 0, radius - 9, 0, TAU); context.clip();
  const spacing = radius / 4.8;
  let index = 0;
  for (let row = -5; row <= 5; row++) {
    for (let column = -5; column <= 5; column++) {
      const opacity = clamp(patterned * 1.6 - (row + 5) / 18 - (column + 5) / 40);
      context.globalAlpha = opacity;
      const left = column * spacing;
      const top = row * spacing;
      const fill = ['#285365', '#406A70', '#597FA0', '#3E6F68'][(row + column + 20) % 4];
      rect(context, left + 3, top + 3, spacing - 6, spacing - 6, fill, 3);
      line(context, [[left + 9, top + 13], [left + spacing - 11, top + 13], [left + spacing - 11, top + spacing - 13]], '#8DBBAD', 1.5);
      if (index % 3 === 0) rect(context, left + 13, top + 20, spacing / 3, spacing / 4, '#B3C5C7', 1);
      index++;
    }
  }
  context.globalAlpha = 0.13;
  const sheenX = (time * 38 % (radius * 3)) - radius * 1.5;
  const sheen = context.createLinearGradient(sheenX - 80, 0, sheenX + 80, 0);
  sheen.addColorStop(0, '#FFFFFF00'); sheen.addColorStop(0.5, '#FFFFFF'); sheen.addColorStop(1, '#FFFFFF00');
  rect(context, sheenX - 80, -radius, 160, radius * 2, sheen, 0);
  context.restore();
  context.beginPath(); context.arc(0, 0, radius - 5, 0, TAU); context.strokeStyle = '#E5EEE6'; context.lineWidth = 4; context.stroke();
  if (selected && patterned > 0.5) rect(context, 3, 3, spacing - 6, spacing - 6, '#EAB45D99', 3, palette.orange);
  context.restore();
}

function die(context, centerX, centerY, size, time = 0, accent = palette.teal) {
  context.save(); context.translate(centerX - size / 2, centerY - size / 2);
  rect(context, 0, 9, size, size, '#234551', 5);
  rect(context, 0, 0, size, size, '#CFDCD7', 5, '#4B7478');
  rect(context, size * 0.09, size * 0.09, size * 0.51, size * 0.47, accent, 3);
  rect(context, size * 0.64, size * 0.09, size * 0.27, size * 0.68, '#557991', 3);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) rect(context, size * (0.13 + column * 0.11), size * (0.13 + row * 0.10), size * 0.07, size * 0.06, '#95C5B5', 1);
    line(context, [[size * 0.12, size * (0.64 + row * 0.075)], [size * 0.57, size * (0.64 + row * 0.075)], [size * 0.57, size * 0.59]], '#A37D3C', Math.max(1.5, size / 140));
    line(context, [[size * 0.68, size * (0.2 + row * 0.14)], [size * 0.85, size * (0.2 + row * 0.14)]], '#B2CFD0', Math.max(1.5, size / 110));
  }
  dot(context, size * 0.84, size * 0.88, size * 0.025, Math.sin(time * 2) > 0 ? palette.orange : palette.mint);
  context.restore();
}

function packageChip(context, centerX, centerY, size, time = 0, open = 0, multiple = false) {
  const left = centerX - size / 2;
  const top = centerY - size / 2;
  for (let pin = 0; pin < 9; pin++) {
    const position = size * (0.12 + pin * 0.095);
    rect(context, left - size * 0.08, top + position, size * 1.16, size * 0.035, '#BDA163', 2);
    rect(context, left + position, top - size * 0.08, size * 0.035, size * 1.16, '#BDA163', 2);
  }
  rect(context, left, top + 12, size, size, '#132F36', 14);
  rect(context, left, top, size, size, '#355851', 14);
  if (multiple) {
    die(context, centerX - size * 0.17, centerY, size * 0.31, time);
    die(context, centerX + size * 0.19, centerY, size * 0.25, time, palette.blue);
  } else die(context, centerX, centerY, size * 0.57, time);
  context.save(); context.globalAlpha *= 1 - open * 0.91;
  rect(context, left, top - open * size * 0.4, size, size, palette.dark, 14, '#507477');
  text(context, 'IC', centerX, centerY - open * size * 0.4, size * 0.26, '#D7E7DB', 600, 'center');
  dot(context, left + size * 0.11, top + size * 0.11 - open * size * 0.4, size * 0.025, palette.orange);
  context.restore();
}

const titles = [
  ['四个名字，一张地图。', '先认清概念，再走进半导体行业'],
  ['半导体，首先是一类材料。', '从电线开始，理解“导电”与“控制”'],
  ['晶体管：用电信号控制电流。', '从材料，走向有特定功能的器件'],
  ['连接起来，才有电路的功能。', '数字电路用不同的电平范围表示 0 和 1'],
  ['芯片，不是一只巨大的晶体管。', '器件与连接被集成制造在一起'],
  ['晶圆，是制造电路的载体。', '空白晶圆与加工后的晶圆，不是同一个状态'],
  ['从一片晶圆，到一块裸片。', '器件在晶圆上制造，不是逐个粘上去'],
  ['芯片的任务，不只有计算。', '用途举例，并非完整或互斥的分类'],
  ['现在，把四个概念放回原位。', '它们谈论的是不同层级，而不是同一件东西'],
  ['三个问题，检查你的第一张地图。', '不背术语：能分清关系，就已经迈出第一步'],
];

function opening(context, time, scene) {
  const entries = [['半导体', '材料类别', 'MATERIAL'], ['晶体管', '基础器件', 'DEVICE'], ['芯片', '以集成电路为例', 'CIRCUIT'], ['晶圆', '加工载体', 'WAFER']];
  for (let index = 0; index < 4; index++) reveal(context, time, 0.6 + index * 1.05, () => {
    const top = 290 + index * 121;
    rect(context, 100, top, 680, 104, palette.white, 18, palette.line);
    dot(context, 136, top + 52, 7, colors[index]);
    text(context, entries[index][0], 161, top + 49, 40, palette.ink, 700);
    text(context, entries[index][1], 747, top + 48, 28, colors[index], 400, 'right');
  });
  wafer(context, 1300, 610 + Math.sin(time * 0.55) * 7, 342, time);
  reveal(context, time, 3, () => {
    context.save(); context.translate(1315, 445); context.rotate(-0.09); packageChip(context, 0, 0, 195, time, 0.4); context.restore();
    tag(context, '我们看到的芯片，常常带着封装', 1032, 310, palette.ink, palette.white);
  });
  text(context, '同一产业 · 不同层级', 1300, 775, 29, palette.muted, 400, 'center');
  callout(context, '先弄清“它是什么”，再理解“它怎么做”。');
}

function materials(context, time, scene) {
  const focus = after(scene, time, '硅则');
  const columns = [100, 690, 1280];
  ['铜', '塑料', '硅'].forEach((label, index) => reveal(context, time, 0.6 + index * 0.5, () => {
    const left = columns[index];
    rect(context, left, 310, 540, 404, index === 2 && focus > 0 ? palette.pale : palette.white, 22, index === 2 ? palette.teal : palette.line);
    tag(context, ['导体', '绝缘体', '半导体'][index], left + 28, 353, colors[index], index === 2 ? '#D0E5D6' : palette.paper);
    text(context, label, left + 270, 648, 38, palette.ink, 700, 'center');
    if (index === 0) {
      line(context, [[left + 95, 496], [left + 445, 496]], '#BC784C', 44);
      line(context, [[left + 105, 482], [left + 435, 482]], '#E5B480', 9);
      for (let particle = 0; particle < 6; particle++) dot(context, left + 105 + ((time * 58 + particle * 56) % 330), 496, 6, '#FFF4CF');
    } else if (index === 1) {
      line(context, [[left + 95, 497], [left + 445, 497]], '#4B6E91', 72);
      line(context, [[left + 95, 478], [left + 445, 478]], '#7399B4', 8);
      dot(context, left + 95, 497, 35, '#799BB5'); dot(context, left + 95, 497, 19, '#BE8359');
    } else lattice(context, left + 270, 505, 1, time);
  }));
  const controls = after(scene, time, '重要的是', 0.64);
  if (controls > 0) {
    context.save(); context.globalAlpha = controls;
    ['材料成分', '器件结构', '控制电压'].forEach((label, index) => tag(context, label, 674 + index * 202, 762));
    context.restore();
  }
  callout(context, after(scene, time, '不是只让') > 0 ? '半导体 ≠ “只让一半的电通过”' : '导电性质不同，可以承担不同角色。', '电流动画仅作功能示意');
}

function transistor(context, time, scene) {
  const built = after(scene, time, '工程师', 0.1);
  const controls = after(scene, time, '控制信号', 0.55);
  const cycle = Math.floor(Math.max(0, time - cueTime(scene, '控制信号')) / 3.5) % 2;
  const on = controls > 0 && cycle === 0;
  rect(context, 100, 304, 1100, 455, palette.white, 24, palette.line);
  tag(context, '简化场效应晶体管剖面', 130, 350, palette.ink, palette.paper);
  rect(context, 235, 521, 820, 148, palette.peach, 9);
  text(context, '半导体衬底', 645, 619, 30, '#996B56', 400, 'center');
  context.save(); context.globalAlpha = built;
  rect(context, 293, 521, 157, 52, '#6299BF', 5); rect(context, 840, 521, 157, 52, '#6299BF', 5);
  rect(context, 450, 501, 390, 18, '#BCDCD3', 2);
  rect(context, 475, 451, 340, 46, palette.orange, 6);
  line(context, [[645, 450], [645, 395], [1050, 395]], palette.orange, 5);
  line(context, [[366, 518], [366, 475], [240, 475]], palette.blue, 4);
  line(context, [[914, 518], [914, 475], [1060, 475]], palette.blue, 4);
  text(context, '源极', 368, 704, 27, palette.blue, 400, 'center');
  text(context, '漏极', 914, 704, 27, palette.blue, 400, 'center');
  text(context, '栅极', 645, 474, 26, '#775218', 600, 'center');
  tag(context, on ? '控制信号：导通' : '控制信号：关断', 858, 350, on ? palette.teal : palette.muted, on ? palette.pale : palette.paper);
  line(context, [[440, 548], [846, 548]], on ? palette.teal : '#D4B8A9', on ? 13 : 4, on ? [] : [10, 10]);
  if (on) for (let particle = 0; particle < 8; particle++) dot(context, 441 + ((time * 90 + particle * 52) % 400), 548, 5, '#E9FAE8');
  context.restore();
  const facts = [['材料', '不会自己计算'], ['器件', '设计出特定结构'], ['功能', '用信号控制电流']];
  facts.forEach(([heading, detail], index) => reveal(context, time, [0.7, cueTime(scene, '工程师'), cueTime(scene, '小开关')][index], () => {
    const top = 342 + index * 129;
    text(context, heading, 1290, top, 24, palette.teal, 600);
    text(context, detail, 1290, top + 45, 34, palette.ink, 700);
  }));
  callout(context, '“开关”是功能类比，不是机械闸门。', '功能示意 · 非真实比例');
}

function logic(context, time, scene) {
  rect(context, 100, 310, 760, 410, palette.white, 24, palette.line);
  tag(context, '器件 + 连接', 129, 353);
  const connected = after(scene, time, '连接起来', 0.22);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 4; column++) {
      const centerX = 246 + column * 150;
      const centerY = 440 + row * 91;
      if (column < 3) line(context, [[centerX + 28, centerY], [centerX + 122, centerY]], connected ? '#7BACA0' : '#E4E9E1', 3);
      if (row < 2) line(context, [[centerX, centerY + 26], [centerX, centerY + 64]], connected ? '#7BACA0' : '#E4E9E1', 3);
      const lit = connected && Math.sin(time * 2 - row - column * 0.4) > 0;
      rect(context, centerX - 29, centerY - 27, 58, 54, lit ? palette.teal : palette.pale, 8, palette.teal);
      line(context, [[centerX - 13, centerY - 10], [centerX - 13, centerY + 10], [centerX + 12, centerY + 10]], lit ? palette.white : palette.teal, 3);
    }
  }
  text(context, '逻辑功能示意，非电路原理图', 480, 686, 22, palette.muted, 400, 'center');
  arrow(context, 897, 503, 980, 503, palette.teal, connected);
  rect(context, 1020, 310, 800, 410, palette.white, 24, palette.line);
  tag(context, '数字信号', 1050, 353, palette.blue, palette.ice);
  const digital = after(scene, time, '数字电路', 0.4);
  context.save(); context.globalAlpha = 0.18 + digital * 0.82;
  rect(context, 1135, 416, 510, 58, '#E1EEE5', 8); rect(context, 1135, 566, 510, 58, '#E4EAF1', 8);
  text(context, '1', 1690, 445, 45, palette.teal, 700); text(context, '0', 1690, 595, 45, palette.blue, 700);
  const points = [[1135, 595], [1235, 595], [1235, 445], [1380, 445], [1380, 595], [1480, 595], [1480, 445], [1645, 445]];
  line(context, points, palette.teal, 6);
  const cursor = 1135 + time * 35 % 510;
  line(context, [[cursor, 399], [cursor, 644]], '#E4A64A99', 2, [6, 7]);
  text(context, '不同电平范围，表示不同信息', 1418, 686, 25, palette.muted, 400, 'center');
  context.restore();
  const amplification = after(scene, time, '放大信号', 0.75);
  if (amplification > 0) {
    context.save(); context.globalAlpha = amplification;
    text(context, '晶体管也能用于信号放大', 104, 762, 27, palette.coral, 600);
    const points = [];
    for (let position = 0; position < 110; position++) points.push([700 + position * 6, 760 + Math.sin(position * 0.15 + time) * (position < 50 ? 6 : 19)]);
    line(context, points, palette.coral, 3); context.restore();
  }
  callout(context, '很多器件按设计连接，才能处理信息。', '0 并不表示整个芯片完全没有电流');
}

function integrated(context, time, scene) {
  const packed = after(scene, time, '黑色小方块', 0.55);
  const opened = after(scene, time, '打开封装', 0.7);
  rect(context, 100, 300, 960, 465, palette.white, 24, palette.line);
  tag(context, packed ? '封装与内部裸片' : '器件与连接，集成在一起', 131, 345);
  if (packed < 1) {
    context.save(); context.globalAlpha = 1 - packed;
    die(context, 570, 552, 285, time);
    line(context, [[423, 498], [312, 465], [221, 465]], palette.teal, 2);
    text(context, '器件', 211, 431, 29, palette.teal, 600);
    line(context, [[590, 648], [775, 673], [921, 673]], '#A37D3C', 2);
    text(context, '连接线路', 802, 711, 29, '#A37D3C', 600);
    context.restore();
  }
  if (packed > 0) {
    context.save(); context.globalAlpha = packed;
    packageChip(context, 570, 565, 280, time, opened);
    text(context, opened ? '内部：裸片' : '外部：封装', 827, 569, 30, palette.teal, 600);
    arrow(context, 799, 573, 653, 573); context.restore();
  }
  reveal(context, time, 1, () => {
    text(context, '集成电路', 1165, 361, 44, palette.ink, 700);
    text(context, '不是“单个大开关”', 1165, 419, 30, palette.muted);
    line(context, [[1165, 466], [1819, 466]], palette.line, 2);
  });
  reveal(context, time, cueTime(scene, '可能是一块'), () => {
    packageChip(context, 1310, 603, 135, time, 1);
    packageChip(context, 1660, 603, 135, time, 1, true);
    text(context, '单裸片封装', 1310, 727, 28, palette.teal, 500, 'center');
    text(context, '多裸片封装', 1660, 727, 28, palette.blue, 500, 'center');
  });
  callout(context, '裸片 ≠ 整个封装', '以集成电路为例 · 封装结构示意');
}

function waferScene(context, time, scene) {
  const fabrication = after(scene, time, '逐步完成加工', 0.77);
  wafer(context, 585, 536, 330, time, fabrication);
  tag(context, fabrication > 0.4 ? '加工后：重复的电路区域' : '加工前：空白硅晶圆', 369, 744, palette.teal, palette.white);
  const labels = [['材料', '常见例子：硅'], ['形状', '薄薄的圆形片'], ['作用', '制造器件与电路的载体']];
  labels.forEach(([label, detail], index) => reveal(context, time, [0.4, 2.0, cueTime(scene, '载体')][index], () => {
    const top = 356 + index * 108;
    text(context, label, 1084, top, 23, palette.teal, 600);
    text(context, detail, 1084, top + 47, 34, palette.ink, 600);
  }));
  const process = after(scene, time, '很多道加工', 0.6);
  if (process > 0) {
    context.save(); context.globalAlpha = process;
    ['加材料', '做图案', '去材料', '检查'].forEach((label, index) => {
      tag(context, label, 1090 + index * 176, 741, palette.teal, palette.pale, 150);
      if (index < 3) arrow(context, 1248 + index * 176, 741, 1257 + index * 176, 741, palette.muted);
    }); context.restore();
  }
  callout(context, '晶圆是加工载体，不等于成品芯片。', '简化示意 · 不同产品可用不同材料');
}

function production(context, time, scene) {
  const testing = after(scene, time, '还要测试', 0.44);
  const cutting = after(scene, time, '分割', 0.5);
  const packaging = after(scene, time, '封装', 0.56);
  const positions = [370, 966, 1560];
  [0, 1, 2].forEach(index => {
    rect(context, 100 + index * 588, 317, 544, 414, palette.white, 24, palette.line);
    text(context, `0${index + 1}`, 136 + index * 588, 360, 24, palette.muted, 600);
  });
  wafer(context, positions[0], 500, 208, time, 1, testing > 0);
  if (testing) {
    context.save(); context.globalAlpha = testing;
    line(context, [[377, 395], [400, 365], [500, 365]], palette.orange, 5);
    line(context, [[377, 395], [377, 505]], palette.orange, 3);
    dot(context, 377, 505, 8, palette.orange); context.restore();
  }
  context.save(); context.globalAlpha = 0.16 + cutting * 0.84; die(context, positions[1], 500, 175, time); context.restore();
  context.save(); context.globalAlpha = 0.16 + packaging * 0.84; packageChip(context, positions[2], 500, 184, time, 0.08); context.restore();
  [['加工后的晶圆', '包含许多电路区域'], ['裸片', '从晶圆上分割出来'], ['封装产品', '保护与连接内部器件']].forEach(([title, detail], index) => {
    text(context, title, positions[index], 641, 33, colors[index], 700, 'center');
    text(context, detail, positions[index], 690, 23, palette.muted, 400, 'center');
  });
  arrow(context, 651, 503, 681, 503, palette.teal, cutting);
  arrow(context, 1239, 503, 1269, 503, palette.teal, packaging);
  text(context, '常见路径的简化展示', 960, 770, 25, palette.muted, 400, 'center');
  callout(context, '不是把现成晶体管，一个个粘上去。', '测试与封装顺序会随产品和工艺变化');
}

function functionIcon(context, kind, centerX, centerY, time) {
  if (kind === 0) {
    packageChip(context, centerX, centerY, 101, time);
  } else if (kind === 1) {
    for (let row = 0; row < 3; row++) for (let column = 0; column < 5; column++) {
      const lit = (column + row + Math.floor(time / 1.2)) % 3 === 0;
      rect(context, centerX - 84 + column * 35, centerY - 49 + row * 35, 27, 27, lit ? palette.blue : '#BCD1DC', 5);
    }
  } else if (kind === 2) {
    const points = [];
    for (let position = 0; position < 80; position++) points.push([centerX - 90 + position * 2.3, centerY + Math.sin(position * 0.19 + time * 2) * 30 * Math.sin(position / 79 * Math.PI)]);
    line(context, points, palette.coral, 5);
  } else {
    rect(context, centerX - 67, centerY - 39, 132, 78, null, 12, '#A17230');
    rect(context, centerX + 67, centerY - 18, 12, 36, '#A17230', 4);
    for (let index = 0; index < 4; index++) rect(context, centerX - 54 + index * 28, centerY - 27, 21, 54, index <= Math.floor(time) % 4 ? palette.orange : '#E6DCC6', 4);
  }
}

function functionsScene(context, time, scene) {
  const entries = [
    ['计算与控制', '处理器 · 控制器', '计算和控制'], ['数据存储', '内存 · 闪存', '存储数据'],
    ['信号处理', '声音 · 传感器信号', '传感器'], ['电源管理', '供电 · 电池管理', '电源'],
  ];
  entries.forEach(([heading, detail, keyword], index) => {
    const left = index % 2 === 0 ? 100 : 981;
    const top = index < 2 ? 309 : 549;
    const active = after(scene, time, keyword, 0.2 + index * 0.1);
    rect(context, left, top, 839, 212, palette.white, 24, active ? colors[index] : palette.line);
    context.save(); context.globalAlpha = 0.3 + active * 0.7;
    functionIcon(context, index, left + 132, top + 106, time);
    text(context, heading, left + 260, top + 80, 39, colors[index], 700);
    text(context, detail, left + 260, top + 143, 28, palette.muted);
    context.restore();
  });
  callout(context, '不同任务，带来不同的材料、器件与制造要求。');
}

function conceptMap(context, time, scene) {
  const items = [
    {left: 100, top: 295, name: '半导体', role: '材料类别', example: '例如：硅', keyword: '材料类别', color: palette.teal},
    {left: 1100, top: 295, name: '晶体管', role: '器件', example: '可以控制电流', keyword: '晶体管', color: palette.blue},
    {left: 100, top: 590, name: '晶圆', role: '加工载体', example: '在上面形成电路区域', keyword: '晶圆', color: '#A17230'},
    {left: 1100, top: 590, name: '集成电路', role: '电路', example: '许多器件及其连接', keyword: '集成电路', color: palette.coral},
  ];
  items.forEach((item, index) => {
    const active = after(scene, time, item.keyword, index * 0.15);
    rect(context, item.left, item.top, 720, 176, palette.white, 22, active ? item.color : palette.line);
    rect(context, item.left, item.top, 7, 176, item.color, 4);
    text(context, item.role, item.left + 31, item.top + 40, 24, item.color, 600);
    text(context, item.name, item.left + 31, item.top + 105, 45, palette.ink, 700);
    text(context, item.example, item.left + 688, item.top + 106, 25, palette.muted, 400, 'right');
  });
  arrow(context, 854, 380, 1067, 380, palette.blue, after(scene, time, '用半导体', 0.3));
  text(context, '制造器件', 960, 344, 23, palette.blue, 400, 'center');
  arrow(context, 460, 488, 460, 570, '#A17230', after(scene, time, '晶圆', 0.55));
  text(context, '硅可制成晶圆', 488, 530, 22, '#A17230');
  arrow(context, 1460, 488, 1460, 570, palette.coral, after(scene, time, '许多器件', 0.4));
  text(context, '器件 + 连接', 1485, 530, 22, palette.coral);
  arrow(context, 1067, 683, 854, 683, palette.teal, after(scene, time, '载体', 0.6));
  text(context, '在晶圆上加工', 960, 638, 23, palette.teal, 400, 'center');
  callout(context, '材料、器件、电路、载体：四个不同层级。', '以常见硅基集成电路为例');
}

function quiz(context, time, scene) {
  const cues = scene.cues || [];
  const questions = [
    {text: '半导体是一种材料类别吗？', answer: '是', detail: '硅，是常见的半导体材料。', match: '是不是一种材料'},
    {text: '晶圆就是封装好的芯片吗？', answer: '不是', detail: '晶圆是加工载体，封装是另一个层级。', match: '已经封装'},
    {text: '所有芯片都是处理器吗？', answer: '不是', detail: '还可以存储数据、处理信号、管理电源。', match: '所有芯片'},
  ];
  const nextTime = cueTime(scene, '下一集', 0.8);
  let active = 0;
  questions.forEach((question, index) => {if (time >= cueTime(scene, question.match, 0.1 + index * 0.15)) active = index;});
  if (time < nextTime) {
    const question = questions[active];
    const cue = cues.find(item => item.text.includes(question.match));
    const answered = ease((time - (cue?.end ?? scene.duration * (0.18 + active * 0.17))) / 0.5);
    rect(context, 190, 315, 1540, 424, palette.white, 28, palette.line);
    tag(context, `问题 ${active + 1} / 3`, 250, 368);
    text(context, question.text, 960, 460, 49, palette.ink, 700, 'center');
    if (answered > 0) {
      context.save(); context.globalAlpha = answered;
      text(context, question.answer, 960, 564, 66, active === 0 ? palette.teal : palette.coral, 700, 'center');
      text(context, question.detail, 960, 667, 31, palette.muted, 400, 'center'); context.restore();
    } else text(context, '想一想…', 960, 579, 34, palette.muted, 400, 'center');
    for (let index = 0; index < 3; index++) dot(context, 914 + index * 46, 771, 8, index <= active ? palette.teal : palette.line);
  } else {
    reveal(context, time, nextTime, () => {
      text(context, '下一集', 960, 343, 28, palette.teal, 600, 'center');
      text(context, '芯片，是怎样制造出来的？', 960, 423, 58, palette.ink, 700, 'center');
      const names = ['增加材料', '形成图案', '去掉材料', '检查结果'];
      names.forEach((name, index) => {
        const left = 240 + index * 405;
        const top = 533;
        for (let layer = 0; layer < 3; layer++) rect(context, left, top + layer * 22, 220, 18, [palette.orange, palette.teal, '#A9BDC8'][layer], 3);
        if (index === 1 || index === 2) for (let slot = 0; slot < 4; slot++) rect(context, left + 21 + slot * 49, top - 5, 22, index === 2 ? 52 : 21, palette.paper, 0);
        if (index === 3) {context.beginPath(); context.arc(left + 116, top + 8, 36, 0, TAU); context.strokeStyle = palette.blue; context.lineWidth = 5; context.stroke(); line(context, [[left + 145, top + 36], [left + 184, top + 73]], palette.blue, 7);}
        text(context, name, left + 110, 659, 32, colors[index], 600, 'center');
      });
    });
  }
  callout(context, '先看懂基本概念，再理解制造、设备与 AI。');
}

const drawers = [opening, materials, transistor, logic, integrated, waferScene, production, functionsScene, conceptMap, quiz];

function wrap(context, value, maxWidth, size = 40) {
  context.font = `400 ${size}px "Noto CJK"`;
  if (context.measureText(value).width > maxWidth && context.measureText(value).width <= maxWidth * 2) {
    const candidates = [];
    for (let index = 1; index < value.length; index++) {
      const first = value.slice(0, index);
      const second = value.slice(index);
      const firstWidth = context.measureText(first).width;
      const secondWidth = context.measureText(second).width;
      if (firstWidth <= maxWidth && secondWidth <= maxWidth && !/^[，。；？！、：]/.test(second)) {
        const punctuationBonus = /[，。；？！：]$/.test(first) ? 180 : 0;
        candidates.push({first, second, score: Math.abs(firstWidth - secondWidth) - punctuationBonus});
      }
    }
    candidates.sort((first, second) => first.score - second.score);
    if (candidates.length) return [candidates[0].first, candidates[0].second];
  }
  const lines = [];
  let current = '';
  for (const character of value) {
    if (current && context.measureText(current + character).width > maxWidth) {lines.push(current); current = character;}
    else current += character;
  }
  if (current) lines.push(current);
  return lines;
}

export function subtitleLines(context, value) {
  return wrap(context, value, 1600, 39);
}

function footer(context, time, scene, timeline) {
  rect(context, 100, 925, 1720, 103, palette.dark, 16);
  const cue = scene.cues?.find(item => time >= item.start && time < item.end);
  if (cue) {
    const lines = subtitleLines(context, cue.text);
    lines.forEach((value, index) => text(context, value, 960, 976 + (index - (lines.length - 1) / 2) * 45, 39, palette.white, 400, 'center'));
  } else text(context, '半导体入门  /  01', 960, 976, 26, '#B4C5C4', 400, 'center');
  const total = scene.start + time;
  rect(context, 100, 1050, 1720, 4, '#D9DDD5', 2);
  rect(context, 100, 1050, 1720 * clamp(total / timeline.duration), 4, palette.teal, 2);
  text(context, '原创原理示意 · 非真实比例', 100, 903, 19, palette.muted);
  text(context, '中文旁白由 AI 合成', 1819, 903, 19, palette.muted, 400, 'right');
}

const background = createCanvas(1920, 1080);
const backgroundContext = background.getContext('2d');
backgroundContext.fillStyle = palette.paper; backgroundContext.fillRect(0, 0, 1920, 1080);
for (let left = 100; left < 1820; left += 28) for (let top = 284; top < 801; top += 28) dot(backgroundContext, left, top, 0.75, '#CBD3C775');
line(backgroundContext, [[100, 99], [1820, 99]], '#C8D1C9', 2);

export function drawFrame(context, scene, localTime, timeline) {
  context.drawImage(background, 0, 0);
  const index = Number(scene.id) - 1;
  text(context, 'FIELD NOTES', 100, 58, 22, palette.teal, 700);
  text(context, '半导体入门  /  从概念到设备', 304, 58, 23, palette.muted);
  text(context, 'EPISODE 01', 1819, 58, 22, palette.teal, 700, 'right');
  text(context, titles[index][0], 100, 160, 56, palette.ink, 700);
  text(context, titles[index][1], 104, 229, 26, palette.muted);
  text(context, scene.id, 1715, 167, 73, palette.teal, 600, 'right');
  text(context, '/ 10', 1736, 181, 26, palette.muted);
  const fade = Math.min(ease(localTime / 0.5), ease((scene.duration - localTime) / 0.5));
  context.save(); context.globalAlpha = fade;
  drawers[index](context, localTime, scene);
  context.restore();
  footer(context, localTime, scene, timeline);
}

export function drawCredits(context, time) {
  context.fillStyle = palette.dark; context.fillRect(0, 0, 1920, 1080);
  text(context, 'FIELD NOTES  /  半导体入门', 110, 94, 25, palette.mint, 600);
  line(context, [[110, 138], [1810, 138]], '#446064', 2);
  text(context, '第一张地图，已经建立。', 110, 257, 67, palette.white, 700);
  text(context, '材料 → 器件 → 电路    /    晶圆：加工载体', 110, 356, 37, palette.mint, 500);
  text(context, '内容依据', 110, 494, 26, palette.orange, 600);
  const sources = [
    'ASML  ·  The basics of microchips',
    'IBM  ·  What is a semiconductor?',
    'Texas Instruments  ·  Power management',
  ];
  sources.forEach((source, index) => text(context, source, 110, 552 + index * 55, 29, '#D4E2DB'));
  text(context, '完整链接与适用边界见 content/references.md', 110, 735, 25, '#A7C0BB');
  rect(context, 1130, 466, 680, 281, '#1E3B42', 22, '#436069');
  text(context, '下一集', 1171, 516, 25, palette.orange, 600);
  text(context, '芯片是怎样', 1171, 589, 49, palette.white, 700);
  text(context, '制造出来的？', 1171, 660, 49, palette.white, 700);
  text(context, 'JavaScript 原创动画  ·  中文旁白由 AI 合成', 110, 864, 28, palette.mint);
  text(context, '参考影片仅用于研究讲解方式，未使用原片画面、音乐或旁白。', 110, 925, 24, '#A7C0BB');
  text(context, 'Microsoft Xiaoxiao Neural  /  无背景音乐', 110, 976, 22, '#A7C0BB');
  rect(context, 110, 1030, 1700 * clamp(time / 9), 4, palette.mint, 2);
}
