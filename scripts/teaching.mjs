export const teachingRevision = '2026-09-28-cue-sync';
export const thinkingSeconds = 3;

const termDefinitions = [
  {episode: '02', scene: '03', phrase: '叫光刻胶', text: '光刻胶：对光敏感、用于形成图案的材料'},
  {episode: '02', scene: '07', phrase: '平坦化', text: 'CMP：化学与机械共同作用，让表面更平整'},
  {episode: '02', scene: '08', phrase: '对得准', text: '套刻：不同层的图形是否对准'},
  {episode: '03', scene: '02', phrase: '无晶圆厂', text: 'Fabless：以设计为主，没有自己的晶圆制造厂'},
  {episode: '03', scene: '03', phrase: '晶圆代工厂', text: 'Foundry：按约定为客户制造芯片'},
  {episode: '03', scene: '07', phrase: 'EDA', text: 'EDA：帮助工程师设计、验证电路的工具'},
  {episode: '03', scene: '07', phrase: 'IP 核', text: 'IP 核：可复用的电路设计模块，仍需系统验证'},
  {episode: '03', scene: '08', phrase: 'IDM', text: 'IDM：既设计芯片，也拥有制造能力的企业模式'},
  {episode: '04', scene: '01', phrase: '固定组织图', text: 'SOP：标准作业程序；本片不是某公司的内部 SOP'},
  {episode: '04', scene: '04', phrase: '物料清单', text: 'BOM：物料清单，记录组成产品所需的物料'},
  {episode: '04', scene: '07', phrase: '配方吗', text: '配方：加工步骤及其参数，不只是化学配比'},
];

const topics = {
  '设计': ['设计', '版图'], '晶圆制造': ['制造', '工厂', '代工'], '封装测试': ['封装', '封测', '测试'],
  '设备 / 材料': ['设备', '材料'], '工具 / 材料': ['工具', '材料'],
  '需求与架构': ['需求', '任务', '架构'], '电路与验证': ['电路', '验证'], '版图实现': ['版图'],
  '设计与版图': ['设计', '图纸'], '工艺规则': ['规则', '制造条件'],
  '电气连接': ['连接'], '机械保护': ['保护', '套一个壳'], '热管理': ['散热'],
  '材料供应': ['材料', '硅片', '气体'], '晶圆厂': ['晶圆厂', '制造企业'], '零部件': ['零部件', '供应商'], '设备商': ['设备商', '机器'],
  'EDA / IP': ['EDA', 'IP', '模块', '自动化'], '接口与工艺验证': ['工艺', '接口', '验证'], '芯片设计': ['设计'],
  '制造': ['制造', '代工'], '封测协作': ['封测'], '外部制造 / 封测合作': ['外部', '交叉'],
  '腔体 / 真空': ['真空', '机械'], '气体 / 温控': ['气体', '温度'], '电气 / 传感': ['电气', '传感'], '软件 / 工艺': ['软件', '工艺'],
  '物料清单': ['物料清单'], '部件与检验': ['零部件', '质量检查'], '装配与追溯': ['装配', '追溯', '版本'],
  '出厂检查': ['出厂', '装好', '安全功能'], '运输 / 安装': ['运输', '安装'], '现场验证': ['现场', '验收'],
  '设备状态': ['设备'], '来料 / 环境': ['来料', '环境'], '配方版本': ['配方'], '量测条件': ['测量', '结果'],
  '运行': ['运行', '交付'], '维护': ['维护', '换件', '清洗'], '检查': ['检查', '确认'], '恢复': ['恢复'],
  '现场记录': ['记录', '现场问题'], '授权 / 脱敏': ['授权', '脱敏', '约定'], '研发与受控变更': ['研发', '变更', '修复'],
  '谁负责？': ['谁来', '负责'], '什么数据？': ['数据'], '怎样调查？': ['调查', '异常'], '如何验收？': ['确认', '验收'],
  '工程问题': ['手册', '工单', '问题'], '权限 / 版本筛选': ['版本', '权限', '正确'], '带来源的回答': ['引用', '证据', '回答', '不知道'],
  '使用工况': ['工况'], '状态变化': ['状态', '健康'], '检查 / 维护': ['维护', '检查', '更换'],
  '实验数据': ['数据', '量测'], '模型建议': ['模型', '建议'], '受控实验': ['实验', '审批'], '真实量测': ['真实量测', '实际量测'],
  '装配检查': ['装配'], '调试报告': ['报告'], '软件测试': ['软件', '测试'],
  '设备 ID': ['设备'], '时间': ['时间'], '批次': ['批次'],
  '训练数据': ['训练', '预测类'], '冻结模型与配置': ['固定', '泄漏'], '同一份留出测试数据': ['同样标准', '测试', '时间段'],
  '现有规则 / 人工': ['人工', '规则'], 'AI 方法': ['AI', '准确率', '误报'],
  '离线回放': ['离线'], '只读现场 + 审批': ['只观察', '审批', '现场'], '有限受控使用': ['受控', '验证后', '联锁'],
};

export function currentCue(scene, time) {
  return scene.cues.find(cue => time >= cue.start && time < cue.end);
}

export function isTopicActive(scene, time, label) {
  const cue = currentCue(scene, time);
  if (!cue) return false;
  return (topics[label] || [label]).some(phrase => cue.text.includes(phrase));
}

export function termsFor(episode, scene) {
  return termDefinitions.filter(term => term.episode === episode && term.scene === scene.id).map(term => {
    const cue = scene.cues.find(item => item.text.includes(term.phrase));
    if (!cue) throw new Error(`Missing term cue ${episode}/${scene.id}/${term.phrase}`);
    return {...term, start: cue.start, end: Math.min(scene.duration - .5, Math.max(cue.end, cue.start + 7))};
  });
}

export function termAt(episode, scene, time) {
  return termsFor(episode, scene).filter(term => time >= term.start && time < term.end).at(-1);
}

export function quizAnswerStart(scene, questionCue) {
  const index = scene.cues.indexOf(questionCue);
  return index >= 0 ? scene.cues[index + 1]?.start ?? questionCue.end : scene.duration;
}

export function addThinkingPauses(episode, sceneId, sourceCues, lead) {
  const expected = {'01': 3, '02': 2, '03': 2}[episode] || 0;
  const answerIndexes = sceneId === '10' && expected ? sourceCues.flatMap((cue, index) => index > 0 && /^也?不是|^是。/.test(cue.text) && /[？?]$/.test(sourceCues[index - 1].text) ? [index] : []) : [];
  if (sceneId === '10' && answerIndexes.length !== expected) throw new Error(`Quiz boundaries mismatch ${episode}: expected ${expected}, got ${answerIndexes.length}`);
  const pauses = answerIndexes.map((index, order) => ({questionIndex: index - 1, answerIndex: index, sourceCut: sourceCues[index].start, start: sourceCues[index].start + lead + order * thinkingSeconds, duration: thinkingSeconds}));
  const cues = sourceCues.map((cue, index) => {
    const delay = pauses.filter(pause => pause.answerIndex <= index).length * thinkingSeconds;
    const held = pauses.some(pause => pause.questionIndex === index) ? thinkingSeconds : 0;
    return {...cue, start: cue.start + lead + delay, end: cue.end + lead + delay + held};
  });
  return {cues, pauses};
}
