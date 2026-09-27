import {episode} from './lib.mjs';
import {palette, text, rect, line, arrow, dot, tag, reveal, callout, wafer, subtitleLines, clamp} from './art.mjs';

export {subtitleLines};
const ease = value => 1 - (1 - clamp(value)) ** 3;
const accent = [palette.teal, palette.blue, palette.coral, '#A17230'];
let focusIndex = 0;
let drawnNodes = 0;

const chapters = {
  '03': [
    ['一颗芯片，背后不只一家公司。', '先看交付与分工，再记住公司名字', 'ecosystem', ['设计', '晶圆制造', '封装测试', '设备 / 材料'], '角色不同，但需要一起协作。', '产品推进与工具支持分开看'],
    ['设计：把任务变成电路与版图。', '没有自己的晶圆厂，不等于没有技术能力', 'design', ['需求与架构', '电路与验证', '版图实现'], '设计不能脱离制造条件。', 'NVIDIA / AMD：业务模式举例'],
    ['代工：让设计成为物理结构。', '不是收到图纸，就按一次“打印”', 'collaboration', ['设计与版图', '工艺规则', '晶圆制造'], '规则、验证和反馈，连接设计与制造。', 'Foundry · 台积电为模式举例'],
    ['封装：连接、保护与热管理。', '封装测试不只是“套一个壳”', 'package', ['裸片', '连接', '保护 / 热管理'], '多个角色可能由同一企业承担。', '简化封装示意 · 非真实结构'],
    ['设备商，提供制造芯片的工具。', '制造机器，与使用机器制造晶圆，是两回事', 'two-sites', ['设备商', '工具交付', '晶圆厂'], '机器交付给客户，晶圆在客户工厂加工。', '设备 / 软件 / 备件 / 服务'],
    ['材料与部件，让网络运转起来。', '关键输入不只来自少数整机大厂', 'suppliers', ['材料供应', '晶圆厂', '零部件', '设备商'], '材料进入工艺，零部件组成设备。', '供应链示意 · 非穷尽分类'],
    ['设计也需要工具和可复用模块。', 'EDA 与 IP 服务设计，但不取消系统验证', 'gate', ['EDA / IP', '接口与工艺验证', '芯片设计'], '模块能复用，不等于不用验证。', 'EDA：设计自动化 / IP：设计模块'],
    ['IDM：一家公司可以跨越多个角色。', '业务模式可以交叉，不是永久互斥标签', 'idm', ['设计', '制造', '封测协作'], '角色图，不是公司只能选一次的分类表。', 'Intel / Samsung：模式举例'],
    ['交付、支持与反馈，是不同的线。', '制造流程不等于全部客户和合同关系', 'ecosystem', ['设计', '晶圆制造', '封装测试', '工具 / 材料'], '问清：交付什么？客户是谁？为何选择它？', '不表示具体合同或资金流'],
    ['从产业地图，走向设备公司。', '用两个问题复习角色的区别', 'quiz', ['设备商就是晶圆厂吗？', '设计公司可以不懂制造吗？'], '先看交付对象，再看企业名字。', '下一集：一台设备的生命周期'],
  ],
  '04': [
    ['两个工厂，两种制造对象。', '设备公司的工厂装机器；客户的工厂加工晶圆', 'two-sites', ['设备工厂', '机器交付', '客户晶圆厂'], '同样叫制造，对象、数据和流程不同。', '典型生命周期，不是某公司内部 SOP'],
    ['客户买的是结果，不只是机器。', '把要求转换成能够检查的指标', 'matrix', ['加工结果', '产能', '可靠性', '运行成本'], '指标要由产品与客户条件确定。', '不使用虚构的行业统一门槛'],
    ['研发：多个专业组成一个系统。', '单个部件表现好，不等于整机稳定', 'machine', ['腔体 / 真空', '气体 / 温控', '电气 / 传感', '软件 / 工艺'], '设计、仿真、试验、修正，反复进行。', '系统关系示意 · 非实际管路'],
    ['图纸变成实物，需要可追溯的装配。', '知道需要什么，也知道实际装了什么', 'assembly', ['物料清单', '部件与检验', '装配与追溯'], '型号、版本、变更和质量记录要对应。', '设备商内部数据，不等于客户生产数据'],
    ['通电成功，不代表验证结束。', '出厂检查与客户现场验证解决不同问题', 'gate', ['出厂检查', '运输 / 安装', '现场验证'], '每项结论要有证据与记录。', '示意阶段 · 非合同节点承诺'],
    ['现场排查：先列候选，再找证据。', '异常可能涉及多种条件，不直接归罪于某个部件', 'investigation', ['设备状态', '来料 / 环境', '配方版本', '量测条件'], '候选原因 ≠ 已证实的根因。', '客户、服务、应用与研发协作'],
    ['把配方、过程和结果放在一起。', '相同配方，也可能遇到不同设备状态', 'traces', ['配方步骤', '过程信号', '量测结果'], '版本与批次对齐，才有可解释的比较。', '合成曲线 · 无真实工艺参数'],
    ['维护后，还要确认恢复结果。', '长期服务包含检查、换件、培训与升级', 'loop', ['运行', '维护', '检查', '恢复'], '修完不是终点，验证后才确认恢复。', 'Lam / ASML 公开服务范围作参考'],
    ['现场问题，怎样回到研发？', '信息要有上下文，传递要有权限', 'gate', ['现场记录', '授权 / 脱敏', '研发与受控变更'], '数据在客户现场，不等于可以自由取走。', '变更后仍需现场验证'],
    ['每个环节，都有负责人和验收结果。', 'AI 应当嵌入工程协作，不另起一套脱节流程', 'lifecycle', ['需求', '研发', '装配', '交付', '维护'], '先找具体业务环节，再讨论 AI。', '下一集：问题、数据与验收'],
  ],
  '05': [
    ['先找问题，再决定用什么模型。', '例子：设备加工后的膜厚出现异常', 'investigation', ['谁负责？', '什么数据？', '怎样调查？', '如何验收？'], '这是教学情境，不是真实工厂事故。', '不承诺效果与收益'],
    ['知识助手：答案需要来源和边界。', '流畅，不等于正确；版本和权限不能省略', 'gate', ['工程问题', '权限 / 版本筛选', '带来源的回答'], '证据不足就说明，不编造维修步骤。', '教学建议 · 不直接控制设备'],
    ['异常检测：把记录放回同一时间轴。', '报警、过程曲线、配方与维护一起看', 'traces', ['压力信号', '温度信号', '报警 / 维护'], '相关不等于因果，输出候选与证据。', '合成数据 · 关注误报、漏报、排查时间'],
    ['预测维护：先判断状态，不夸大寿命预测。', '故障样本少、维修记录不完整，都限制可用性', 'health', ['使用工况', '状态变化', '检查 / 维护'], '公开方向存在，不代表可复制相同收益。', '公开案例：TEL Epsira'],
    ['优化配方，要回到真实实验和量测。', '模型提出建议，工程流程负责验证', 'loop', ['实验数据', '模型建议', '受控实验', '真实量测'], '虚拟量测不是未经验证就取消实际量测。', '公开案例：Applied Materials AIx'],
    ['视觉算法与内部提效，价值来源不同。', '检测产品能力，与装配、报告、软件测试分开看', 'vision', ['缺陷识别', '人工复查', '内部任务'], '规则、统计与 AI，都用任务结果说话。', '公开案例：KLA Lumina · 不预设 AI 胜出'],
    ['数据闭环：先关联，再授权使用。', '设备、时间、批次与结果必须对得上', 'data', ['设备 ID', '时间 / 批次', '量测 / 维修'], '客户之间的数据不能随意混用。', '更多数据，不自动等于更高质量'],
    ['同一任务、同一测试集、同一标准。', '用未来时间或留出设备检验泛化，防止泄漏', 'evaluation', ['训练数据', '留出测试', '统一验收'], '比较准确性，也比较误报代价和人工负担。', '评测设计示意 · 没有预设收益数字'],
    ['离线回放 → 只读现场 → 受控使用。', '从观察与建议开始，不绕过工程审批', 'gate', ['离线回放', '只读现场 + 审批', '有限受控使用'], '安全联锁不能被语言模型绕过。', '保留日志、回退与变更后验证'],
    ['五集结束，带走五个问题。', '不要求马上成为专家，但要能参与真实讨论', 'lifecycle', ['交付什么', '改变什么', '谁来负责', '数据在哪', '如何验收'], '先把业务讲明白，再选择工具。', '课程结束 · 后续带着具体问题学习'],
  ],
};

function node(context, label, left, top, width = 360, height = 114, color = palette.teal, detail = '') {
  const focused = drawnNodes++ === focusIndex;
  rect(context, left, top, width, height, focused ? palette.pale : palette.white, 18, color);
  if (focused) rect(context, left, top + 20, 6, height - 40, color, 3);
  text(context, label, left + width / 2, top + (detail ? 43 : height / 2), 33, color, 700, 'center');
  if (detail) text(context, detail, left + width / 2, top + 84, 22, palette.muted, 400, 'center');
}

function movingLink(context, left, top, right, bottom, time, color = palette.teal, start = 0) {
  const progress = ease((time - start) / 1.8);
  if (progress <= 0) return;
  arrow(context, left, top, right, bottom, color, progress);
  if (progress > 0.99) {
    const travel = ((time - start) % 4) / 4;
    dot(context, left + (right - left) * travel, top + (bottom - top) * travel, 6, color);
  }
}

function chip(context, centerX, centerY, size = 132, time = 0) {
  for (let index = 0; index < 7; index++) {
    const offset = -size * .36 + index * size * .12;
    rect(context, centerX - size * .61, centerY + offset, size * 1.22, size * .035, '#B9A26B', 2);
    rect(context, centerX + offset, centerY - size * .61, size * .035, size * 1.22, '#B9A26B', 2);
  }
  rect(context, centerX - size / 2, centerY - size / 2, size, size, palette.dark, 10);
  rect(context, centerX - size * .3, centerY - size * .3, size * .6, size * .6, palette.teal, 5);
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) rect(context, centerX - size * .24 + column * size * .18, centerY - size * .24 + row * size * .18, size * .12, size * .12, (row + column + Math.floor(time)) % 3 ? palette.mint : palette.orange, 2);
}

function machine(context, centerX, centerY, time, scale = 1) {
  context.save(); context.translate(centerX, centerY); context.scale(scale, scale);
  rect(context, -155, -128, 310, 264, '#DDE8E6', 15, '#728C92');
  rect(context, -126, -95, 148, 156, palette.dark, 10);
  context.beginPath(); context.arc(-52, -16, 53, 0, Math.PI * 2); context.strokeStyle = palette.mint; context.lineWidth = 6; context.stroke();
  const rotation = time * .5;
  line(context, [[-52, -16], [-52 + 37 * Math.cos(rotation), -16 + 37 * Math.sin(rotation)]], palette.orange, 7);
  rect(context, 47, -92, 82, 64, palette.blue, 7); text(context, 'SYS', 88, -60, 23, palette.white, 600, 'center');
  [0, 1, 2].forEach(index => dot(context, 64 + index * 24, 0, 6, index === Math.floor(time) % 3 ? palette.orange : palette.teal));
  line(context, [[-125, 93], [125, 93]], '#819D9A', 4);
  rect(context, -124, 135, 46, 15, '#728C92', 3); rect(context, 78, 135, 46, 15, '#728C92', 3);
  context.restore();
}

function labelsRow(context, labels, time, top = 366, width = 460) {
  const gap = (1720 - width * labels.length) / (labels.length - 1);
  labels.forEach((label, index) => {
    const left = 100 + index * (width + gap);
    reveal(context, time, .5 + index * 1.4, () => node(context, label, left, top, width, 116, accent[index % 4]));
    if (index < labels.length - 1) movingLink(context, left + width + 15, top + 58, left + width + gap - 15, top + 58, time, palette.teal, 2 + index);
  });
}

function ecosystem(context, labels, time) {
  const positions = [[100, 333], [760, 333], [1420, 333], [760, 644]];
  labels.forEach((label, index) => reveal(context, time, index * 1.2, () => node(context, label, ...positions[index], 400, 110, accent[index])));
  movingLink(context, 520, 388, 740, 388, time, palette.teal, 1);
  movingLink(context, 1180, 388, 1400, 388, time, palette.teal, 2);
  text(context, '产品推进', 629, 347, 23, palette.teal, 400, 'center');
  text(context, '后续加工', 1290, 347, 23, palette.teal, 400, 'center');
  movingLink(context, 960, 631, 960, 458, time, '#A17230', 4);
  text(context, '工具与材料支持', 1000, 553, 27, '#A17230');
  movingLink(context, 760, 501, 500, 501, time, palette.blue, 6);
  text(context, '规则 / 数据反馈', 630, 543, 24, palette.blue, 400, 'center');
  chip(context, 300, 660, 126, time); wafer(context, 1630, 645, 149, time);
}

function chain(context, config, time) {
  const [heading, subtitle, kind, labels] = config;
  labelsRow(context, labels, time);
  if (kind === 'gate') {
    rect(context, 668, 533, 584, 184, palette.pale, 19, palette.teal);
    text(context, episode === '05' ? '证据 / 权限 / 人工判断' : '检查 / 验证 / 责任边界', 960, 588, 31, palette.teal, 600, 'center');
    const label = heading.includes('只读') ? '只观察 → 获批后才执行' : '不满足条件：补充信息或停止';
    text(context, label, 960, 650, 27, palette.muted, 400, 'center');
    movingLink(context, 960, 493, 960, 522, time, palette.teal, 4);
    for (let index = 0; index < 3; index++) dot(context, 440 + index * 520, 750, 7, index === Math.floor(time / 2) % 3 ? palette.orange : palette.line);
  } else {
    for (let row = 0; row < 5; row++) for (let column = 0; column < 12; column++) {
      const active = clamp((time - 2 - column * .4 - row * .15) / .9);
      context.save();context.globalAlpha = active;
      rect(context, 164 + column * 136, 539 + row * 36, 95, 22, (column + row) % 3 ? palette.pale : palette.teal, 4);context.restore();
    }
    text(context, kind === 'design' ? '需求逐步落实为可验证的设计' : '版本与记录贯穿交付过程', 960, 754, 29, palette.muted, 400, 'center');
  }
}

function collaboration(context, labels, time) {
  node(context, labels[0], 110, 350, 510, 127, palette.teal, '功能 / 性能 / 版图');
  node(context, labels[2], 1290, 350, 510, 127, palette.blue, '加工 / 稳定性 / 产能');
  node(context, labels[1], 738, 539, 444, 130, '#A17230', '设计与制造共同遵守');
  movingLink(context, 642, 406, 1269, 406, time, palette.teal, 1);
  movingLink(context, 1269, 469, 642, 469, time, palette.blue, 3);
  text(context, '设计交付', 960, 370, 27, palette.teal, 400, 'center');
  text(context, '反馈与验证', 960, 502, 24, palette.blue, 400, 'center');
  movingLink(context, 727, 605, 610, 515, time, '#A17230', 5);
  movingLink(context, 1191, 605, 1300, 515, time, '#A17230', 5);
  wafer(context, 1550, 662, 135, time); chip(context, 360, 662, 110, time);
}

function packaged(context, time) {
  rect(context, 180, 400, 980, 288, '#CDDCD6', 20, '#91ACA6');
  text(context, '封装基底（简化）', 670, 729, 27, palette.muted, 400, 'center');
  for (let index = 0; index < 3; index++) reveal(context, time, index * 1.5, () => {
    chip(context, 360 + index * 304, 530, index === 1 ? 165 : 125, time);
    if (index < 2) movingLink(context, 450 + index * 304, 530, 560 + index * 304, 530, time, palette.orange, 2);
  });
  ['电气连接', '机械保护', '热管理'].forEach((label, index) => reveal(context, time, 2 + index * 2, () => node(context, label, 1315, 334 + index * 143, 465, 102, accent[index])));
  text(context, '可包含多个裸片；结构因产品而异', 667, 337, 30, palette.teal, 600, 'center');
}

function twoSites(context, labels, time) {
  rect(context, 100, 317, 684, 447, palette.white, 24, palette.line);
  rect(context, 1136, 317, 684, 447, palette.white, 24, palette.line);
  text(context, labels[0], 442, 368, 38, palette.teal, 700, 'center');
  text(context, labels[2], 1478, 368, 38, palette.blue, 700, 'center');
  machine(context, 442, 568, time, .8);
  wafer(context, 1478, 568, 206, time);
  text(context, '研发 / 装配 / 调试', 442, 727, 28, palette.muted, 400, 'center');
  text(context, '使用设备加工晶圆', 1478, 727, 28, palette.muted, 400, 'center');
  movingLink(context, 809, 532, 1111, 532, time, palette.teal, 2);
  text(context, labels[1], 960, 481, 28, palette.teal, 600, 'center');
  text(context, '不是晶圆货物流', 960, 585, 23, palette.muted, 400, 'center');
}

function suppliers(context, labels, time) {
  const positions = [[150, 326], [1190, 326], [150, 616], [1190, 616]];
  labels.forEach((label, index) => reveal(context, time, index * 1.3, () => node(context, label, ...positions[index], 550, 133, accent[index], ['硅片 / 胶 / 气体等', '工艺材料输入', '真空 / 运动 / 传感等', '零部件集成为机器'][index])));
  movingLink(context, 728, 392, 1163, 392, time, '#A17230', 2);
  movingLink(context, 728, 682, 1163, 682, time, palette.teal, 4);
  text(context, '供给材料', 945, 352, 26, '#A17230', 500, 'center');
  text(context, '供给零部件', 945, 642, 26, palette.teal, 500, 'center');
  movingLink(context, 1465, 596, 1465, 477, time, palette.blue, 6);
  text(context, '提供设备', 1520, 531, 26, palette.blue);
}

function idm(context, labels, time) {
  rect(context, 125, 314, 1670, 322, palette.pale, 23, palette.teal);
  text(context, '同一企业可覆盖多种职能', 172, 353, 29, palette.teal, 600);
  labels.forEach((label, index) => reveal(context, time, index * 1.3, () => node(context, label, 190 + index * 555, 419, 420, 125, accent[index])));
  movingLink(context, 623, 480, 732, 480, time, palette.teal, 2);
  movingLink(context, 1178, 480, 1287, 480, time, palette.teal, 3);
  node(context, '外部制造 / 封测合作', 610, 675, 700, 90, palette.blue);
  movingLink(context, 960, 550, 960, 660, time, palette.blue, 5);
  text(context, '仍可与外部合作', 1002, 587, 23, palette.blue);
}

function matrix(context, labels, time) {
  const details = ['是否达到目标工艺结果', '单位时间能处理多少', '能否稳定、持续运行', '耗材 / 维护 / 运行投入'];
  labels.forEach((label, index) => {
    const left = index % 2 ? 984 : 100;
    const top = index < 2 ? 318 : 550;
    reveal(context, time, index * 1.4, () => {
      rect(context, left, top, 836, 206, palette.white, 20, accent[index]);
      text(context, `0${index + 1}`, left + 39, top + 45, 24, accent[index]);
      text(context, label, left + 39, top + 101, 40, accent[index], 700);
      text(context, details[index], left + 39, top + 161, 27, palette.muted);
      const scan = (time % 5) / 5;
      rect(context, left + 522, top + 100, 240, 8, palette.line, 4);
      dot(context, left + 522 + 240 * scan, top + 104, 8, accent[index]);
    });
  });
}

function system(context, labels, time, investigation = false) {
  const positions = [[100, 319], [1320, 319], [100, 613], [1320, 613]];
  labels.forEach((label, index) => reveal(context, time, index * 1.2, () => {
    node(context, label, ...positions[index], 500, 125, accent[index]);
    const left = index % 2 ? 1310 : 610;
    const right = index % 2 ? 1135 : 785;
    const top = index < 2 ? 407 : 650;
    movingLink(context, left, top, right, 530, time, accent[index], index);
  }));
  if (investigation) {
    rect(context, 760, 419, 400, 212, palette.pale, 25, palette.teal);
    text(context, '调查与证据', 960, 483, 38, palette.teal, 700, 'center');
    text(context, '先缩小范围', 960, 552, 27, palette.muted, 400, 'center');
    text(context, '不是预先给根因', 960, 596, 25, palette.muted, 400, 'center');
    const angle = time * .8;dot(context, 960 + Math.cos(angle) * 88, 706, 7, palette.orange);
  } else machine(context, 960, 530, time, 1.05);
}

function traces(context, labels, time) {
  rect(context, 100, 308, 1240, 458, palette.white, 20, palette.line);
  const shift = 750 + Math.sin(time * .22) * 22;
  rect(context, shift, 361, 145, 331, '#F1CFB970', 0);
  labels.forEach((label, row) => {
    const baseline = 414 + row * 110;
    text(context, label, 135, baseline - 48, 25, accent[row], 600);
    line(context, [[329, baseline + 27], [1290, baseline + 27]], palette.line, 2);
    const points = [];
    for (let index = 0; index < 128; index++) {
      const horizontal = 330 + index * 7.5;
      const anomaly = Math.exp(-(((horizontal - 821) / 74) ** 2)) * (row === 1 ? -45 : 42);
      points.push([horizontal, baseline + Math.sin(index * .17 + row) * 9 - anomaly]);
    }
    line(context, points, accent[row], 4);
    const cursor = 330 + (time * 42 % 956);
    line(context, [[cursor, baseline - 45], [cursor, baseline + 27]], '#E4A64A99', 2);
  });
  text(context, '关联时间窗口', 1450, 398, 33, palette.teal, 700);
  ['同一设备', '同一批次', '版本 / 维护上下文'].forEach((label, index) => reveal(context, time, 2 + index * 2, () => text(context, label, 1450, 489 + index * 73, 28, palette.muted)));
  tag(context, '教学合成 / 非实测', 1430, 730, palette.coral, palette.peach);
}

function loop(context, labels, time) {
  const points = [[250, 316], [1265, 316], [1265, 632], [250, 632]];
  labels.forEach((label, index) => reveal(context, time, index * 1.2, () => node(context, label, ...points[index], 405, 117, accent[index])));
  movingLink(context, 680, 375, 1240, 375, time, palette.teal, 1);
  movingLink(context, 1467, 452, 1467, 611, time, palette.blue, 3);
  movingLink(context, 1240, 690, 680, 690, time, palette.coral, 4);
  movingLink(context, 452, 611, 452, 452, time, '#A17230', 6);
  rect(context, 700, 464, 520, 132, palette.pale, 20, palette.teal);
  text(context, episode === '05' ? '审批与真实验证' : '记录与结果确认', 960, 512, 34, palette.teal, 700, 'center');
  text(context, '不能跳过中间步骤', 960, 561, 25, palette.muted, 400, 'center');
}

function health(context, labels, time) {
  rect(context, 100, 306, 1200, 463, palette.white, 20, palette.line);
  text(context, '状态趋势（教学示例，不是寿命预测）', 140, 351, 27, palette.teal, 600);
  line(context, [[220, 400], [220, 696], [1210, 696]], palette.muted, 3);
  const points = [];
  for (let index = 0; index < 120; index++) {
    const horizontal = 240 + index * 8;
    const vertical = index < 78 ? 428 + index * 2.1 + Math.sin(index * .4) * 7 : 446 + (index - 78) * 1.7;
    points.push([horizontal, vertical]);
  }
  line(context, points.slice(0, Math.max(3, Math.ceil(clamp(time / 12) * points.length))), palette.blue, 5);
  line(context, [[864, 412], [864, 690]], palette.coral, 3, [8, 8]);
  text(context, '检查 / 维护事件', 916, 650, 24, palette.coral);
  labels.forEach((label, index) => reveal(context, time, index * 2 + 1, () => node(context, label, 1390, 341 + index * 142, 398, 105, accent[index])));
}

function vision(context, labels, time) {
  rect(context, 100, 317, 786, 444, palette.white, 20, palette.line);
  text(context, '合成缺陷示意 / 非真实检测结果', 145, 358, 26, palette.teal, 600);
  for (let row = 0; row < 3; row++) for (let column = 0; column < 5; column++) {
    const left = 147 + column * 139;const top = 411 + row * 104;
    rect(context, left, top, 108, 76, palette.pale, 6);
    line(context, [[left + 20, top + 16], [left + 20, top + 56], [left + 78, top + 56]], palette.teal, 4);
    if ((row + column) % 4 === 0) {dot(context, left + 57, top + 29, 9, palette.coral);if(time>4)rect(context,left+36,top+10,42,40,null,5,palette.coral);}
  }
  const scan = 416 + time * 35 % 300;line(context,[[142,scan],[843,scan]],'#4482B4AA',3);
  labels.forEach((label,index)=>reveal(context,time,index*2,()=>node(context,label,1190,337+index*141,610,108,accent[index])));
  movingLink(context, 913, 533, 1163, 533, time, palette.teal, 3);
  text(context, '辅助分类与复查', 1040, 486, 23, palette.teal, 400, 'center');
}

function data(context, labels, time) {
  labelsRow(context,labels,time,314,470);
  rect(context,100,531,705,220,palette.ice,20,palette.blue);
  rect(context,1115,531,705,220,palette.pale,20,palette.teal);
  text(context,'客户 A 数据边界',452,583,34,palette.blue,700,'center');
  text(context,'客户 B 数据边界',1467,583,34,palette.teal,700,'center');
  for(let index=0;index<5;index++){
    rect(context,159+index*122,650,88,48,index===Math.floor(time)%5?palette.blue:'#B5CCDD',7);
    rect(context,1174+index*122,650,88,48,index===Math.floor(time)%5?palette.teal:'#B4D6C7',7);
  }
  line(context,[[960,524],[960,762]],palette.coral,4,[9,9]);
  tag(context,'不能随意混用',864,614,palette.coral,palette.peach);
}

function evaluation(context, labels, time) {
  node(context,labels[0],100,318,820,109,palette.teal,'较早时间段');
  node(context,labels[1],1060,318,760,109,palette.blue,'未来时间 / 留出设备');
  line(context,[[976,305],[976,456]],palette.coral,3,[8,8]);
  text(context,'防止信息泄漏',980,284,24,palette.coral,400,'center');
  node(context,'现有规则 / 人工',180,533,610,109,palette.teal);
  node(context,'AI 方法',1130,533,610,109,palette.blue);
  text(context,'同一份测试数据',960,681,29,palette.ink,600,'center');
  movingLink(context,1435,449,1435,514,time,palette.blue,2);
  movingLink(context,1060,456,530,514,time,palette.teal,4);
  rect(context,367,717,1186,62,palette.white,12,palette.line);
  text(context,`${labels[2]}：误报 / 漏报 / 时间 / 人工负担 —— 待实测`,960,748,26,palette.muted,400,'center');
}

function lifecycle(context, labels, time) {
  const width = 282;const gap = 72;
  labels.forEach((label,index)=>reveal(context,time,index*1.1,()=>{
    const left=109+index*(width+gap);
    rect(context,left,400,width,183,palette.white,20,accent[index%4]);
    text(context,`0${index+1}`,left+width/2,447,27,accent[index%4],600,'center');
    text(context,label,left+width/2,522,36,accent[index%4],700,'center');
    if(index<4)movingLink(context,left+width+12,489,left+width+gap-12,489,time,palette.teal,index+1);
  }));
  text(context,episode==='05'?'不必立刻成为专家，先能问对问题。':'每个环节都有负责人、记录和验收结果。',960,680,38,palette.ink,600,'center');
  tag(context,episode==='05'?'五集学习路径完成':'AI 辅助业务，而非替代责任',723,756,palette.teal,palette.pale);
}

function quiz(context,labels,time,scene){
  const second=scene.cues.find(cue=>cue.text.includes('没有晶圆厂'))?.start??scene.duration*.4;
  const next=scene.cues.find(cue=>cue.text.includes('下一集'))?.start??scene.duration*.8;
  if(time>=next){lifecycle(context,['需求','研发','装配','交付','维护'],time-next);return;}
  const index=time>=second?1:0;
  const cue=scene.cues.find(cue=>cue.text.includes(index?'没有晶圆厂':'设备商和晶圆厂'));
  const answered=time>(cue?.end??6);
  rect(context,190,321,1540,437,palette.white,25,palette.line);
  tag(context,`问题 ${index+1} / 2`,244,371);
  text(context,labels[index],960,470,46,palette.ink,700,'center');
  text(context,answered?'不是':'想一想…',960,575,answered?65:34,answered?palette.coral:palette.muted,600,'center');
  if(answered)text(context,index?'设计必须考虑制造规则。':'一个提供工具，另一个使用工具加工。',960,681,30,palette.teal,500,'center');
}

function diagram(context,config,time,scene){
  const kind=config[2];const labels=config[3];
  if(kind==='ecosystem')ecosystem(context,labels,time);
  else if(['design','assembly','gate'].includes(kind))chain(context,config,time);
  else if(kind==='collaboration')collaboration(context,labels,time);
  else if(kind==='package')packaged(context,time);
  else if(kind==='two-sites')twoSites(context,labels,time);
  else if(kind==='suppliers')suppliers(context,labels,time);
  else if(kind==='idm')idm(context,labels,time);
  else if(kind==='matrix')matrix(context,labels,time);
  else if(kind==='machine'||kind==='investigation')system(context,labels,time,kind==='investigation');
  else if(kind==='traces')traces(context,labels,time);
  else if(kind==='loop')loop(context,labels,time);
  else if(kind==='health')health(context,labels,time);
  else if(kind==='vision')vision(context,labels,time);
  else if(kind==='data')data(context,labels,time);
  else if(kind==='evaluation')evaluation(context,labels,time);
  else if(kind==='lifecycle')lifecycle(context,labels,time);
  else if(kind==='quiz')quiz(context,labels,time,scene);
  else throw new Error(`Unknown diagram kind: ${kind}`);
}

export function drawFrame(context,scene,time,timeline){
  const config=chapters[episode][Number(scene.id)-1];
  focusIndex=Math.min(2,Math.floor(time/scene.duration*3));
  drawnNodes=0;
  context.fillStyle=palette.paper;context.fillRect(0,0,1920,1080);
  line(context,[[100,99],[1820,99]],palette.line,2);
  text(context,'FIELD NOTES',100,58,22,palette.teal,700);
  text(context,{'03':'半导体入门 / 产业链','04':'半导体入门 / 设备制造','05':'半导体入门 / AI 应用'}[episode],304,58,23,palette.muted);
  text(context,`EPISODE ${episode}`,1819,58,22,palette.teal,700,'right');
  text(context,config[0],100,160,52,palette.ink,700);
  text(context,config[1],104,229,26,palette.muted);
  text(context,scene.id,1715,167,73,palette.teal,600,'right');text(context,'/ 10',1736,181,26,palette.muted);
  context.save();context.globalAlpha=Math.min(ease(time/.5),ease((scene.duration-time)/.5));
  diagram(context,config,time,scene);context.restore();
  callout(context,config[4]);
  text(context,config[5],100,903,20,palette.muted);
  text(context,'教学示意 / 中文旁白由 AI 合成',1819,903,20,palette.muted,400,'right');
  rect(context,100,925,1720,103,palette.dark,16);
  const cue=scene.cues.find(item=>time>=item.start&&time<item.end);
  if(cue){const lines=subtitleLines(context,cue.text);lines.forEach((label,index)=>text(context,label,960,976+(index-(lines.length-1)/2)*45,39,palette.white,400,'center'));}
  else text(context,`半导体入门 / ${episode}`,960,976,26,'#B4C5C4',400,'center');
  rect(context,100,1050,1720,4,palette.line,2);rect(context,100,1050,1720*clamp((scene.start+time)/timeline.duration),4,palette.teal,2);
}

export function drawCredits(context,time){
  context.fillStyle=palette.dark;context.fillRect(0,0,1920,1080);
  text(context,`FIELD NOTES / 半导体入门 · ${episode}`,110,94,26,palette.mint,600);
  const ending={'03':['看懂分工，再看企业。','下一集','走进设备公司','看一台机器的一生'], '04':['设备交付之后，服务仍在继续。','下一集','AI 可以解决什么？','问题、数据与验收'], '05':['五集结束，学习从问题开始。','全套回顾','概念 → 制造 → 产业链','设备公司 → AI 应用']}[episode];
  text(context,ending[0],110,249,60,palette.white,700);
  text(context,'公开事实与教学归纳分开；不承诺工艺效果或投资收益。',110,347,31,palette.mint);
  text(context,'内容依据',110,466,27,palette.orange,600);
  const sources={'03':['ASML · Chipmakers / Company','Amkor · Packaging & Test','Synopsys · EDA & IP'], '04':['ASML · Organization','Lam Research · Service / Spares','典型生命周期为教学归纳，非内部 SOP'], '05':['Applied Materials · AIx','Tokyo Electron · Epsira','KLA · Lumina / 其余为实施建议']}[episode];
  sources.forEach((source,index)=>text(context,source,110,532+index*62,30,'#D4E2E0'));
  text(context,'来源与适用边界：content/series-sources.md',110,742,26,palette.mint);
  rect(context,1190,443,620,304,'#1E3B42',22,'#436069');text(context,ending[1],1230,496,28,palette.orange,600);
  text(context,ending[2],1230,583,37,'#FFFDF8',700);text(context,ending[3],1230,655,37,'#FFFDF8',700);
  text(context,'JavaScript 原创动画 · AI 合成中文旁白 · 无背景音乐',110,866,28,palette.mint);
  text(context,'科普试播版 · 未经行业专家审校 · 配音使用条款尚待核实',110,934,25,'#B4C7C0');
  text(context,'Microsoft Xiaoxiao Neural / 不是实际设备操作指南',110,987,23,'#B4C7C0');
  rect(context,110,1030,1700*clamp(time/9),4,palette.mint,2);
}
