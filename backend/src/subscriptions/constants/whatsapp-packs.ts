export const WHATSAPP_PACKS = {
  WPP_PACK_100: { code: 'WPP_PACK_100', name: 'Pack 100 Mensajes WhatsApp', quantity: 100, price: 6000 },
  WPP_PACK_500: { code: 'WPP_PACK_500', name: 'Pack 500 Mensajes WhatsApp', quantity: 500, price: 25000 },
  WPP_PACK_1000: { code: 'WPP_PACK_1000', name: 'Pack 1000 Mensajes WhatsApp', quantity: 1000, price: 40000 }
};

export type WhatsappPackCode = keyof typeof WHATSAPP_PACKS;
