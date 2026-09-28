import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export function materialOutputs() {
  const assessment = JSON.parse(readFileSync('quality/assessment.json', 'utf8'));
  const ledger = JSON.parse(readFileSync('quality/claims.json', 'utf8'));
  const outputs = {};
  for (const form of ['A', 'B']) {
    let document = `# 学员卷 ${form} · ${assessment.version}\n\n本卷不附答案。请用自己的话解释，不知道可以写“不知道”，不必猜测。不查脚本、评分表或其他资料。\n\n参与编号：________  日期：________  使用视频版本：________\n\n开始时间：________  结束时间：________  是否提前看过题库或答案：________\n\n全卷 10 题，每题 5 分；总分 50 分。建议最多 20 分钟。这不是资格考试，结果用于发现讲解缺口。\n`;
    assessment.objectives.forEach((objective, index) => {
      document += `\n## ${index + 1}. ${objective.id}（第 ${Number(objective.episode)} 集）\n\n${objective[form]}\n\n答：\n\n________________________________________________________________\n\n________________________________________________________________\n\n________________________________________________________________\n`;
    });
    outputs[`quality/learner-${form}.md`] = document;
  }
  let rubric = '# 目标—讲解—考核对齐与评分表\n\n供评分者使用，不应在试学前给参与者。题目为本项目原创；两套卷难度未经实测校准。每个要点 0/1 分，每题 5 分，每集 10 分，全套 50 分。接受同义表达，明确矛盾的要点不得分。\n\n来源：CMU 目标/教学/考核对齐方法；项目改编与限制见 README.md。\n';
  for (const objective of assessment.objectives) {
    const directory = objective.episode === '01' ? 'output' : `output/episode-${objective.episode}`;
    const timeline = JSON.parse(readFileSync(`${directory}/timeline.json`, 'utf8'));
    const times = objective.scenes.map(id => {
      const scene = timeline.scenes.find(item => item.id === id);
      if (!scene) throw new Error(`Missing scene ${objective.episode}/${id}`);
      const stamp = `${String(Math.floor(scene.start / 60)).padStart(2, '0')}:${String(Math.floor(scene.start % 60)).padStart(2, '0')}`;
      return `${id}（${stamp} ${scene.title}）`;
    });
    rubric += `\n## ${objective.id} · ${objective.goal}\n\n讲解位置：[第 ${Number(objective.episode)} 集脚本](../content/episode-${objective.episode}.md)，场景 ${times.join('；')}。时间来自当前实际时间轴，精确值以 JSON 为准。\n\n**A 卷：**${objective.A}\n\n**B 卷：**${objective.B}\n\n**评分点（各 1 分）：**\n${objective.criteria.map((criterion, index) => `\n${index + 1}. ${criterion}${index === objective.criticalCriterion ? '【关键点】' : ''}`).join('')}\n\n**误解观察：**${objective.misconception} 不得分并不自动意味着明确误解；请记录参与者原话。\n`;
  }
  outputs['quality/rubric.md'] = rubric;
  let claims = '# 关键主张审查台账\n\n' + ledger.coverage + '\n\n当前均为代理初步梳理，**没有独立行业审校签字**。来源有支持不等于图解、读音或受众理解已经通过。\n';
  for (const claim of ledger.claims) {
    const sourceText = claim.sources.length ? claim.sources.map(id => {
      const source = ledger.sources.find(item => item.id === id);
      if (!source) throw new Error(`Unknown source ${id}`);
      return `- [${id}](${source.url})：${source.supports} 查阅状态：${source.access}；[已有记录](../${source.record})。`;
    }).join('\n') : '- 课程实施建议，非引用事实；须由独立工程复核者判断合理性，不填造来源。';
    claims += `\n## ${claim.id} · 第 ${Number(claim.episode)} 集 / 场景 ${claim.scenes.join('、')}\n\n**主张：**${claim.claim}\n\n**性质：**${claim.kind}；风险级别：${claim.risk}；目标：${claim.objectives.join('、')}。\n\n**依据与范围：**\n${sourceText}\n\n**图示检查：**${claim.visual}\n\n**简化与误解风险：**${claim.boundary}\n\n**本轮自查：**${claim.selfFinding}\n\n**独立审查：**待完成；结论与证据不得由代理预填。\n`;
  }
  outputs['quality/claims.md'] = claims;
  return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputs = materialOutputs();
  for (const [path, document] of Object.entries(outputs)) writeFileSync(path, document);
  console.log(`Generated ${Object.keys(outputs).length} quality documents from assessment and claim records`);
}
