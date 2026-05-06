/**
 * Frontend crisis detection (mirrors supabase/functions/_shared/safety.ts)
 * Used in SOS wizard to escalate when user types crisis keywords in grounding inputs.
 */

const CRISIS_KEYWORDS_RU = [
  'суицид',
  'самоубийство',
  'покончить с собой',
  'не хочу жить',
  'хочу умереть',
  'убить себя',
  'повеситься',
  'прыгнуть',
  'таблетки все',
  'передоз',
];

const CRISIS_KEYWORDS_EN = [
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'overdose',
  'hang myself',
];

const SELF_HARM_KEYWORDS = [
  'порезать себя',
  'режу себя',
  'самоповреждение',
  'cut myself',
  'self harm',
  'self-harm',
];

export interface SafetyCheck {
  crisis_flag: boolean;
  self_harm_hint: boolean;
}

export function detectCrisis(text: string): SafetyCheck {
  const lowerText = (text || '').toLowerCase();
  if (!lowerText.trim()) return { crisis_flag: false, self_harm_hint: false };

  const hasCrisis =
    CRISIS_KEYWORDS_RU.some((kw) => lowerText.includes(kw)) ||
    CRISIS_KEYWORDS_EN.some((kw) => lowerText.includes(kw));

  const hasSelfHarm = SELF_HARM_KEYWORDS.some((kw) => lowerText.includes(kw));

  return {
    crisis_flag: hasCrisis,
    self_harm_hint: hasSelfHarm,
  };
}
