import type { ClinicalCategory, RosSystem } from '../../shared/brief.schema.js';

/**
 * Heuristic CC text -> clinical category. The LLM also classifies, but we keep a
 * deterministic fallback so the focused-ROS / red-flag rules always have a category
 * to key off of even if structured output drifts.
 */
const KEYWORDS: Array<{ rx: RegExp; category: ClinicalCategory }> = [
  { rx: /\b(chest|heart|palpitation|angina)\b/i, category: 'cardiovascular' },
  { rx: /\b(breath|breathing|cough|wheeze|short of breath|sob|asthma|pneumonia)\b/i, category: 'respiratory' },
  { rx: /\b(stomach|nausea|vomit|diarrhea|abdomen|abdominal|belly|reflux|heartburn)\b/i, category: 'gastrointestinal' },
  { rx: /\b(urin|kidney|bladder|pee|burning when|uti)\b/i, category: 'genitourinary' },
  { rx: /\b(headache|migraine|dizz|numb|tingl|stroke|seizure|weakness)\b/i, category: 'neurological' },
  { rx: /\b(depress|anxious|anxiety|sad|panic|sleep|insomnia|mood|suicid)\b/i, category: 'psychiatric' },
  { rx: /\b(joint|knee|back pain|shoulder|sprain|sore muscle|arthritis)\b/i, category: 'musculoskeletal' },
  { rx: /\b(rash|itch|skin|hives|lesion)\b/i, category: 'dermatologic' },
  { rx: /\b(thyroid|diabetes|sugar|weight loss|weight gain|hot flash)\b/i, category: 'endocrine' },
  { rx: /\b(fever|fatigue|weight|chills|sweats)\b/i, category: 'constitutional' },
  { rx: /\b(ear|nose|throat|sore throat|sinus|congestion|hearing|vision)\b/i, category: 'heent' },
];

export function classifyChiefComplaint(text: string): ClinicalCategory {
  for (const { rx, category } of KEYWORDS) {
    if (rx.test(text)) return category;
  }
  return 'other';
}

/**
 * Map a clinical category to the ROS systems a clinician would actually focus on
 * for a pre-visit intake. Always includes Constitutional as a baseline screen.
 */
export function focusedRosSystems(category: ClinicalCategory): RosSystem[] {
  const base: RosSystem[] = ['Constitutional'];
  switch (category) {
    case 'cardiovascular':
      return [...base, 'Cardiovascular', 'Respiratory'];
    case 'respiratory':
      return [...base, 'Respiratory', 'Cardiovascular', 'HEENT'];
    case 'gastrointestinal':
      return [...base, 'GI', 'GU'];
    case 'genitourinary':
      return [...base, 'GU', 'GI'];
    case 'neurological':
      return [...base, 'Neurological', 'HEENT', 'Psychiatric'];
    case 'psychiatric':
      return [...base, 'Psychiatric', 'Neurological'];
    case 'musculoskeletal':
      return [...base, 'Musculoskeletal', 'Neurological'];
    case 'dermatologic':
      return [...base, 'Skin', 'Hematologic'];
    case 'endocrine':
      return [...base, 'Endocrine', 'Cardiovascular'];
    case 'heent':
      return [...base, 'HEENT', 'Respiratory'];
    case 'constitutional':
      return [...base, 'Hematologic', 'Endocrine'];
    case 'other':
    default:
      return [...base];
  }
}

/**
 * Example pertinent symptoms per system — used to scaffold the LLM's questioning,
 * not to constrain it. A clinician reviewer should recognise these as the things
 * actually asked at intake.
 */
export const PERTINENT_PROMPTS: Record<RosSystem, string[]> = {
  Constitutional: ['fever', 'chills', 'night sweats', 'fatigue', 'unintentional weight loss'],
  HEENT: ['headache', 'vision changes', 'sinus congestion', 'sore throat', 'ear pain'],
  Cardiovascular: ['palpitations', 'syncope', 'orthopnea', 'lower-extremity edema', 'exertional chest pain'],
  Respiratory: ['cough', 'sputum production', 'wheeze', 'hemoptysis', 'shortness of breath'],
  GI: ['nausea', 'vomiting', 'diarrhea', 'constipation', 'abdominal pain', 'changes in stool', 'reflux'],
  GU: ['dysuria', 'frequency', 'urgency', 'hematuria', 'flank pain'],
  Musculoskeletal: ['joint pain', 'swelling', 'stiffness', 'recent injury', 'reduced range of motion'],
  Neurological: ['numbness', 'tingling', 'weakness', 'dizziness', 'seizure', 'visual changes'],
  Psychiatric: ['low mood', 'anhedonia', 'anxiety', 'sleep disturbance', 'thoughts of self-harm'],
  Skin: ['rash', 'pruritus', 'new lesion', 'changes in mole'],
  Endocrine: ['polyuria', 'polydipsia', 'heat or cold intolerance', 'unexplained weight changes'],
  Hematologic: ['easy bruising', 'bleeding', 'lymphadenopathy'],
};
