import { ProfanityFilter } from './profanity-filter';

describe('ProfanityFilter', () => {
  describe('deLeetspeak', () => {
    it('should translate basic leetspeak numbers to standard letters', () => {
      expect(ProfanityFilter.deLeetspeak('C0NCH4')).toBe('CONCHA');
      expect(ProfanityFilter.deLeetspeak('M13RD4')).toBe('MIERDA');
      expect(ProfanityFilter.deLeetspeak('P3L0TUD0')).toBe('PELOTUDO');
      expect(ProfanityFilter.deLeetspeak('PUT0')).toBe('PUTO');
      expect(ProfanityFilter.deLeetspeak('FUCK1NG')).toBe('FUCKING');
      expect(ProfanityFilter.deLeetspeak('SH1T')).toBe('SHIT');
      expect(ProfanityFilter.deLeetspeak('B0LUD010')).toBe('BOLUDOIO');
    });
  });

  describe('isProfane', () => {
    it('should detect direct profane words', () => {
      expect(ProfanityFilter.isProfane('mierda')).toBe(true);
      expect(ProfanityFilter.isProfane('puto')).toBe(true);
      expect(ProfanityFilter.isProfane('fuck')).toBe(true);
      expect(ProfanityFilter.isProfane('bitch')).toBe(true);
    });

    it('should detect profane word stems inside other words', () => {
      expect(ProfanityFilter.isProfane('juan-putita')).toBe(true);
      expect(ProfanityFilter.isProfane('conchudo')).toBe(true);
      expect(ProfanityFilter.isProfane('pelotudos')).toBe(true);
      expect(ProfanityFilter.isProfane('motherfucker')).toBe(true);
    });

    it('should detect leetspeak obfuscated profanities', () => {
      expect(ProfanityFilter.isProfane('C0nCH4')).toBe(true);
      expect(ProfanityFilter.isProfane('pUt0')).toBe(true);
      expect(ProfanityFilter.isProfane('m13rd4')).toBe(true);
      expect(ProfanityFilter.isProfane('sh1t')).toBe(true);
      expect(ProfanityFilter.isProfane('fuck1ng')).toBe(true);
    });

    it('should detect separated profanities (hyphens, spaces, underscores)', () => {
      expect(ProfanityFilter.isProfane('p-u-t-o')).toBe(true);
      expect(ProfanityFilter.isProfane('P_U_T_O')).toBe(true);
      expect(ProfanityFilter.isProfane('p u t o')).toBe(true);
      expect(ProfanityFilter.isProfane('C-0-N-C-H-4')).toBe(true);
    });

    it('should return false for clean words', () => {
      expect(ProfanityFilter.isProfane('juan')).toBe(false);
      expect(ProfanityFilter.isProfane('barberia-gomez')).toBe(false);
      expect(ProfanityFilter.isProfane('agenda-facil')).toBe(false);
      expect(ProfanityFilter.isProfane('descuento')).toBe(false);
      expect(ProfanityFilter.isProfane('promo-123')).toBe(false);
      expect(ProfanityFilter.isProfane(null)).toBe(false);
      expect(ProfanityFilter.isProfane(undefined)).toBe(false);
    });
  });
});
