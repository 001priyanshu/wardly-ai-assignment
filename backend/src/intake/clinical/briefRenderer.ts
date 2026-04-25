import type { ClinicalBrief } from '../../shared/brief.schema.js';

const fmtList = (xs: string[]): string => (xs.length ? xs.join('; ') : '—');

const orDash = (s: string | null | undefined): string => (s && s.trim() ? s : '—');

/**
 * Strip leading "no " / "denies " / "does not have " / "doesn't have " / "without "
 * from pertinent-negative entries so they render cleanly as "denies X" once the
 * renderer prepends the verb. The LLM is also instructed not to produce these
 * forms, but we're defensive: a brief that says "denies no fever" reads as the
 * opposite of what we want.
 */
function normaliseNegative(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/^denies\s+/i, '')
    .replace(/^(does(\s*n['’]?t|\s+not)\s+have\s+)/i, '')
    .replace(/^(no|without|not)\s+/i, '')
    .trim();
}

function renderHpiTable(b: ClinicalBrief): string {
  const rows: Array<[string, string]> = [
    ['Onset', orDash(b.hpi.onset)],
    ['Provocation', orDash(b.hpi.provocation)],
    ['Palliation', orDash(b.hpi.palliation)],
    ['Quality', orDash(b.hpi.quality)],
    ['Region', orDash(b.hpi.region)],
    ['Radiation', orDash(b.hpi.radiation)],
    ['Severity', orDash(b.hpi.severity)],
    ['Timing', orDash(b.hpi.timing)],
  ];
  return ['| OPQRST | |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join('\n');
}

function renderRos(b: ClinicalBrief): string {
  if (!b.ros.length) return '_No focused ROS captured._';
  return b.ros
    .map((r) => {
      const positives = r.pertinentPositives.length
        ? r.pertinentPositives.join(', ')
        : '—';
      const negatives = r.pertinentNegatives.length
        ? r.pertinentNegatives.map(normaliseNegative).filter(Boolean).map((n) => `denies ${n}`).join(', ')
        : '—';
      return `**${r.system}**\n- Positives: ${positives}\n- Negatives: ${negatives}`;
    })
    .join('\n\n');
}

function renderRedFlags(b: ClinicalBrief): string {
  if (!b.redFlagScreen.length) return '_No red-flag screen captured._';
  return b.redFlagScreen
    .map((r) => {
      const mark = r.present ? '✅' : '☐';
      const status = r.present ? '**present**' : 'denied';
      const detail = r.detail ? ` (${r.detail})` : '';
      const escalate = r.present && r.escalationAdvised ? ' — _escalation advised_' : '';
      return `- ${mark} ${r.flag} — ${status}${detail}${escalate}`;
    })
    .join('\n');
}

function renderPatientHeader(b: ClinicalBrief): string {
  const parts: string[] = [];
  if (b.patient.name) parts.push(b.patient.name);
  if (b.patient.dob) parts.push(`DOB ${b.patient.dob}`);
  return parts.length ? parts.join(' · ') : 'Unknown patient';
}

export function renderBriefMarkdown(b: ClinicalBrief): string {
  const generated = b.meta.generatedAt;
  const warnings = b.meta.warnings.length
    ? `\n> ⚠️ ${b.meta.warnings.join(' · ')}`
    : '';

  const meds = fmtList(b.hpi.currentMedicationsForIssue);
  const assoc = fmtList(b.hpi.associatedSymptoms);
  const modif = fmtList(b.hpi.modifyingFactors);

  const corrections = b.patientConfirmation.corrections.length
    ? `\n\n**Corrections raised:** ${b.patientConfirmation.corrections.join('; ')}`
    : '';

  return `# Pre-Visit Clinical Brief

**Patient:** ${renderPatientHeader(b)}

**Generated:** ${generated}

> ${b.meta.disclaimer}${warnings}

## Chief Complaint

${b.chiefComplaint.statement}${b.chiefComplaint.duration ? ` — _${b.chiefComplaint.duration}_` : ''}

## History of Present Illness

${b.hpi.narrative}

${renderHpiTable(b)}

**Associated symptoms:** ${assoc}

**Modifying factors:** ${modif}

**Prior episodes:** ${orDash(b.hpi.priorEpisodes)}

**Current meds for this issue:** ${meds}

## Review of Systems (focused)

${renderRos(b)}

## Red-Flag Screen

${renderRedFlags(b)}

## Triage Impression

> _Not a diagnosis. Patient-reported observations only._

**Acuity:** ${b.triageImpression.acuityHint}

**Rationale:** ${b.triageImpression.rationale}

**Suggested next step:** ${b.triageImpression.suggestedNextStep}

## Patient Confirmation

> ${b.patientConfirmation.summaryReadBack}

**Confirmed by patient:** ${b.patientConfirmation.confirmed ? 'yes' : 'no'}${corrections}${b.clinicianNotes ? `\n\n## Notes\n\n${b.clinicianNotes}` : ''}
`;
}
