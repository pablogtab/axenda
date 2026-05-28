export class ProfanityFilter {
  // Mapeo común de caracteres Leetspeak a sus letras equivalentes
  private static readonly LEET_MAP: { [key: string]: string } = {
    '0': 'O',
    '1': 'I',
    '3': 'E',
    '4': 'A',
    '5': 'S',
    '7': 'T',
    '8': 'B',
    '9': 'G',
    '@': 'A',
    '$': 'S'
  };

  // Raíces y palabras ofensivas comunes en español e inglés
  private static readonly PROFANITY_STEMS = [
    // Español (Raíces/Stems y Palabras)
    'MIERD',      // mierda, mierdas, mierdecilla
    'PUT',        // puto, puta, putita, puton, putazo, putas, putos
    'CONCH',      // concha, conchita, conchudo, conchuda
    'ORT',        // orto, ortito
    'BOLUD',      // boludo, boluda, boludes
    'PELOTUD',    // pelotudo, pelotuda
    'CARAJO',     // carajo, carajito
    'CUL',        // culo, culito, culazo, culiar (pero ver abajo)
    'TETA',       // teta, tetas, tetona
    'CHOTA',      // chota, chotito
    'PIJA',       // pija, pijita
    'VERG',       // verga, vergazo, verguita
    'PINCHE',     // pinche, pinches
    'CABRON',     // cabrón, cabrona, cabrones
    'GILIPOL',    // gilipollas
    'JOD',        // joder, jodido, jodida, jode
    'COÑO',       // coño
    'PANOCHA',    // panocha
    'MAMAR',      // mamar
    'MAMAD',      // mamada, mamado
    'MAMON',      // mamón, mamona
    'PAJER',      // pajero, pajera
    'PAJA',       // paja, pajas
    'TROLO',      // trolo, trola
    'MARIC',      // maricón, marica, marico
    'HIJODEPUT',  // hijodeputa, hijadeputa
    'LARECONCHA', // la re concha
    'ZORR',       // zorra, zorro
    'FORR',       // forro, forra
    'SORET',      // sorete, soretito
    'CULIA',      // culiao, culia
    'KULIA',      // kuliao, kulia
    'PICHUL',     // pichula
    'CACA',       // caca, cacona
    'PENE',       // pene, penes
    'VAGINA',     // vagina
    'ANUS',       // anus
    'OJET',       // ojete, ojetes
    
    // Inglés (Raíces/Stems y Palabras)
    'FUCK',       // fuck, fucking, fucker, fucks
    'SHIT',       // shit, shitty, shitting, shits
    'BITCH',      // bitch, bitches, bitchy
    'ASSHOL',     // asshole, assholes
    'CUNT',       // cunt, cunts
    'DICK',       // dick, dicks
    'COCK',       // cock, cocks
    'PISS',       // piss, pissing, pissed
    'BASTARD',    // bastard, bastards
    'SLUT',       // slut, sluts, slutty
    'WHORE',      // whore, whores
    'WANKER',     // wanker, wankers
    'BOOBS',      // boobs
    'MOTHERFUCK', // motherfucker, motherfucking
    'CRAP',       // crap, crappy
    'PUSS',       // pussy, pussies
    'BOLLOCK'     // bollocks
  ];

  /**
   * Deshace la codificación Leetspeak básica, traduciendo números y símbolos a letras legibles.
   */
  static deLeetspeak(text: string): string {
    let clean = text.toUpperCase();
    for (const [leet, normal] of Object.entries(this.LEET_MAP)) {
      clean = clean.split(leet).join(normal);
    }
    return clean;
  }

  /**
   * Compara el texto de entrada contra el listado de raíces profanas.
   * Aplica de-leetspeak y remueve separadores como guiones y espacios para evitar bypasses.
   */
  static isProfane(text: string | null | undefined): boolean {
    if (!text) return false;

    // 1. Pasar a mayúsculas y recortar espacios externos
    let normalized = text.trim().toUpperCase();

    // 2. Aplicar De-leetspeak
    normalized = this.deLeetspeak(normalized);

    // 3. Eliminar caracteres separadores (guiones, guiones bajos, espacios) para capturar "P-U-T-O"
    const fullyCleaned = normalized.replace(/[-_\s]/g, '');

    // 4. Validar si alguna de las raíces profanas está contenida en el texto limpio
    return this.PROFANITY_STEMS.some((stem) => fullyCleaned.includes(stem));
  }
}
