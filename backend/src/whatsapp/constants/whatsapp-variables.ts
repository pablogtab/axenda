/**
 * Variables permitidas en las plantillas de WhatsApp de Axenda.
 * Estas variables son reemplazadas dinámicamente antes de enviar a Meta.
 */
export enum WhatsappVariable {
  CLIENT_NAME = 'clientName',
  PROFESSIONAL_NAME = 'professionalName',
  SERVICE_NAME = 'serviceName',
  APPOINTMENT_DATE = 'appointmentDate',
  APPOINTMENT_TIME = 'appointmentTime',
  BUSINESS_NAME = 'businessName',
  APPOINTMENT_LINK = 'appointmentLink',
  CANCEL_LINK = 'cancelLink',
}

/** 
 * Tipo para el mapeo de variables dinámicas
 */
export type WhatsappVariableData = Partial<Record<WhatsappVariable, string>>;
