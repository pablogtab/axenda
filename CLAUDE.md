# CLAUDE.md

Contexto del proyecto. Este archivo se carga automáticamente al iniciar sesión con Claude Code; mantenelo actualizado cuando cambien decisiones importantes.

---

## Proyecto

**Axenda** es una plataforma SaaS premium para la gestión de turnos, agendas y CRM de clientes (CRM Básico). Está diseñada bajo una arquitectura **multi-tenant** robusta, permitiendo aislar de manera lógica cada negocio y sus respectivas sucursales (branches). 

El sistema se adapta a múltiples rubros de servicios (barberías, peluquerías, salones de belleza, consultorios médicos, kinesiología, estudios jurídicos, educación, servicios técnicos, etc.). El rubro inicial y caso de prueba configurado en las semillas es una **barbería (Barbería Axenda)**.

El MVP cubre: perfil del tenant editable, sucursales independientes, catálogo de categorías y servicios vinculados a profesionales, agenda interactiva (vistas diaria/semanal con drag & drop y bloqueos rápidos, y vista de lista interactiva con filtros y agrupamiento dinámico), CRM con creación de clientes "on-the-fly" desde la agenda, motor de disponibilidad inteligente (que cruza horarios, excepciones, feriados y solapamientos), checkout de suscripción integrado con MercadoPago (planes Starter, Pro, Business y Elite), y notificaciones automatizadas por WhatsApp (Meta Cloud API).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 18 standalone (signals, functional guards/interceptors, CDK para Drag & Drop) |
| Styling | Tailwind CSS v4 (variables y utilidades personalizadas en `styles.css`) |
| Backend | NestJS 11 |
| ORM | Prisma ORM (con preview feature `prismaSchemaFolder`) |
| DB | PostgreSQL 16 |
| Caché / Colas | Redis 7 (utilizado en background por NestJS) |
| Infra local | Docker Compose (PostgreSQL + Redis + backend + frontend) |

## Filosofía de arquitectura

**Pragmática, escalable y multi-tenant.** Siguiendo principios de desarrollo directo sin patrones por anticipación innecesarios (NO microservicios, NO CQRS, NO NgRx en frontend).

**Multi-Tenant a nivel lógico (Shared Database):**
Prácticamente todas las entidades clave poseen un campo `tenantId` que vincula los registros a un negocio específico. Al realizar consultas desde el backend, la validación del `tenantId` obtenido del token de sesión es obligatoria para garantizar el aislamiento absoluto de los datos.

**Estructura de Schemas Dividida:**
Para evitar un archivo `schema.prisma` inmanejable, se utiliza el preview feature `prismaSchemaFolder`. Los archivos de definición de modelos están organizados en `backend/prisma/schema/` (ej. `tenant.prisma`, `appointment.prisma`, `client.prisma`, etc.) y se compilan automáticamente al generar el cliente de Prisma.

**Motor de Disponibilidad en Tiempo Real:**
La lógica principal del cálculo de turnos libres vive en `AvailabilityEngineService`. Esta analiza el día solicitado (ajustado a la zona horaria de Argentina `America/Argentina/Buenos_Aires` UTC-3 con un offset de -180 minutos en la lógica local), cruza las horas de disponibilidad del profesional en la sucursal, deduce las reservas ocupadas (excluyendo estados `CANCELLED` y `NO_SHOW`), aplica las excepciones horarias o feriados del profesional (`AvailabilityException`) y calcula slots disponibles en intervalos de 15 minutos (step), verificando además la tolerancia de solapamiento (`publicMaxOverlapMins`) y la anticipación mínima requerida para agendar (`publicMinBookingTime`).

**Límites por Suscripción:**
El backend realiza validaciones activas en `SubscriptionsService.validateLimit` antes de registrar nuevos profesionales, sucursales, usuarios, citas o enviar mensajes de WhatsApp, verificando si el plan actual del Tenant (Starter, Pro, Business, Elite) permite dicha acción.

## Estado del MVP

Las fases del roadmap se detallan a continuación (`ROADMAP.md`):

- **Fase 1 — Base de Datos y Autenticación** [Completado]: Configuración de Prisma y PostgreSQL, arquitectura multi-tenant y sistema de login/registro con JWT + Refresh Tokens y guards de NestJS.
- **Fase 2 — Core del Negocio** [Completado]: ABM de Tenants, Sucursales (branches), Usuarios Administrativos (Managers, Receptionists), Profesionales con disponibilidad y excepciones (vacaciones/bloqueos), y Catálogo de Servicios vinculados a profesionales.
- **Fase 3 — Motor de Reservas y Clientes** [Completado]: CRM básico de clientes, módulo de turnos (Appointments), motor de disponibilidad en tiempo real y estados del turno (Pendiente, Confirmado, En curso, Completado, Ausente, Cancelado).
- **Fase 4 — UX de Gestión Interna** [Completado]: Integración de Auth en el frontend, agenda interactiva (diaria/semanal, drag & drop, y vista de lista funcional), carga rápida de clientes desde el modal de citas, estados detallados de reserva (*Confirmado, En Espera, Asiste, No asistió*), bloqueos rápidos con motivo, y vista de lista con filtros y agrupamiento dinámico.
- **Campos personalizados de clientes** [Completado]: Hasta 4 campos por tenant con tipos TEXT/NUMBER/DATE/SELECT/BOOLEAN, listas propias, filtros booleanos, reordenamiento por drag & drop y valor por defecto configurable por tipo.
- **Fase 5 — Reglas de Negocio y Lógica Avanzada** [En Progreso]: Políticas de anticipación mín/máx [Completado]. Pendiente: modalidad presencial/virtual con links, horarios restringidos por servicio, turnos genéricos y reservas recurrentes.
- **Fase 6 — Canal Público y Link de Reserva** [En Progreso]: Link público por tenant `/p/:publicSlug` [Completado], temas estéticos personalizados (colores, logo, banner) [Completado], generación de código QR [Completado], configuración de visualización pública y precios en servicios [Completado], posibilidad de habilitar/deshabilitar el sitio público [Completado], cancelación y reprogramación online con límite de tiempo configurable (`cancellationLimit`) [Completado], ajustes del sitio público reorganizados en sub-pestañas unificadas [Completado]. Pendiente: Google Login para clientes públicos.
- **Fase 7 — Pagos y Notificaciones (Post-MVP)** [Pendiente]: Integración MercadoPago para señas en turnos públicos, estados de pago (Pendiente, Señado, Pagado), y recordatorios automáticos o bots por WhatsApp.
- **Fase 8 — Valor Agregado y Cierre** [Pendiente]: Integración con Google Reviews, guía de onboarding, tutoriales, templates por rubro, impresión de agenda física, y pantalla para sala de espera.

## Autenticación

**Backend:**
- Tabla `users` (id, email, role, firstName, lastName, active, timestamps). Unicidad compuesta `@@unique([tenantId, email])`.
- JWT firmado con `JWT_SECRET` (expira en `JWT_EXPIRES_IN`, por defecto `15m`).
- Refresh Tokens almacenados en la tabla `refresh_tokens` para mantener la sesión abierta de manera segura.
- `UserIdentity` guarda el método de autenticación (`EMAIL` con passwordHash, o `GOOGLE`).
- Roles de usuario (`UserRole`): `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `RECEPTIONIST`, `PROFESSIONAL`.
- El guard `JwtAuthGuard` protege los controladores; se puede restringir por rol usando `@Roles(UserRole.ADMIN, ...)` en conjunto con `RolesGuard`.
- `@CurrentUser()` inyecta el `AuthenticatedUser` tipado con los datos de sesión decodificados (incluyendo `tenantId`).

**Frontend:**
- `AuthService` (`core/services/auth.service.ts`) expone un signal `currentUser` para la reactividad de sesión. Guarda los tokens en `localStorage` (claves de acceso y refresh).
- Interceptor funcional `authInterceptor` inyecta la cabecera `Authorization: Bearer <token>` en cada petición saliente y gestiona la redirección/logout automático en respuestas 401.
- `authGuard` (`core/guards/auth.guard.ts`) protege la ruta `/dashboard`. Las rutas públicas (landing, precios, portal de reserva `/p/:publicSlug`) quedan desprotegidas.

## Motor de Disponibilidad (Detalles técnicos)

El módulo de turnos utiliza `AvailabilityEngineService` en el backend para buscar horarios libres:

- **Day of Week:** En Prisma/Postgres, el Domingo se almacena como `7` en la tabla `availability`.
- **Zonas horarias:** La base de datos guarda las fechas en UTC, pero la lógica de cálculo está adaptada a la hora de Argentina (`America/Argentina/Buenos_Aires`). Se aplica un offset de `-180` minutos en los cálculos de minutos diarios.
- **Conflictos horarias:** Un horario está en conflicto si se solapa con otro turno existente (que no sea `CANCELLED` o `NO_SHOW`) o con un bloqueo manual (`AvailabilityException` de tipo `BLOCK`).
- **Anticipación mínima:** El parámetro `publicMinBookingTime` (ej. `'1h'`, `'30m'`) define cuánto tiempo en el futuro debe estar el turno desde la hora actual.
- **Solapamiento permitido:** `publicMaxOverlapMins` permite tolerar cierta superposición horaria (ej. para sobreturnos controlados).

## Servicios y Profesionales (Configuración y Auto-asignación)

### Configuración de Vista Pública en Servicios
Los administradores pueden configurar cómo se comportan y visualizan los servicios en el portal público de reservas:
- `isBookablePublic` (Boolean, por defecto `true`): Si es `false`, el servicio se filtra y no se muestra en el portal público.
- `showPrice` (Boolean, por defecto `true`): Si es `false`, oculta el precio en las tarjetas y en el total del resumen de reserva.
- `customPriceLabel` (String, opcional): Si `showPrice` es `false`, este texto se muestra como referencia de precio (ej: *"A convenir"*, *"Consultar"*). Si se deja vacío, no se muestra ninguna referencia.
- `showDuration` (Boolean, por defecto `true`): Si es `false`, oculta la duración en minutos del servicio en el portal público.

### Auto-asignación de Servicios a Profesionales (`allServices`)
Los profesionales se pueden configurar para que realicen automáticamente todos los servicios de la organización:
- `allServices` (Boolean, por defecto `false`): Si es `true`, el backend asocia automáticamente al profesional con todos los servicios del tenant.
- **Sincronización en Tiempo Real:** Para mantener la integridad relacional de Prisma y el motor de disponibilidad, el backend sincroniza la tabla pivot `ProfessionalService`:
  - Al crear o actualizar un profesional con `allServices: true`, se asocian todos los servicios activos del tenant.
  - En `setServices()` (actualización manual de servicios), si el profesional tiene `allServices: true`, se ignora el payload y se fuerzan todos los servicios activos del tenant.
  - Al crear o reactivar un servicio, el backend asocia automáticamente este nuevo servicio a todos los profesionales activos del inquilino que tengan `allServices: true`.
  - El primer profesional creado durante el flujo de onboarding se inicializa con `allServices: true` por defecto.

### Configuración del Sitio Público de Reservas
Los administradores gestionan el sitio público desde el panel de control en **"Configuración > Sitio Público"**, que agrupa en sub-pestañas: *Información General*, *Apariencia y Colores*, y *Reglas de Reserva*:
- `publicActive` (Boolean, por defecto `true`): Si está en `false`, las consultas públicas al portal (ej: al cargar el slug en `findByPublicSlug` o al buscar un turno por token en `findOneByToken`) lanzarán `NotFoundException`, deshabilitando por completo el portal y las páginas de cancelación/reprogramación. Al desactivarlo desde el dashboard, se muestra una modal de confirmación para prevenir desactivaciones accidentales.
- `cancellationLimit` (String, por defecto `'24h'`): Ventana de tiempo mínima antes del turno en la que el cliente puede **cancelar o reprogramar** desde el portal público. Formatos aceptados: `Xh` (horas) o `Xm` (minutos). Si es `'never'`, ninguna acción online está permitida. La validación se aplica en el backend en los métodos `cancelByToken` y `rescheduleByToken` de `AppointmentsService`, y en el frontend muestra un banner de advertencia con los datos de contacto del negocio, ocultando los botones de acción.
- `allowReschedule` (Boolean, por defecto `true`): Si está en `false`, el botón de reprogramar no se muestra en el portal público aunque `cancellationLimit` lo permita.

## Notificaciones & Integraciones

### WhatsApp (Meta Cloud API)
- Ubicación: `backend/src/whatsapp/`.
- Configuración por Tenant (`TenantWhatsappConfig`): Guarda el `wabaId`, `phoneId` y `accessToken` de la cuenta de Meta del negocio. Si el negocio no está verificado, hace fallback automático a las credenciales globales del sistema (`WPP_DEFAULT_PHONE_ID` y `WPP_DEFAULT_ACCESS_TOKEN`). Si no existe registro de configuración, el backend lo auto-crea con valores por defecto e inicializa `lastResetDate` al momento de la consulta.
- Resolución de Plantillas (`resolveTemplate`): Si el negocio tiene su propia cuenta verificada, busca plantillas con estado `'APPROVED'` que tengan el flag `replaces` apuntando a la plantilla global. De lo contrario, utiliza las globales. En modo simulación (`WPP_REAL_SEND=false`), las plantillas se fuerzan localmente a `'APPROVED'`. Se selecciona la versión con o sin botón de cancelación (`allowReschedule` toggle de la tabla `tenants`) dinámicamente.
- Reinicios y Límites: El backend verifica de forma diferida (on-access) en cada validación de límites o consulta si ya pasó 1 mes desde `lastResetDate`, en cuyo caso reinicia `messagesSentMonth` a `0` y actualiza `lastResetDate`. Si se alcanza el límite mensual del plan, la validación en `validateLimit` permite continuar enviando mensajes si el tenant cuenta con saldo de mensajes extras activos (`TenantWhatsappPack`). En tal caso, el envío exitoso de mensajes descuenta del paquete que venza más pronto (FIFO) en `WhatsappService`.
- Historial de Logs: Al despachar notificaciones, se reemplazan los placeholders (ej: `{{clientName}}`) con las variables reales y el texto final compilado se almacena en el campo `body` de `whatsapp_message_logs`.
- Cancelación: Se despacha la plantilla de cancelación (`axenda_booking_cancellation_v2`) si el tenant tiene habilitado `whatsappCancellation` (por defecto `true`). Al realizar cancelaciones desde el panel de administración, el administrador cuenta con la opción de activar o desactivar este envío bajo demanda mediante un checkbox en el formulario de la cita.
- Sincronización y Carga de Plantillas: Al iniciar la aplicación, `WhatsappTemplateService.loadTemplatesFromFS()` carga las plantillas de la carpeta local en la base de datos reemplazando el dominio `https://axenda.ar` por el `FRONTEND_URL` definido en el `.env`. Si el entorno es de pruebas (`NODE_ENV=test`), el servicio omite cualquier llamada o sincronización con la API de Meta.
- Nombres de Plantilla (sufijo `_v2`): Se utiliza el sufijo `_v2` en las plantillas globales (como `axenda_booking_confirmation_v2` y `axenda_booking_reminder_v2`) para sortear el bloqueo por eliminación asíncrona de idioma de Meta cuando se recrean plantillas.
- Normalización: Todos los números de destino pasan por `PhoneUtils.normalize` para asegurar el formato internacional requerido por Meta.

### MercadoPago
- Ubicación: `backend/src/mercadopago/` y lógica de cobros en `backend/src/subscriptions/`.
- Sincronización de planes: En el arranque (`onModuleInit`), `SubscriptionsService` sincroniza los planes de la DB local (`STARTER`, `PRO`, `BUSINESS`, `ELITE`) con la API de MercadoPago, creando las suscripciones correspondientes y guardando los IDs externos (`externalPlanIdMonthly`, `externalPlanIdYearly`). El plan `STARTER` no se sincroniza al ser gratuito.
- Checkout manual: Se genera una preferencia de Mercado Pago con la referencia externa (`externalReference`) estructurada como `tenantId:planCode:billingCycle:quantity`.
- Compra de Paquetes de WhatsApp: Permite a los tenants comprar paquetes de mensajes extras consumibles (Packs de 100, 500 o 1000 mensajes con precios de $6k, $25k y $40k ARS) vía MercadoPago.
  - Vencimiento y consumo: Los paquetes de WhatsApp expiran exactamente a los 3 meses de la compra. Una vez agotado el límite de su plan mensual, los mensajes se descuentan en orden FIFO de los paquetes activos.
  - Referencia externa: La preferencia de pago se genera con `externalReference` estructurada como `tenantId:packCode:ONETIME:1` (donde packCode es `WPP_PACK_100`, `WPP_PACK_500` o `WPP_PACK_1000`).
- Webhooks / Retornos: Al recibir un pago aprobado, `handleMercadoPagoPayment` procesa la referencia externa:
  - Para planes: extiende la fecha de finalización (`endDate`) de la suscripción del tenant en la DB y registra la factura (`SubscriptionInvoice`) detallando el plan.
  - Para paquetes de WhatsApp: crea un registro en `TenantWhatsappPack` con su fecha de vencimiento (`now() + 3 meses`) y cantidad restante (`remaining`), e inserta la factura (`SubscriptionInvoice`) con la descripción correspondiente (ej. `Pack 500 Mensajes WhatsApp`).

## Estructura del repo

```
axenda/
├── backend/                            # NestJS API
│   ├── prisma/
│   │   ├── schema/                     # Schemas divididos (Prisma Schema Folder)
│   │   │   ├── appointment.prisma
│   │   │   ├── auth.prisma
│   │   │   ├── availability.prisma
│   │   │   ├── client.prisma
│   │   │   ├── professional.prisma
│   │   │   ├── schema.prisma           # Configuración principal, datasources y enums
│   │   │   ├── service.prisma
│   │   │   ├── subscription.prisma
│   │   │   ├── tenant.prisma
│   │   │   ├── user.prisma
│   │   │   └── whatsapp.prisma
│   │   └── seed.ts                     # Semillas de planes y negocio de prueba
│   └── src/
│       ├── app/                        # app.module.ts, app.controller.ts
│       ├── appointments/               # Turnos, motor de disponibilidad y logs
│       ├── auth/                       # JWT, estrategias, refresh tokens, turnstile
│       ├── clients/                    # CRM Clientes y etiquetas (tags)
│       ├── common/                     # Decoradores, guards, interceptores, utilidades (PhoneUtils)
│       ├── config/                     # Validaciones de variables de entorno
│       ├── mail/                       # Envío de correos (Nodemailer/Handlebars)
│       ├── mercadopago/                # Wrapper API de MercadoPago
│       ├── professionals/              # ABM de profesionales y sucursales
│       ├── services/                   # ABM de servicios y categorías
│       ├── subscriptions/              # Gestión de planes, checkout MP y límites
│       ├── tenants/                    # Configuración de inquilinos y sucursales (branches)
│       ├── users/                      # ABM de usuarios internos
│       └── whatsapp/                   # Envío de mensajes de WhatsApp y plantillas
│
├── frontend/                           # Angular standalone app
│   └── src/
│       ├── index.html
│       ├── main.ts
│       ├── styles.css                  # Tailwind CSS v4, variables de tema y utilidades (@utility)
│       └── app/
│           ├── app.config.ts
│           ├── app.routes.ts           # Enrutador principal
│           ├── core/                   # Interceptores, guards, servicios principales (Auth, Clients, etc.)
│           ├── shared/                 # Componentes reusables (icon, dialogs, etc.)
│           └── features/
│               ├── auth/               # Pantallas de login, registro, recuperación
│               ├── landing/            # Página principal de Axenda
│               ├── pricing-comparison/ # Tabla de precios
│               ├── onboarding/         # Flujo de configuración inicial (getting-started)
│               ├── public/             # Portal público de reservas (:publicSlug)
│               └── dashboard/          # Panel de administración interna
│                   ├── home/           # Dashboard principal
│                   ├── agenda/         # Agenda interactiva (Calendario drag & drop y vistas alternativas)
│                   │   └── views/
│                   │       └── agenda-list-view/  # Vista de lista interactiva con filtros, agrupamiento y acciones rápidas
│                   ├── clients/        # CRM de clientes
│                   ├── settings/       # Configuración agrupada por pestañas (profesionales, servicios, etc.)
│                   └── subscription/   # Visualización de plan y pasarela de pago
│
├── docker-compose.yml                  # Postgres + Redis + Backend + Frontend
├── package.json                        # Workspaces de npm y scripts generales
└── CLAUDE.md                           # Este archivo
```

## Modelo de datos

Tablas principales definidas en Prisma:

| Tabla | Rol / Descripción |
|---|---|
| `tenants` | Negocios registrados. Contiene configuraciones estéticas (`primaryColor`, `backgroundColor`, `textColor`, `logoUrl`, `bannerUrl`), parámetros del portal público (`publicSlug`, `publicActive`, `publicMinBookingTime`, `publicMaxBookingDays`, `publicMaxOverlapMins`, `publicShowBranchSelection`, `publicShowProfessionalSelection`), política de cancelaciones (`cancellationLimit`, `allowReschedule`), preferencias de notificaciones (`confirmEmail`, `whatsappReminder`, `whatsappCancellation`) y estado del onboarding. |
| `branches` | Sucursales de un negocio. Vinculadas a un `tenantId`. |
| `users` | Usuarios internos del panel (administradores, recepcionistas, profesionales). |
| `refresh_tokens` | Tokens de actualización vinculados a un usuario para renovar la sesión de JWT. |
| `user_identities` | Credenciales de usuario (contraseña encriptada o enlaces OAuth como Google). |
| `verification_codes` | Códigos de verificación temporales para el registro de cuentas. |
| `clients` | CRM de clientes del negocio. Soporta notas, información de contacto y campos de identificación. |
| `client_field_definitions` | Definiciones de campos personalizados por tenant, con tipo, lista, orden y valor por defecto. |
| `client_field_lists` | Listas personalizadas del negocio para campos SELECT. |
| `client_field_list_options` | Opciones asociadas a cada lista personalizada. |
| `client_field_values` | Valores personalizados guardados por cliente y por campo. |
| `client_tags` | Etiquetas de color asignadas a clientes (ej: "VIP", "Frecuente"). |
| `professionals` | Profesionales que atienden turnos. Almacena biografía, color, foto y flag de auto-asignación de servicios (`allServices`). |
| `professional_branches` | Tabla pivote que vincula profesionales a una o más sucursales (`Branch`). |
| `professional_services` | Tabla pivote que vincula qué servicios puede prestar cada profesional. |
| `services` | Catálogo de servicios. Almacena duración (minutos), precio (`Decimal(10,2)`), color, y flags de vista pública (`isBookablePublic`, `showPrice`, `customPriceLabel`, `showDuration`). |
| `service_categories` | Agrupación lógica de servicios (ej: "Cortes", "Coloración"). |
| `availability` | Horarios regulares de atención de un profesional en un día de la semana y sucursal. |
| `availability_exceptions` | Vacaciones, bloqueos de tiempo o feriados asociados a un profesional. |
| `appointments` | Reservas agendadas. Vincula Cliente, Profesional, Servicio, Sucursal y hora de inicio/fin. |
| `appointment_logs` | Historial de auditoría para registrar quién y cuándo cambió el estado de un turno. |
| `subscription_plans` | Definición global de planes (Starter, Pro, Business, Elite) y sus límites y precios. |
| `tenant_subscriptions` | Suscripción actual del tenant (Trial, Activa, etc.) y su fecha de expiración. |
| `subscription_invoices` | Facturas pagadas o pendientes por la suscripción mensual/anual del tenant. |
| `tenant_payment_configs` | Credenciales de MercadoPago configuradas por el tenant para cobro de señas (post-MVP). |
| `tenant_whatsapp_configs` | Configuración de Meta Cloud API del tenant (token, phoneId, wabaId) o bandera de uso global. |
| `whatsapp_templates` | Registro local de plantillas cargadas y aprobadas en Meta. |
| `whatsapp_message_logs` | Registro de mensajes enviados (incluyendo cuerpo de mensaje compilado), destinos y sus estados ante la API de Meta. |

## Convenciones de código

### Backend (NestJS / Prisma)
- **Endpoints:** Siempre en kebab-case y bajo el prefijo `api` global (`/api/appointments`, `/api/tenants`).
- **DTOs:** Utilizar `class-validator` para validar datos entrantes. Configurar conversiones automáticas en el pipeline global de validación. **Importante:** Asegurarse siempre de revisar que todos los campos enviados por el formulario del frontend (ej: `active` en creación/edición) estén incluidos en los DTOs correspondientes (ej: `CreateServiceDto`, `UpdateServiceDto`). Como el backend usa validación estricta (`whitelist: true` y `forbidNonWhitelisted: true`), cualquier propiedad adicional no declarada en el DTO provocará un error HTTP 400 Bad Request.
- **Transactions:** Para operaciones críticas que requieran atomicidad (ej: guardar un turno y generar su log inicial), encapsular la lógica en `this.prisma.$transaction(async (tx) => { ... })`.
- **Soft Deletes:** Utilizar el campo `active: Boolean` en lugar de borrar físicamente registros que tengan historial o dependencias (ej. `Client`, `Professional`, `Branch`, `Service`).
- **Guards:** Colocar `@UseGuards(JwtAuthGuard)` a nivel controlador. Si algún endpoint es público (como en `PublicAppointmentsController`), se omite el guard. Para permisos, usar `@Roles(...)` + `RolesGuard`.
- **Configuración y Env:** Todas las variables de entorno (`.env`) deben registrarse y validarse centralizadamente en `backend/src/config/app.config.ts` dentro de la clase `EnvironmentVariables`. No se deben leer variables ad-hoc con `process.env` ni realizar conversiones de tipo manuales en los servicios; en su lugar, se inyecta `ConfigService` y se utiliza de manera fuertemente tipada (ej: `this.configService.get<boolean>('VARIABLE')`). Las variables de tipo bandera o booleanas deben validarse obligatoriamente con `@IsBoolean()` y establecerse por defecto en `false` (salvo indicación explícita de lo contrario) para que solo sean verdaderas si se configuran explícitamente como `true`.

### Frontend (Angular / Tailwind CSS)
- **Standalone Components:** Todos los componentes son standalone. No se utilizan módulos de Angular (`NgModule`).
- **Signals:** Usar `signal()`, `computed()`, y `effect()` para el estado local y reactividad de componentes. Evitar el uso de librerías de estado global (como NgRx).
- **Tailwind CSS v4:** Los estilos globales y variables CSS se configuran en `frontend/src/styles.css`. Utilizar las directivas `@utility` para crear clases personalizadas (ej. `@utility glass`, `@utility btn-primary`).
- **Reactive Forms:** Declarar formularios reactivos utilizando la opción `nonNullable` del constructor (`FormBuilder.nonNullable.group(...)`) para asegurar el tipado correcto de los valores.
- **Visuales & Temas:** Respetar el diseño basado en Glassmorphism y la consistencia de colores configurados a través de las variables CSS cargadas dinámicamente según la preferencia del tema oscuro/claro y la marca del tenant.
- **Agenda List View:** La agenda incluye una vista de lista funcional (`agenda-list-view`) que permite visualizar los turnos en un rango de fechas. Permite filtrar por profesional, estado y búsqueda de cliente (nombre, teléfono, email, profesional o servicio). Soporta agrupamientos dinámicos (`groupBy` con `computed` signals) por Profesional, Sucursal (Sede), Día o Estado, mostrando acordeones colapsables con subtotales de cantidad y facturación estimada. Dispone de acciones rápidas para cambiar el estado (dropdown) o cancelar (cancelación en línea). El atajo de teclado 'l' alterna la vista de lista instantáneamente.
- **Campos personalizados de clientes:** El módulo `custom-fields` ya está operativo. Permite administrar definiciones, listas y opciones, usar `defaultValue` al crear clientes nuevos, y persistir valores por cliente desde el formulario dinámico.

## Cómo correr el proyecto

### 1. Levantar Infraestructura Local (Docker)
Levanta la base de datos PostgreSQL y el servidor Redis en segundo plano:
```bash
docker compose up -d postgres redis
```

### 2. Configurar Variables de Entorno
Copiar el archivo `.env.example` del backend como `.env` en la raíz del proyecto y en el directorio `backend/` y completar las variables necesarias (`DATABASE_URL`, `JWT_SECRET`, `WPP_DEFAULT_PHONE_ID`, etc.).

### 3. Ejecutar en Modo Desarrollo (Simultáneo)
Desde la raíz del proyecto, ejecuta el comando que levanta frontend y backend de manera concurrente:
```bash
npm run dev
```
- **API Backend:** http://localhost:3000/api
- **Documentación Swagger:** http://localhost:3000/api/docs
- **Frontend App:** http://localhost:4200

### 4. Comandos de Base de Datos (Prisma)
Dentro de la carpeta `backend/`:
```bash
# Generar el cliente de Prisma (compila los schemas de la carpeta prisma/schema/)
npm run prisma:generate

# Crear y aplicar una nueva migración de base de datos
npm run prisma:migrate --name nombre_de_la_migración

# Abrir Prisma Studio para inspeccionar datos gráficamente
npm run prisma:studio
```

### 5. Sembrado de Datos (Seeds)
Las semillas de la base de datos se ejecutan a través de Prisma. Se pueden pasar banderas opcionales:
```bash
# Sincronizar planes de suscripción y crear la Barbería Axenda de prueba
npx prisma db seed -- --with-samples

# Resetear la base de datos por completo (DANGER) y sembrar únicamente los planes básicos
npx prisma db seed -- --danger-reset-all
```

## Flujo de trabajo con Claude

1. **Validar antes de codear:** Para cualquier funcionalidad de escala media o alta, primero proponer al usuario:
   - Modificaciones de base de datos (nuevos campos o tablas en `backend/prisma/schema/`).
   - Controladores, DTOs y servicios a crear en el backend.
   - Componentes, servicios e integración visual en el frontend.
   Esperar la aprobación del usuario antes de proceder a la edición del código.
2. **Sin sobreingeniería:** Priorizar código simple, legible y mantenible. Evitar la introducción de dependencias adicionales a menos que sea estrictamente necesario.
3. **Multi-tenant siempre:** Al consultar o escribir registros que correspondan a datos de negocio, asegúrate de filtrar o inyectar el `tenantId` correspondiente desde el contexto de sesión (`AuthenticatedUser`).
4. **Respetar el Motor de Disponibilidad:** Cualquier modificación sobre la agenda, reserva de turnos, o bloqueos horarios debe pasar o validarse contra `AvailabilityEngineService` para no generar conflictos en el calendario de los profesionales.
5. **Comprobación de límites:** Antes de añadir entidades críticas en base de datos, llama a `SubscriptionsService.validateLimit` para asegurar el cumplimiento del plan contratado por el tenant.
6. **Migraciones:** Si añades o modificas columnas en los archivos `.prisma`, genera una migración (`npm run prisma:migrate`) y aplícala. Nunca edites migraciones antiguas que ya hayan sido ejecutadas en el historial.

## Para Claude cuando retomes el contexto

- **JWT Auth:** Los endpoints del backend están protegidos por defecto al usar `@UseGuards(JwtAuthGuard)`. Asegúrate de verificar si el endpoint requiere acceso público.
- **Acceso a Tenant:** Para obtener el ID de inquilino actual en el backend, utiliza el decorador `@CurrentUser() user: AuthenticatedUser` y accede a `user.tenantId`.
- **Zonas horarias:** Las citas se guardan en UTC pero se exponen y calculan a nivel local restando el offset de Argentina (`America/Argentina/Buenos_Aires`). Ten en cuenta el desajuste de 180 minutos al realizar depuraciones o comparaciones horarias.
- **Estilos en Angular:** No agregues clases Tailwind ad-hoc si rompen el diseño. Utiliza las variables CSS de tema (`--color-*`) configuradas en `styles.css` para mantener la estética Glassmorphism del sitio.
- **Mensajes de WhatsApp:** Recuerda que la simulación de envío a través de la cuenta global requiere que el número destino esté registrado como destinatario de prueba en la consola de Meta Developers, a menos que el tenant use una cuenta propia verificada.
- **Prisma Schema Folder:** Si creas un nuevo modelo de datos, agrégalo en un archivo `.prisma` dentro de `backend/prisma/schema/` en lugar de tocar el archivo raíz `schema.prisma`. Luego ejecuta `prisma generate` y `prisma migrate dev`.
- **Instalar dependencias:** Si agregas un paquete a `package.json` de frontend o backend, indícale al usuario que debe ejecutar `npm install` en la sección del workspace correspondiente.
