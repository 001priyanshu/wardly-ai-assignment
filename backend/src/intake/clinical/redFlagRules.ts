import type { ClinicalCategory } from '../../shared/brief.schema.js';

export interface RedFlagRule {
  /** Short clinical label, becomes the redFlagScreen[].flag value. */
  flag: string;
  /** Plain-language question for the LLM to ask the patient. */
  prompt: string;
  /** Phrase the LLM is told to recognise as positive. */
  positiveCues: string[];
  /** Whether a positive answer should advise immediate escalation. */
  emergencyOnPositive: boolean;
}

const ALWAYS_ON: RedFlagRule[] = [
  {
    flag: 'Suicidal ideation or plan',
    prompt: 'In the past two weeks, have you had thoughts of harming yourself or that you would be better off not here?',
    positiveCues: ['yes', 'sometimes', 'often', 'thinking about it'],
    emergencyOnPositive: true,
  },
];

const RULES: Record<ClinicalCategory, RedFlagRule[]> = {
  cardiovascular: [
    {
      flag: 'Chest pain radiating to arm, neck, or jaw',
      prompt: 'Does the chest discomfort travel to your arm, neck, or jaw?',
      positiveCues: ['yes', 'arm', 'jaw', 'neck', 'shoulder'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Severe dyspnea at rest',
      prompt: 'Are you having trouble breathing right now even when sitting still?',
      positiveCues: ['yes', 'cannot catch breath', 'gasping'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Syncope or near-syncope',
      prompt: 'Have you fainted or nearly fainted with this episode?',
      positiveCues: ['yes', 'passed out', 'fainted', 'almost fainted'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Diaphoresis with chest symptoms',
      prompt: 'Have you been sweating heavily along with the chest symptoms?',
      positiveCues: ['yes', 'sweating', 'cold sweat'],
      emergencyOnPositive: false,
    },
    {
      flag: 'Prior cardiac history',
      prompt: 'Do you have a history of heart attack, stents, or heart failure?',
      positiveCues: ['yes', 'heart attack', 'stent', 'bypass', 'heart failure'],
      emergencyOnPositive: false,
    },
  ],
  respiratory: [
    {
      flag: 'Severe dyspnea at rest',
      prompt: 'Are you struggling to breathe even when sitting still?',
      positiveCues: ['yes', 'gasping', 'cannot speak in full sentences'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Hemoptysis',
      prompt: 'Have you coughed up any blood?',
      positiveCues: ['yes', 'blood', 'streaks'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Pleuritic chest pain with leg swelling',
      prompt: 'Do you have sharp chest pain that worsens with deep breaths, plus any leg swelling?',
      positiveCues: ['yes', 'sharp', 'leg swelling'],
      emergencyOnPositive: true,
    },
  ],
  gastrointestinal: [
    {
      flag: 'Hematemesis or melena',
      prompt: 'Have you vomited blood, or noticed black, tarry stools?',
      positiveCues: ['yes', 'blood', 'black', 'tarry'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Severe localized abdominal pain with rigidity',
      prompt: 'Is your belly very tender or hard to touch?',
      positiveCues: ['yes', 'rigid', 'very tender'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Persistent vomiting with dehydration',
      prompt: 'Have you been unable to keep fluids down for more than 24 hours?',
      positiveCues: ['yes', 'cannot keep down', '24 hours'],
      emergencyOnPositive: false,
    },
  ],
  genitourinary: [
    {
      flag: 'Flank pain with fever',
      prompt: 'Do you have back or side pain along with a fever?',
      positiveCues: ['yes', 'fever', 'back pain'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Inability to urinate',
      prompt: 'Are you unable to urinate at all?',
      positiveCues: ['yes', 'cannot urinate', 'no urine'],
      emergencyOnPositive: true,
    },
  ],
  neurological: [
    {
      flag: 'Sudden focal weakness or speech changes (FAST)',
      prompt: 'Have you had sudden weakness on one side, drooping face, or trouble speaking?',
      positiveCues: ['yes', 'one side', 'cannot speak', 'face droop'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Worst headache of life / thunderclap',
      prompt: 'Is this the worst headache you have ever had, or did it come on like a thunderclap?',
      positiveCues: ['yes', 'worst', 'thunderclap', 'sudden'],
      emergencyOnPositive: true,
    },
    {
      flag: 'New seizure',
      prompt: 'Have you had a new seizure or loss of consciousness?',
      positiveCues: ['yes', 'seizure', 'blacked out'],
      emergencyOnPositive: true,
    },
  ],
  psychiatric: [
    {
      flag: 'Active suicidal plan or intent',
      prompt: 'Do you have a plan or intention to act on thoughts of harming yourself?',
      positiveCues: ['yes', 'plan', 'tonight', 'intend'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Homicidal ideation',
      prompt: 'Have you had thoughts of harming someone else?',
      positiveCues: ['yes', 'hurt', 'kill'],
      emergencyOnPositive: true,
    },
    {
      flag: 'Acute psychosis or command hallucinations',
      prompt: 'Have you been hearing or seeing things others do not, or had thoughts that feel out of your control?',
      positiveCues: ['yes', 'voices', 'hallucination'],
      emergencyOnPositive: true,
    },
  ],
  musculoskeletal: [
    {
      flag: 'Trauma with deformity or inability to bear weight',
      prompt: 'Did this happen from a fall or injury, and are you unable to put weight on it?',
      positiveCues: ['yes', 'fall', 'injury', 'cannot walk'],
      emergencyOnPositive: false,
    },
    {
      flag: 'Cauda equina red flags (back pain with bladder/bowel changes)',
      prompt: 'With back pain, have you noticed any loss of bladder or bowel control or numbness in the saddle area?',
      positiveCues: ['yes', 'incontinence', 'numb'],
      emergencyOnPositive: true,
    },
  ],
  dermatologic: [
    {
      flag: 'Rash with fever and mucosal involvement',
      prompt: 'Do you have a rash along with fever, or sores in your mouth, eyes, or genitals?',
      positiveCues: ['yes', 'fever', 'mouth sore', 'eye'],
      emergencyOnPositive: true,
    },
  ],
  endocrine: [
    {
      flag: 'DKA features (severe thirst, vomiting, confusion)',
      prompt: 'Have you been very thirsty, urinating a lot, vomiting, or feeling confused?',
      positiveCues: ['yes', 'confused', 'very thirsty', 'vomiting'],
      emergencyOnPositive: true,
    },
  ],
  constitutional: [
    {
      flag: 'High fever with rigors',
      prompt: 'Have you had a fever above 39°C / 102°F with shaking chills?',
      positiveCues: ['yes', 'high fever', 'shaking'],
      emergencyOnPositive: false,
    },
  ],
  heent: [
    {
      flag: 'Sudden vision loss or unilateral severe eye pain',
      prompt: 'Have you had sudden loss of vision or severe pain in one eye?',
      positiveCues: ['yes', 'cannot see', 'severe eye pain'],
      emergencyOnPositive: true,
    },
  ],
  other: [],
};

export function redFlagsForCategory(category: ClinicalCategory): RedFlagRule[] {
  const merged = new Map<string, RedFlagRule>();
  for (const r of [...(RULES[category] ?? []), ...ALWAYS_ON]) merged.set(r.flag, r);
  return [...merged.values()];
}
