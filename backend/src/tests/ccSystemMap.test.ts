import { describe, expect, it } from 'vitest';
import { classifyChiefComplaint, focusedRosSystems } from '../intake/clinical/ccSystemMap.js';
import { redFlagsForCategory } from '../intake/clinical/redFlagRules.js';

describe('classifyChiefComplaint', () => {
  it('classifies chest pain as cardiovascular', () => {
    expect(classifyChiefComplaint('I have chest pressure that started yesterday')).toBe(
      'cardiovascular',
    );
  });

  it('classifies low mood / sleep as psychiatric', () => {
    expect(classifyChiefComplaint('I have been feeling really depressed and cannot sleep')).toBe(
      'psychiatric',
    );
  });

  it('classifies cough/breathing as respiratory', () => {
    expect(classifyChiefComplaint('Bad cough and shortness of breath for a week')).toBe(
      'respiratory',
    );
  });

  it('falls back to "other" for unknown complaints', () => {
    expect(classifyChiefComplaint('General malaise asdf qwerty')).toBe('other');
  });
});

describe('focusedRosSystems', () => {
  it('always includes Constitutional as a baseline screen', () => {
    expect(focusedRosSystems('cardiovascular')).toContain('Constitutional');
    expect(focusedRosSystems('psychiatric')).toContain('Constitutional');
    expect(focusedRosSystems('other')).toContain('Constitutional');
  });

  it('cardiovascular focus includes Cardiovascular and Respiratory', () => {
    const systems = focusedRosSystems('cardiovascular');
    expect(systems).toContain('Cardiovascular');
    expect(systems).toContain('Respiratory');
    expect(systems).not.toContain('Skin');
    expect(systems).not.toContain('GU');
  });

  it('psychiatric focus includes Psychiatric and Neurological', () => {
    const systems = focusedRosSystems('psychiatric');
    expect(systems).toContain('Psychiatric');
    expect(systems).toContain('Neurological');
    expect(systems).not.toContain('Cardiovascular');
  });
});

describe('redFlagsForCategory', () => {
  it('cardiovascular includes radiation, syncope, severe dyspnea', () => {
    const flags = redFlagsForCategory('cardiovascular').map((r) => r.flag);
    expect(flags.some((f) => /radiating/i.test(f))).toBe(true);
    expect(flags.some((f) => /syncope/i.test(f))).toBe(true);
    expect(flags.some((f) => /dyspnea/i.test(f))).toBe(true);
  });

  it('always includes a suicidal ideation screen', () => {
    for (const cat of [
      'cardiovascular',
      'gastrointestinal',
      'psychiatric',
      'other',
    ] as const) {
      const flags = redFlagsForCategory(cat).map((r) => r.flag);
      expect(flags.some((f) => /suicid/i.test(f))).toBe(true);
    }
  });

  it('psychiatric includes active suicidal plan and homicidal ideation', () => {
    const flags = redFlagsForCategory('psychiatric').map((r) => r.flag);
    expect(flags.some((f) => /plan or intent/i.test(f))).toBe(true);
    expect(flags.some((f) => /homicidal/i.test(f))).toBe(true);
  });
});
