// Small shared text helpers.

/** "1 pt", "2 pts". */
export const pts = (n) => `${n} pt${Number(n) === 1 ? '' : 's'}`;

/** ordinal(1) -> "1st", ordinal(12) -> "12th", ordinal(22) -> "22nd". */
export const ordinal = (n) => {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'}`;
};

/** plural(1, 'driver') -> "1 driver"; plural(3, 'driver') -> "3 drivers". */
export const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`;
