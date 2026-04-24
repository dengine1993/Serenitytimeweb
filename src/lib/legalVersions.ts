// Legal document versions for consent tracking
// Updated: 2026-01-11
export const LEGAL_VERSIONS = {
  offer: '2026-01-14',
  privacy: '2026-01-14',
  refund: '2026-01-03',
  disclaimer: '2026-01-03'
} as const;

export type ConsentType = 'offer' | 'privacy' | 'immediate_service' | 'disclaimer';
