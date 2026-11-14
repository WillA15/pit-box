// Small shared text helpers.

/** "1 pt", "2 pts". */
export const pts = (n) => `${n} pt${Number(n) === 1 ? '' : 's'}`;

/** plural(1, 'driver') -> "1 driver"; plural(3, 'driver') -> "3 drivers". */
export const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`;
