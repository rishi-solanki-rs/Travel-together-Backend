const BOOKING_TRANSITIONS = {
  hold: ['confirmed', 'cancelled', 'expired', 'no_show'],
  pending: ['hold', 'confirmed', 'cancelled', 'payment_failed'],
  confirmed: ['checked_in', 'completed', 'cancelled', 'no_show'],
  checked_in: ['checked_out', 'completed', 'no_show'],
  checked_out: ['completed'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'return_requested'],
  delivered: ['return_requested', 'completed'],
  return_requested: ['returned'],
  attended: ['completed'],
  waitlisted: ['hold', 'cancelled'],
};

const TERMINAL_STATES = new Set(['cancelled', 'refunded', 'expired', 'completed', 'returned']);

const isValidBookingTransition = (fromState, toState) => {
  if (!fromState || !toState) return false;
  if (fromState === toState) return true;
  if (TERMINAL_STATES.has(fromState)) return false;
  const allowed = BOOKING_TRANSITIONS[fromState] || [];
  return allowed.includes(toState);
};

const isCancellableStatus = (status) => ['pending', 'hold', 'confirmed'].includes(status);

export { BOOKING_TRANSITIONS, TERMINAL_STATES, isValidBookingTransition, isCancellableStatus };
