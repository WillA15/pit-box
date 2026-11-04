// Jolpica country names -> ISO codes -> flag emoji.
const ISO = {
  Australia: 'AU', Austria: 'AT', Azerbaijan: 'AZ', Bahrain: 'BH', Belgium: 'BE', Brazil: 'BR', Canada: 'CA',
  China: 'CN', Hungary: 'HU', Italy: 'IT', Japan: 'JP', Malaysia: 'MY', Mexico: 'MX', Monaco: 'MC',
  Netherlands: 'NL', Qatar: 'QA', 'Saudi Arabia': 'SA', Singapore: 'SG', Spain: 'ES', UAE: 'AE', UK: 'GB', USA: 'US',
};
export function flag(country) {
  const iso = ISO[country];
  return iso ? String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🏁';
}
