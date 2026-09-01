/**
 * Brazilian Portuguese Syllable Division Utility for Early Literacy (Alfabetização)
 * Adheres strictly to the Orthographic and Phonological Syllabification Rules of Portuguese.
 */

// Accurate pre-computed dictionary for common children's words
const KNOWN_SYLLABLES: Record<string, string[]> = {
  // Animals & Birds & Farm
  GALINHA: ['GA', 'LI', 'NHA'],
  GALO: ['GA', 'LO'],
  PINTO: ['PIN', 'TO'],
  PINTINHO: ['PIN', 'TI', 'NHO'],
  PINTINHOS: ['PIN', 'TI', 'NHOS'],
  NINHO: ['NI', 'NHO'],
  NINHOS: ['NI', 'NHOS'],
  OVO: ['O', 'VO'],
  OVOS: ['O', 'VOS'],
  CACHORRO: ['CA', 'CHOR', 'RO'],
  CAO: ['CÃO'],
  CADELA: ['CA', 'DE', 'LA'],
  GATO: ['GA', 'TO'],
  GATA: ['GA', 'TA'],
  GATINHO: ['GA', 'TI', 'NHO'],
  LEAO: ['LE', 'ÃO'],
  URSO: ['UR', 'SO'],
  COELHO: ['CO', 'E', 'LHO'],
  DINOSSAURO: ['DI', 'NOS', 'SAU', 'RO'],
  PASSARO: ['PÁS', 'SA', 'RO'],
  PASSARINHO: ['PAS', 'SA', 'RI', 'NHO'],
  CORUJA: ['CO', 'RU', 'JA'],
  PATO: ['PA', 'TO'],
  PEIXE: ['PEI', 'XE'],
  TUBARAO: ['TU', 'BA', 'RÃO'],
  BALEIA: ['BA', 'LEI', 'A'],
  MACACO: ['MA', 'CA', 'CO'],
  CAVALO: ['CA', 'VA', 'LO'],
  SAPO: ['SA', 'PO'],
  BORBOLETA: ['BOR', 'BO', 'LE', 'TA'],
  FORMIGA: ['FOR', 'MI', 'GA'],
  ABELHA: ['A', 'BE', 'LHA'],
  OVELHA: ['O', 'VE', 'LHA'],
  PORCO: ['POR', 'CO'],
  VACA: ['VA', 'CA'],
  BOI: ['BOI'],
  BEZERRO: ['BE', 'ZER', 'RO'],

  // Nature & Weather
  PARQUE: ['PAR', 'QUE'],
  FLORESTA: ['FLO', 'RES', 'TA'],
  BOSQUE: ['BOS', 'QUE'],
  ARVORE: ['ÁR', 'VO', 'RE'],
  PLANTA: ['PLAN', 'TA'],
  SOL: ['SOL'],
  PRAIA: ['PRAI', 'A'],
  DIA: ['DI', 'A'],
  CALOR: ['CA', 'LOR'],
  LUA: ['LU', 'A'],
  NOITE: ['NOI', 'TE'],
  NUVEM: ['NU', 'VEM'],
  CHUVA: ['CHU', 'VA'],
  CEU: ['CÉU'],
  FLOR: ['FLOR'],
  JARDIM: ['JAR', 'DIM'],
  ROSA: ['RO', 'SA'],
  ESTRELA: ['ES', 'TRE', 'LA'],
  PLANETA: ['PLA', 'NE', 'TA'],
  ESPACO: ['ES', 'PA', 'ÇO'],
  MAGICA: ['MÁ', 'GI', 'CA'],
  MAR: ['MAR'],
  RIO: ['RI', 'O'],
  LAGO: ['LA', 'GO'],
  MONTANHA: ['MON', 'TA', 'NHA'],

  // Objects & Places
  BOLA: ['BO', 'LA'],
  RODA: ['RO', 'DA'],
  MOEDA: ['MO', 'E', 'DA'],
  CARRO: ['CAR', 'RO'],
  CARRINHO: ['CAR', 'RI', 'NHO'],
  FOGUETE: ['FO', 'GUE', 'TE'],
  NAVIO: ['NA', 'VI', 'O'],
  BICICLETA: ['BI', 'CI', 'CLE', 'TA'],
  LIVRO: ['LI', 'VRO'],
  ESCOLA: ['ES', 'CO', 'LA'],
  CADERNO: ['CA', 'DER', 'NO'],
  CARTA: ['CAR', 'TA'],
  CASA: ['CA', 'SA'],
  CASTELO: ['CAS', 'TE', 'LO'],
  TOCA: ['TO', 'CA'],
  TELHADO: ['TE', 'LHA', 'DO'],
  ILHA: ['I', 'LHA'],
  MACA: ['MA', 'ÇÃ'],
  FRUTA: ['FRU', 'TA'],
  COMIDA: ['CO', 'MI', 'DA'],
  BOLO: ['BO', 'LO'],
  CORACAO: ['CO', 'RA', 'ÇÃO'],
  AMOR: ['A', 'MOR'],
  AMIZADE: ['A', 'MI', 'ZA', 'DE'],
  MENINO: ['ME', 'NI', 'NO'],
  MENINA: ['ME', 'NI', 'NA'],
  AMIGO: ['A', 'MI', 'GO'],
  AMIGA: ['A', 'MI', 'GA'],
  BRINQUEDO: ['BRIN', 'QUE', 'DO'],
  BONECA: ['BO', 'NE', 'CA'],
  AMARELA: ['A', 'MA', 'RE', 'LA'],
  AMARELO: ['A', 'MA', 'RE', 'LO'],
  AZUL: ['A', 'ZUL'],
  VERDE: ['VER', 'DE'],
  VERMELHO: ['VER', 'ME', 'LHO'],
  FELIZ: ['FE', 'LIZ'],
  FELIZES: ['FE', 'LI', 'ZES'],
};

// Inseparable consonant onset clusters in Portuguese
const INSEPARABLE_ONSETS = [
  'CH', 'LH', 'NH', 'GU', 'QU',
  'BR', 'CR', 'DR', 'FR', 'GR', 'PR', 'TR', 'VR',
  'BL', 'CL', 'FL', 'GL', 'PL', 'TL'
];

/**
 * Splits any Brazilian Portuguese word into phonological syllables.
 */
export function getSyllables(rawWord: string): string[] {
  if (!rawWord) return [];
  const upper = rawWord.trim().toUpperCase();
  const normalizedKey = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Check known dictionary first
  if (KNOWN_SYLLABLES[upper]) return KNOWN_SYLLABLES[upper];
  if (KNOWN_SYLLABLES[normalizedKey]) return KNOWN_SYLLABLES[normalizedKey];

  let w = upper;

  // 2. Separate digraphs that MUST be split across syllables: RR, SS, SC, SÇ, XC
  w = w.replace(/RR/g, 'R-R')
       .replace(/SS/g, 'S-S')
       .replace(/SC/g, 'S-C')
       .replace(/SÇ/g, 'S-Ç')
       .replace(/XC/g, 'X-C');

  // 3. Protect inseparable onsets (CH, LH, NH, clusters) using distinct unicode tokens
  const tokens: { onset: string; token: string }[] = [];
  INSEPARABLE_ONSETS.forEach((onset, i) => {
    const token = String.fromCharCode(0xE000 + i);
    tokens.push({ onset, token });
    w = w.replace(new RegExp(onset, 'g'), token);
  });

  const V = '[AÁÀÃÂEÉÊIÍOÓÔÕUÚÜ]';
  const C = '[BCDFGHJKLMNPQRSTVWXYZÇ\\uE000-\\uE0FF]';

  // 4. Syllabification rules
  for (let iter = 0; iter < 5; iter++) {
    // V-CV (e.g. GA-LI, NI-NHO, TI-NHO, SA-PO, CA-SA)
    w = w.replace(new RegExp(`(${V})(${C}${V})`, 'g'), '$1-$2');

    // VC-CV (e.g. PIN-TI, PAR-QUE, CAR-TA, FOR-MI)
    w = w.replace(new RegExp(`(${V}${C})(${C}${V})`, 'g'), '$1-$2');

    // VCC-CV (e.g. MONS-TRO, TRANS-PORTE)
    w = w.replace(new RegExp(`(${V}${C}${C})(${C}${V})`, 'g'), '$1-$2');
  }

  // 5. Common hiatuses (e.g. RA-I-NHA, SA-U-DE, PA-IS, LU-A, BA-U)
  w = w.replace(/([AEIOU])([ÍÚ])/g, '$1-$2');
  w = w.replace(/([ÍÚ])([AEIOU])/g, '$1-$2');
  w = w.replace(/(LU)(A)\b/g, '$1-$2');
  w = w.replace(/(RI)(O)\b/g, '$1-$2');
  w = w.replace(/(DI)(A)\b/g, '$1-$2');
  w = w.replace(/(CO)(E)(LHO)/g, '$1-$2-$3');

  // 6. Restore protected onsets
  tokens.forEach(({ onset, token }) => {
    w = w.replace(new RegExp(token, 'g'), onset);
  });

  const parts = w.split('-').filter(Boolean);
  return parts.length > 0 ? parts : [upper];
}

/** Formats syllables with a decorative middle dot separator for kids */
export function formatSyllableString(word: string): string {
  const syllables = getSyllables(word);
  return syllables.join(' · ');
}
