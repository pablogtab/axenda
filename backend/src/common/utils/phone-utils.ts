export class PhoneUtils {
  /**
   * Normaliza un número de teléfono para el formato requerido por Meta (E.164).
   * @param phone El número a normalizar
   * @param defaultCountryCode Código de país a usar si no se detecta uno (default: '54')
   */
  static normalize(phone: string | null | undefined, defaultCountryCode = '54'): string {
    if (!phone) return '';

    // 1. Limpieza total: solo dígitos
    let clean = phone.replace(/\D/g, '');
    if (!clean) return '';

    // 2. Quitar '0' inicial (ej: 0351 -> 351 o 099 -> 99)
    if (clean.startsWith('0')) {
      clean = clean.substring(1);
    }

    // 3. Detección de Código de País
    const isUSA = clean.startsWith('1') && clean.length === 11;
    const knownLatamCodes = ['54', '55', '56', '57', '58', '591', '593', '595', '598', '52'];
    const detectedLatamCode = knownLatamCodes.find(code => clean.startsWith(code));

    let finalResult = '';

    if (detectedLatamCode || isUSA) { 
      const code = detectedLatamCode || '1';
      
      if (code === '54') {
        let nationalNumber = clean.substring(2);
        if (nationalNumber.startsWith('9')) nationalNumber = nationalNumber.substring(1);
        if (nationalNumber.startsWith('15')) nationalNumber = nationalNumber.substring(2);
        
        const internal15Regex = /^(\d{2,4})15(\d{6,8})$/;
        if (internal15Regex.test(nationalNumber)) {
          nationalNumber = nationalNumber.replace(internal15Regex, '$1$2');
        }
        finalResult = `549${nationalNumber}`;
      } else {
        finalResult = clean;
      }
    } else {
      // 4. Si NO se detectó código de país, aplicamos lógica por defecto
      if (defaultCountryCode === '54') {
        if (clean.startsWith('15')) clean = clean.substring(2);
        const internal15Regex = /^(\d{2,4})15(\d{6,8})$/;
        if (internal15Regex.test(clean)) {
          clean = clean.replace(internal15Regex, '$1$2');
        }
        finalResult = `549${clean}`;
      } else {
        finalResult = `${defaultCountryCode}${clean}`;
      }
    }

    // 5. VALIDACIÓN DE SEGURIDAD: Longitud mínima
    // Un número de WhatsApp válido (con prefijo) debe tener al menos 10 dígitos.
    // Ej: 549 + 11 + 1234567 = 12 dígitos. 
    // Si tiene menos de 10, lo consideramos inválido/basura.
    if (finalResult.length < 10) {
      return '';
    }

    return finalResult;
  }
}
