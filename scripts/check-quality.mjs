import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {materialOutputs} from './quality-materials.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const requireCondition = (condition, message) => {if (!condition) throw new Error(message);};
const evidencePath = path => typeof path === 'string' && path.startsWith('quality/evidence/') && !path.includes('..') && !path.includes('\\');
const manifestPath = process.argv.find(argument => argument.startsWith('--manifest='))?.slice(11) || 'quality/release.json';

try {
  const assessment = read('quality/assessment.json');
  const ledger = read('quality/claims.json');
  const manifest = read(manifestPath);
  const ids = assessment.objectives.map(item => item.id);
  requireCondition(ids.length === 10 && new Set(ids).size === ids.length, 'Expected 10 unique learning objectives');
  const sourceIds = new Set(ledger.sources.map(item => item.id));
  requireCondition(sourceIds.size === ledger.sources.length, 'Duplicate source IDs');
  const claimIds = ledger.claims.map(item => item.id);
  requireCondition(claimIds.length === 25 && new Set(claimIds).size === 25, 'Expected 25 unique key claims');
  for (const episode of ['01', '02', '03', '04', '05']) {
    const timeline = read(episode === '01' ? 'output/timeline.json' : `output/episode-${episode}/timeline.json`);
    requireCondition(assessment.objectives.filter(item => item.episode === episode).length === 2, `Need two objectives for ${episode}`);
    for (const objective of assessment.objectives.filter(item => item.episode === episode)) {
      requireCondition(objective.A && objective.B && objective.A !== objective.B && objective.criteria.length === 5 && objective.criteria.every(Boolean), `Invalid assessment ${objective.id}`);
      requireCondition(Number.isInteger(objective.criticalCriterion) && objective.criticalCriterion >= 0 && objective.criticalCriterion < 5, `Invalid critical point ${objective.id}`);
      requireCondition(objective.scenes.length && objective.scenes.every(id => timeline.scenes.some(scene => scene.id === id)), `Missing objective scene ${objective.id}`);
      requireCondition(ledger.claims.some(claim => claim.objectives.includes(objective.id)), `Uncovered objective ${objective.id}`);
    }
    for (const claim of ledger.claims.filter(item => item.episode === episode)) {
      requireCondition(['source-backed', 'synthesis', 'recommendation'].includes(claim.kind), `Invalid claim type ${claim.id}`);
      requireCondition(claim.kind === 'recommendation' || claim.sources.length, `Missing source for ${claim.id}`);
      requireCondition(claim.sources.every(id => sourceIds.has(id)) && claim.objectives.every(id => ids.includes(id)), `Broken claim references ${claim.id}`);
      requireCondition(claim.scenes.every(id => timeline.scenes.some(scene => scene.id === id)), `Broken claim scene ${claim.id}`);
      requireCondition(claim.boundary && claim.selfFinding && claim.visual, `Missing review boundary ${claim.id}`);
    }
  }
  for (const source of ledger.sources) requireCondition(/^https:\/\//.test(source.url) && existsSync(source.record) && source.access && source.supports, `Incomplete source ${source.id}`);
  for (const [path, expected] of Object.entries(materialOutputs())) requireCondition(existsSync(path) && readFileSync(path, 'utf8') === expected, `Stale generated material ${path}; run npm run quality:materials`);
  const hashes = {};
  for (const [path, expected] of Object.entries(manifest.files)) {
    requireCondition(existsSync(path), `Missing locked artifact ${path}`);
    hashes[path] = digest(readFileSync(path));
    requireCondition(hashes[path] === expected, `Review batch stale: ${path} changed; re-review required`);
  }
  const required = ['quality/assessment.json', 'quality/claims.json', 'quality/pilot-protocol.md', 'quality/review-checklist.md', 'scripts/check-quality.mjs', 'scripts/quality-materials.mjs'];
  for (const episode of ['01', '02', '03', '04', '05']) {
    const root = episode === '01' ? 'output' : `output/episode-${episode}`;
    required.push(`${root}/episode-${episode}.mp4`, `${root}/episode-${episode}.zh-CN.srt`, `${root}/timeline.json`, `content/episode-${episode}.md`);
    const verification = read(`${root}/verification.json`);
    requireCondition(verification.pass && verification.checks.every(check => check.pass) && verification.sha256 === hashes[`${root}/episode-${episode}.mp4`], `Technical evidence stale or failed: ${episode}`);
  }
  requireCondition(required.every(path => Object.hasOwn(hashes, path)), 'Manifest omits required locked artifacts');
  const releaseFingerprint = digest(JSON.stringify(Object.entries(hashes).sort(([first], [second]) => first.localeCompare(second))));
  requireCondition(manifest.fingerprint === releaseFingerprint, 'Manifest fingerprint mismatch');
  const gateIds = ['independent_content', 'human_audio', 'information_equivalence', 'rights', 'issue_resolution', 'learner_pilot'];
  requireCondition(manifest.gates.length === 6 && new Set(manifest.gates.map(gate => gate.id)).size === 6 && gateIds.every(id => manifest.gates.some(gate => gate.id === id)), 'Gate list must include all six required gates');
  const gates = manifest.gates.map(gate => {
    requireCondition(['pending', 'blocked', 'approved'].includes(gate.status), `Invalid gate status ${gate.id}`);
    if (gate.status !== 'approved') return {id: gate.id, status: gate.status, reason: gate.reason, pass: false};
    requireCondition(evidencePath(gate.evidence) && existsSync(gate.evidence), `Missing real evidence for approved gate ${gate.id}`);
    const evidence = read(gate.evidence);
    requireCondition(evidence.gateId === gate.id && evidence.releaseFingerprint === releaseFingerprint && evidence.decision === 'approved', `Evidence mismatch ${gate.id}`);
    requireCondition(evidence.reviewerKind === 'human' && evidence.reviewer?.trim() && evidence.role?.trim() && /^\d{4}-\d{2}-\d{2}/.test(evidence.reviewedAt), `Missing human reviewer ${gate.id}`);
    requireCondition(['01', '02', '03', '04', '05'].every(id => evidence.coverage?.includes(id)), `Incomplete episode coverage ${gate.id}`);
    requireCondition(evidence.checks?.length && Array.isArray(evidence.findings) && evidence.findings.every(finding => finding.status === 'resolved' || finding.status === 'accepted' && finding.severity === 'minor' && finding.rationale), `Unresolved findings ${gate.id}`);
    requireCondition(evidence.evidenceFiles?.length && evidence.evidenceFiles.every(item => evidencePath(item.path) && existsSync(item.path) && digest(readFileSync(item.path)) === item.sha256), `Missing or stale evidence files ${gate.id}`);
    if (gate.id === 'independent_content') requireCondition(evidence.independent === true && claimIds.every(id => evidence.claimIds?.includes(id)), 'Content review must be independent and cover all claims');
    if (gate.id === 'rights') requireCondition(evidence.usageScope?.length && evidence.sources?.length, 'Rights review requires intended uses and authorization sources');
    if (gate.id === 'issue_resolution') requireCondition(['F02', 'F03', 'F04', 'F05'].every(id => evidence.resolvedIssueIds?.includes(id)), 'Open release issues not resolved');
    if (gate.id === 'learner_pilot') {
      const summary = evidence.pilotSummary;
      requireCondition(summary && Number.isInteger(summary.validParticipants) && summary.validParticipants >= 5 && summary.validParticipants <= 8, 'Pilot must follow preregistered 5–8 participant protocol');
      const minimum = Math.ceil(summary.validParticipants * .8);
      const meets = value => Number.isInteger(value) && value >= minimum && value <= summary.validParticipants;
      requireCondition(meets(summary.meetingCriteria) && ['01', '02', '03', '04', '05'].every(id => meets(summary.perEpisodeMeeting?.[id])) && summary.unresolvedSafetyMisconceptions === 0 && summary.unresolvedRepeatedMisconceptions === 0, 'Pilot criteria not met');
    }
    return {id: gate.id, status: 'approved', pass: true, evidence: gate.evidence};
  });
  const contentReady = gates.filter(gate => gate.id !== 'learner_pilot').every(gate => gate.pass);
  const pilotReady = contentReady && gates.every(gate => gate.pass);
  const status = {generatedAt: new Date().toISOString(), releaseFingerprint, materialIntegrity: 'PASS', technicalEvidence: 'PASS (current artifact hashes checked; does not re-run video decoder)', learningObjectives: ids.length, questions: ids.length * 2, keyClaims: claimIds.length, independentReviewedClaims: gates.find(gate => gate.id === 'independent_content').pass ? claimIds.length : 0, contentRelease: contentReady ? 'READY_WITHIN_REVIEWED_SCOPE' : 'BLOCKED', learningEvidence: pilotReady ? 'PILOT_CRITERIA_MET_NOT_GENERAL_PROOF' : 'NOT_VALIDATED', gates, limitations: ['Structural validation cannot authenticate human identities or truthfulness of evidence', 'Pilot performance does not establish general or long-term teaching effectiveness', 'Existing public pilot is not withdrawn by this script']};
  if (manifestPath === 'quality/release.json') writeFileSync('quality/status.json', JSON.stringify(status, null, 2) + '\n');
  console.log(`PASS materials: ${ids.length} objectives, ${ids.length * 2} questions, ${claimIds.length} key claims; current artifacts match`);
  console.log(`Content release: ${status.contentRelease}; learning evidence: ${status.learningEvidence}`);
  for (const gate of gates) console.log(`${gate.pass ? 'PASS' : 'BLOCKED'} ${gate.id}: ${gate.reason || gate.evidence}`);
  if (process.argv.includes('--gate') && !contentReady) process.exitCode = 1;
} catch (error) {
  console.error(`FAIL quality material/evidence validation: ${error.message}`);
  if (manifestPath === 'quality/release.json') writeFileSync('quality/status.json', JSON.stringify({generatedAt: new Date().toISOString(), materialIntegrity: 'FAIL', contentRelease: 'BLOCKED', learningEvidence: 'NOT_VALIDATED', error: error.message}, null, 2) + '\n');
  process.exitCode = 1;
}
