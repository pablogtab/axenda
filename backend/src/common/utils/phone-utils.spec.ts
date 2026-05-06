import { PhoneUtils } from './phone-utils';

describe('PhoneUtils', () => {
  describe('normalize', () => {
    it('debería devolver string vacío para inputs nulos o vacíos', () => {
      expect(PhoneUtils.normalize(null)).toBe('');
      expect(PhoneUtils.normalize(undefined)).toBe('');
      expect(PhoneUtils.normalize('')).toBe('');
    });

    describe('Argentina (54)', () => {
      it('debería limpiar AR con 549 y 15 internos', () => {
        expect(PhoneUtils.normalize('+54 9 11 2233-4455')).toBe('5491122334455');
        expect(PhoneUtils.normalize('351152189191')).toBe('5493512189191');
        expect(PhoneUtils.normalize('011 15 2233 4455')).toBe('5491122334455');
        expect(PhoneUtils.normalize('54 11 2233 4455')).toBe('5491122334455');
      });

      it('debería manejar el 15 inicial', () => {
        expect(PhoneUtils.normalize('15 2233 4455')).toBe('54922334455');
      });
    });

    describe('Internacional', () => {
      it('debería respetar y limpiar números de Chile (56)', () => {
        // Formato Chile: 56 + 9 + 8 dígitos
        expect(PhoneUtils.normalize('+56 9 1234 5678')).toBe('56912345678');
        expect(PhoneUtils.normalize('56912345678')).toBe('56912345678');
      });

      it('debería respetar y limpiar números de Uruguay (598)', () => {
        // Formato Uruguay: 598 + 9X + 6 dígitos
        expect(PhoneUtils.normalize('+598 99 123 456')).toBe('59899123456');
      });

      it('debería respetar y limpiar números de México (52)', () => {
        expect(PhoneUtils.normalize('+52 1 55 1234 5678')).toBe('5215512345678');
      });

      it('debería respetar números de USA (+1) con 11 dígitos', () => {
        expect(PhoneUtils.normalize('+1 202 555 0123')).toBe('12025550123');
      });

      it('debería usar defaultCountryCode si no se detecta prefijo', () => {
        // Si el default es Chile (56)
        expect(PhoneUtils.normalize('912345678', '56')).toBe('56912345678');
      });
    });

    it('debería manejar casos con caracteres extraños', () => {
      expect(PhoneUtils.normalize(' ( +54 ) 9 - 351 . 218 # 9191 ')).toBe('5493512189191');
    });

    it('debería devolver vacío para números demasiado cortos (inválidos)', () => {
      expect(PhoneUtils.normalize('123')).toBe('');
      expect(PhoneUtils.normalize('5491')).toBe('');
      expect(PhoneUtils.normalize('011')).toBe('');
    });
  });
});
