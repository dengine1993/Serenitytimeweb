/**
 * Safety and Crisis Detection
 */

const CRISIS_KEYWORDS_RU = [
  'суицид',
  'самоубийство',
  'покончить с собой',
  'не хочу жить',
  'хочу умереть',
  'убить себя',
  'порезать',
  'повеситься',
  'прыгнуть',
  'таблетки все',
  'передоз'
];

const SELF_HARM_KEYWORDS_RU = [
  'порезать себя',
  'порезы',
  'самопорез',
  'режу себя',
  'бью себя',
  'самоповреждение'
];

export interface SafetyCheck {
  crisis_flag: boolean;
  self_harm_hint: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  action_needed: string | null;
}

export function detectCrisis(text: string): SafetyCheck {
  const lowerText = text.toLowerCase();

  // Check for crisis keywords
  const hasCrisisKeyword = CRISIS_KEYWORDS_RU.some(kw => lowerText.includes(kw));
  const hasSelfHarmKeyword = SELF_HARM_KEYWORDS_RU.some(kw => lowerText.includes(kw));

  if (hasCrisisKeyword) {
    return {
      crisis_flag: true,
      self_harm_hint: false,
      severity: 'critical',
      action_needed: 'REDIRECT_TO_CRISIS'
    };
  }

  if (hasSelfHarmKeyword) {
    return {
      crisis_flag: false,
      self_harm_hint: true,
      severity: 'high',
      action_needed: 'SUGGEST_CRISIS'
    };
  }

  // Check for indirect distress signals
  const distressPatterns = [
    /больше не могу/i,
    /нет смысла/i,
    /всё бесполезно/i,
    /никому не нужен/i
  ];

  const hasDistress = distressPatterns.some(pattern => pattern.test(text));

  if (hasDistress) {
    return {
      crisis_flag: false,
      self_harm_hint: false,
      severity: 'medium',
      action_needed: 'EMPATHY_RESPONSE'
    };
  }

  return {
    crisis_flag: false,
    self_harm_hint: false,
    severity: 'none',
    action_needed: null
  };
}

export function getCrisisResponse(): string {
  return `Я вижу, что тебе очень тяжело прямо сейчас. 

Открой раздел «Кризис» — там есть номера помощи и шаги для безопасности.

Твоя жизнь важна.`;
}

export function getSelfHarmResponse(): string {
  return `Я вижу, что сейчас больно. 

Давай найдём способ пережить этот момент безопасно. В разделе «Кризис» есть техники и контакты помощи.

Ты не один.`;
}
