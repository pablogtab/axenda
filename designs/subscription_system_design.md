# Axenda - Diseño del Sistema de Suscripciones

Este documento detalla la arquitectura funcional y técnica para el sistema de planes y pagos de **Axenda**.

## 💎 1. Jerarquía de Planes y Precios

Se han definido cuatro niveles de suscripción con un modelo Freemium y descuentos por pago anual (20% OFF).

| Plan | Enfoque | Precio Mensual | Pago Anual (20% OFF) |
| :--- | :--- | :--- | :--- |
| **BRONCE** | Inicio / Exploración | **$0 (GRATIS)** | **$0** |
| **ORO** | Profesional Independiente | **$12.500** | **$120.000** |
| **PLATINO** | Negocio en Crecimiento | **$24.500** | **$235.200** |
| **DIAMANTE** | **Élite & Marca Personal** | **$48.000** | **$460.800** |

> **Nota:** El pago anual equivale a pagar 9.6 meses y obtener 12 (más de 2 meses gratis).

---

## 🛠️ 2. Matriz de Funcionalidades

| Característica | **BRONCE** | **ORO** | **PLATINO** | **DIAMANTE** |
| :--- | :--- | :--- | :--- | :--- |
| **Turnos Mensuales** | Máximo 25 | **Ilimitados** | **Ilimitados** | **Ilimitados** |
| **Profesionales** | 1 (Dueño) | 1 (Dueño) | Hasta 5 | **Ilimitados** |
| **Sucursales** | 1 | 1 | Hasta 3 | **Ilimitadas** |
| **Pagos (Mercado Pago)** | ❌ | ✅ | ✅ | ✅ |
| **Reseñas (Google)** | ❌ | ✅ (Email) | ✅ (Email) | ✅ (Email) |
| **WhatsApp (Templates)** | ❌ | ❌ | Standard | **Custom + Standard** |
| **WhatsApp (Remitente)** | ❌ | ❌ | Axenda | **Propio o Axenda** |
| **WhatsApp (Mensajes)** | ❌ | ❌ (Solo Email) | Hasta 300/mes | **Hasta 1.000/mes*** |
| **Reportes** | ❌ | ✅ | ✅ | ✅ |
| **Personalización** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Link Propio (Slug)** | ✅ | ✅ | ✅ | ✅ |

> **(*) Política de Uso Justo en WhatsApp:** El límite de mensajes está diseñado para cubrir la operativa normal de recordatorios y confirmaciones. El uso de campañas de marketing masivas o el exceso sistemático del límite incluido podría incurrir en cargos adicionales por mensaje o requerir la contratación de un paquete de expansión de mensajes.

---

## 👥 3. Definición de Roles (Usuarios)

- **Dueño (Admin):** Control total de la plataforma, facturación y configuración.
- **Recepcionista (Plan Oro+):** Gestión de agenda para todos los profesionales, registro de clientes. Sin acceso a facturación.
- **Staff/Profesional (Plan Diamante):** Acceso individual para ver su propia agenda y gestionar sus turnos asignados.

---

## 🔒 4. Seguridad y Facturación Automática

Para garantizar la seguridad de los clientes y la recurrencia del negocio, el sistema utiliza **Tokenización**:

1.  **PCI Compliance:** No almacenamos números de tarjeta de crédito en nuestra base de datos.
2.  **Tokenización:** Los datos sensibles viajan directamente a la pasarela (Mercado Pago), que nos devuelve un Token.
3.  **Recurrencia:** El backend utiliza estos tokens para procesar cobros automáticos cada mes/año sin intervención del usuario.
4.  **Webhooks:** El sistema escucha eventos de la pasarela para activar/desactivar el servicio automáticamente.

---

## 📊 5. Diseño de Base de Datos (Prisma)

### A. Catálogo de Planes
```prisma
model SubscriptionPlan {
  id                String   @id @default(uuid())
  name              String   // BRONCE, ORO, PLATINO, DIAMANTE
  priceMonthly      Decimal  @db.Decimal(10, 2)
  priceYearly       Decimal  @db.Decimal(10, 2)
  currency          String   @default("ARS")

  // Límites técnicos
  maxProfessionals  Int      @default(1)
  maxBranches       Int      @default(1)
  maxAppointments   Int      @default(25) // Solo para Bronce
  maxUsers          Int      @default(1)
  maxWhatsapp       Int      @default(0)
  hasReports        Boolean  @default(false)
  hasOnlinePayments Boolean  @default(false)
  hasAutoReviews    Boolean  @default(false)

  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
}
```

### B. Suscripción de Cliente
```prisma
model TenantSubscription {
  id                String   @id @default(uuid())
  tenantId          String   @unique
  planId            String
  status            String   @default("ACTIVE")
  startDate         DateTime @default(now())
  endDate           DateTime?
  autoRenew         Boolean  @default(true)
  
  externalCustomerId      String?
  externalSubscriptionId  String?
}
```

---

## 🚀 6. Estrategia de Onboarding

1.  **Registro:** Todo nuevo `Tenant` comienza automáticamente en el **Plan Bronce**.
2.  **Upgrade:** En el panel de control se ofrecen los planes superiores para desbloquear límites y funciones (Pagos, WhatsApp, Reseñas).
3.  **Periodo de Gracia:** En caso de fallo de pago, el sistema otorga 3 días de gracia antes de suspender las funcionalidades premium.
