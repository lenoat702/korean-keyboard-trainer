// XP rewards showing up and typing carefully. It never affects rank, which comes only
// from measured skill, so grinding XP can't buy a higher title.

/** Accuracy below this earns nothing, so mashing fast doesn't pay. */
export const XP_ACCURACY_MIN = 85;
/** Accuracy at or above this earns a 50% bonus. */
export const XP_BONUS_ACCURACY = 97;

/** One point per correct keystroke, plus the bonus for a careful round. */
export function xpFor(correct: number, accuracy: number): number {
  if (accuracy < XP_ACCURACY_MIN || correct <= 0) return 0;
  return correct + (accuracy >= XP_BONUS_ACCURACY ? Math.round(correct / 2) : 0);
}

/**
 * Falling words: a word only clears on an exact match, so every counted keystroke is already
 * correct, and a landed word is a missed deadline (it costs a life), not a typo. The game aims
 * for a 70–80% clear rate, so the accuracy gate would take away nearly every game's XP.
 */
export function fallingXp(correct: number): number {
  return Math.max(0, correct);
}
