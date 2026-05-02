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
  accessToken       String?  // Token de acceso de larga duración
  verified          Boolean  @default(false)
  
  // Estadísticas de uso mensual
  messagesSentMonth Int      @default(0)
  lastResetDate     DateTime @default(now())

  tenant            Tenant   @relation(fields: [tenantId], references: [id])
}

// Log de mensajes para auditoría y facturación
model WhatsappMessageLog {
  id                String   @id @default(uuid())
  tenantId          String
  phoneNumber       String
  templateName      String
  category          String   // UTILITY, MARKETING, SERVICE
  status            String   // DELIVERED, READ, FAILED
  metaMessageId     String?  // ID devuelto por Meta
  cost              Decimal? @db.Decimal(10, 4)
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
