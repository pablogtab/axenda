# Axenda - Diseño de Integración con WhatsApp

Este documento detalla la arquitectura técnica y funcional para la integración de **Axenda** con la **WhatsApp Business Platform (Cloud API)** de Meta.

## 🎯 1. Objetivos de la Integración
1.  **Automatización:** Envío de confirmaciones, recordatorios y cancelaciones sin intervención humana.
2.  **Identidad de Marca:** Permitir que los negocios usen su propio número mediante el modo de **Coexistencia**.
3.  **Onboarding Premium:** Registro simplificado mediante **Embedded Signup**.
4.  **Control de Costos:** Seguimiento preciso de mensajes enviados para aplicar límites según el plan del cliente.

---

## 🔄 2. Flujo de Onboarding (Embedded Signup)
Para evitar que el cliente lidie con tokens técnicos, implementaremos el flujo oficial de Meta:

1.  **Trigger:** El cliente hace clic en "Conectar WhatsApp" en el panel de Axenda.
2.  **Popup:** Se abre el flujo de Meta donde el cliente selecciona su Business Account y Número.
3.  **Callback:** Meta envía un `code` al frontend de Axenda.
4.  **Backend Exchange:** El backend de Axenda intercambia ese código por un **Access Token de Usuario** de larga duración.
5.  **Data Storage:** Se guardan el `WABA_ID`, `PHONE_NUMBER_ID` y el `ACCESS_TOKEN` vinculados al `Tenant`.

---

## ✉️ 3. Gestión de Mensajes y Plantillas (Templates)

### Categorías Utilizadas:
*   **UTILITY (Utilidad):** Recordatorios de turnos (24h antes), confirmaciones de reserva inmediata.
*   **MARKETING:** Promociones especiales enviadas por el profesional.
*   **SERVICE (Servicio):** Respuestas libres cuando el cliente escribe primero (ej: "¿Dónde queda el local?").

### Ciclo de Envío:
1.  **Evento:** Se crea un turno en la DB de Axenda.
2.  **Worker:** Un proceso en segundo plano (BullMQ/NestJS) programa los mensajes.
3.  **API Call:** Axenda llama a la Cloud API de Meta usando el template aprobado.
4.  **Logging:** Se registra el mensaje en la tabla `WhatsappLog` para el conteo mensual del plan.

---

## 🛠️ 4. Modelo de Datos (Prisma)

Para soportar la multi-tenencia y el control de límites, extendemos el esquema:

```prisma
// Configuración de WhatsApp por cada negocio
model TenantWhatsappConfig {
  id                String   @id @default(uuid())
  tenantId          String   @unique
  wabaId            String?  // WhatsApp Business Account ID
  phoneId           String?  // Phone Number ID
  accessToken       String?  // Token de acceso de larga duración (Cifrado)
  verified          Boolean  @default(false)
  
  // Mapeo de Plantillas Activas
  confirmationTemplateId String?
  reminderTemplateId     String?
  cancellationTemplateId String?

  // Estadísticas de uso mensual
  messagesSentMonth Int      @default(0)
  lastResetDate     DateTime @default(now())

  tenant            Tenant   @relation(fields: [tenantId], references: [id])
}

// Catálogo de Plantillas (Globales y Personalizadas)
model WhatsappTemplate {
  id                String   @id @default(uuid())
  tenantId          String?  // Null para plantillas globales de Axenda
  name              String   @unique // Nombre técnico para Meta (ej: axenda_confirm_v1)
  body              String   // Texto con variables {{1}}, {{2}}...
  category          String   @default("UTILITY") // UTILITY, MARKETING
  status            String   @default("PENDING") // PENDING, APPROVED, REJECTED
  language          String   @default("es_AR")
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// Log de mensajes para auditoría y facturación
model WhatsappMessageLog {
  id                String   @id @default(uuid())
  tenantId          String
  phoneNumber       String
  templateId        String
  status            String   // DELIVERED, READ, FAILED
  metaMessageId     String?  // ID devuelto por Meta
  createdAt         DateTime @default(now())
}
```

---

## 🔗 5. Webhooks y Coexistencia
Axenda debe escuchar los Webhooks de Meta para:
1.  **Confirmación de Entrega:** Actualizar el estado en `WhatsappMessageLog` (Doble tilde azul).
2.  **Respuestas del Cliente:** Si el cliente responde al recordatorio, el webhook recibe el texto.
    *   **Acción:** Axenda puede notificar al profesional mediante un Push Notification o Email, permitiendo que la "Coexistencia" funcione: el profesional ve el mensaje en su App y en el panel de Axenda.

---

## 📈 6. Lógica de Control de Límites
Cada vez que se intenta enviar un mensaje:
1.  Se consulta `TenantWhatsappConfig.messagesSentMonth`.
2.  Se compara con el `maxWhatsapp` del plan actual (Business: 300, Elite: 1.000).
3.  Si se alcanzó el límite:
    *   Se bloquea el envío por WhatsApp.
    *   Se degrada automáticamente a **Email**.
    *   Se notifica al dueño del negocio para un "Upgrade" o compra de paquete extra.

---

## 📋 7. Librería de Plantillas (Templates)

Para mantener la calidad y la aprobación de Meta, manejamos dos tipos de plantillas:

### A. Plantillas Estándar de Axenda (Plan Business & Elite)
Son plantillas genéricas pero profesionales, pre-aprobadas por Meta bajo la cuenta oficial de Axenda. Los negocios pueden usarlas instantáneamente sin esperar revisión.
*   **Confirmación:** `axenda_confirm_v1`
    *   *Texto:* "Hola {{1}}, ¡tu turno ha sido reservado! Nos vemos en {{2}} el día {{3}} a las {{4}}."
*   **Recordatorio (24h antes):** `axenda_remind_v1`
    *   *Texto:* "Hola {{1}}, recordá tu turno para mañana en {{2}} a las {{3}}."
*   **Cancelación:** `axenda_cancel_v1`
    *   *Texto:* "Hola {{1}}, tu turno en {{2}} ha sido cancelado. Si querés reprogramar, podés hacerlo acá: {{3}}"

### B. Plantillas Personalizadas (Exclusivo Plan Elite)
Permite a los negocios con número propio (Dedicated) crear su propia voz de marca.
1.  **Creación:** El usuario redacta el mensaje en el panel de Axenda.
2.  **Envío a Meta:** Axenda envía la propuesta a la API de Meta.
3.  **Revisión:** Meta demora de 1 a 24 horas en aprobar.
4.  **Activación:** Axenda recibe un Webhook (`message_template_status_update`) y habilita la plantilla para su uso automático.

---

## 🎨 8. Interfaz del Editor de Plantillas (UI/UX)

Para que el usuario pueda gestionar sus plantillas personalizadas (exclusivo de **Plan Elite**), la interfaz se divide en dos paneles:

### A. Panel de Edición (Izquierda)
*   **Nombre de la Plantilla:** Identificador único para Meta.
*   **Categoría:** Selector entre Utilidad (turnos) o Marketing (promos).
*   **Selector de Variables:** Botones rápidos para insertar `{{Nombre_Cliente}}`, `{{Fecha_Turno}}`, `{{Hora_Turno}}`, `{{Nombre_Negocio}}`.
*   **Cuerpo del Mensaje:** Área de texto con validación en tiempo real de caracteres especiales.

### B. Vista Previa (Derecha)
*   Un **Mockup de Celular Realista** que muestra exactamente cómo se verá el mensaje dentro de la burbuja de chat de WhatsApp.
*   **Indicador de Estado:** Una etiqueta visual que muestra si la plantilla está:
    *   🟡 **Pendiente:** Enviada a Meta para revisión.
    *   🟢 **Aprobada:** Lista para ser usada en los recordatorios.
    *   🔴 **Rechazada:** Con el motivo del rechazo para que el usuario pueda corregirla.

![Mockup del Editor de Plantillas WhatsApp](/C:/Users/SocialPath/.gemini/antigravity/brain/cb9aa903-3e84-4b7c-b31b-fc7ffa86e03f/whatsapp_template_editor_mockup_1777693111167.png)

---

## 🔐 9. Seguridad y Privacidad
*   Los `AccessTokens` de Meta se almacenan **encriptados** en la base de datos (AES-256).
*   Se implementa validación de la firma de Meta (`X-Hub-Signature-256`) en todos los Webhooks para evitar ataques de spoofing.
