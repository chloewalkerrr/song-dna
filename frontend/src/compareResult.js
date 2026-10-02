// A /compare result remembers the exact feature pair it answers:
// { a, b, findings, error }. Findings only shows a result that belongs to the
// pair currently on screen, so replacing either song hides the old findings
// during the very next render instead of after a new response arrives.

// Returns `result` when it was computed for this A/B pair, otherwise null
// (meaning the current pair is still loading). Pairs are compared by object
// identity, not contents: every load or upload produces a new features
// object, and a new object always needs its own comparison.
export function resultForPair(result, a, b) {
  return result && result.a === a && result.b === b ? result : null;
}
