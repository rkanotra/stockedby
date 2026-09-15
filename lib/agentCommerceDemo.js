// Presentation-only state. This demo never calls checkout, payment or order APIs.
export const DEMO_PHASES = [
  { label: '01 / Shopper intent', title: '“Find white sneakers\nunder ₹3,000.”', detail: 'A clear request.\nA spending limit set by the shopper.', constraint: 'Budget · ₹3,000', status: 'Listening', duration: 2200, step: 0 },
  { label: '01 / Discovery', title: 'Finding a match.', detail: 'The agent looks for products\nthat meet the shopper’s request.', constraint: 'Searching your store', status: 'Searching', duration: 3200, step: 0 },
  { label: '02 / Store verification', title: 'Your product.\nA perfect fit.', detail: 'White sneakers · ₹2,490\nAvailable from your own store.', constraint: 'Price + availability checked', status: 'Verifying', duration: 2800, step: 1 },
  { label: '03 / Shopper approval', title: 'Ready when\nthe shopper is.', detail: 'The match is within budget.\nPayment waits for approval.', constraint: 'Within the ₹3,000 limit', status: 'Awaiting approval', duration: null, step: 2 },
  { label: '04 / Payment', title: 'Approval received.\nPayment in motion.', detail: 'The agent passes the approved\npurchase to the merchant.', constraint: 'Authorized · ₹2,490', status: 'Processing', duration: 2600, step: 3 },
  { label: '04 / Complete', title: 'A new order.\nAt your store.', detail: 'From a shopping question\nto a confirmed purchase.', constraint: 'Order confirmed · Demo', status: 'Complete', duration: null, step: 3 },
];

export const INITIAL_DEMO_STATE = { phase: 0, playing: true };

export function agentCommerceReducer(state, action) {
  switch (action.type) {
    case 'advance': {
      if (!state.playing || state.phase === 3 || state.phase === 5) return state;
      const phase = state.phase + 1;
      return { phase, playing: phase !== 3 && phase !== 5 };
    }
    case 'approve':
      if (state.phase !== 3 && !action.reducedMotion) return state;
      if (state.phase > 3) return state;
      return { phase: action.reducedMotion ? 5 : 4, playing: !action.reducedMotion };
    case 'toggle':
      if (state.phase === 3 || state.phase === 5) return state;
      return { ...state, playing: !state.playing };
    case 'replay':
      return { ...INITIAL_DEMO_STATE };
    default:
      return state;
  }
}
