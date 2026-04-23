# Roadmap del Proyecto Axenda

Este documento detalla el progreso y lo que falta construir para alcanzar la primera versión en producción (MVP) de la plataforma Axenda, y también ideas para versiones posteriores.

## 🟢 Fase 1: Base de Datos y Autenticación (Completado)
- [x] Configuración de Prisma y PostgreSQL.
- [x] Arquitectura Multi-Tenant robusta.
- [x] Sistema de Autenticación (Registro, Login, Refresh Tokens).
- [x] Roles y Permisos (Guards de NestJS).

## 🟢 Fase 2: Core del Negocio (Completado)
- [x] Gestión de Perfil del Tenant.
- [x] Gestión de Sucursales (Branches).
- [x] Gestión de Usuarios Administrativos (Managers, Receptionists).
- [x] Gestión de Profesionales, con su disponibilidad y excepciones (vacaciones/bloqueos).
- [x] Catálogo de Categorías y Servicios, con vinculación a profesionales.

## 🟡 Fase 3: Motor de Reservas y Clientes (En Progreso)
- [x] **Módulo de Clientes (CRM Básico)**: Gestión de los clientes finales que consumen los servicios, historial de citas, notas y datos de contacto.
- [x] **Módulo de Turnos (Appointments)**: Creación de reservas, vinculando Cliente, Profesional, Servicio, y Sucursal.
- [x] **Motor de Disponibilidad**: Lógica inteligente (endpoints) para calcular "slots" de tiempo libres cruzando la agenda del profesional, la duración de los servicios y las excepciones.
- [x] **Estados y Flujo del Turno**: Cambios de estado (Pendiente, Confirmado, En curso, Completado, Ausente, Cancelado).

## 🔴 Fase 4: Frontend (Panel Administrativo)
- [ ] Setup de proyecto Frontend (Angular)
- [ ] Integración de Auth en UI.
- [ ] Vistas de configuración (Mi Negocio, Sucursales, Equipo, Catálogo).
- [ ] Calendario interactivo (Vista diaria/semanal, arrastrar y soltar turnos).

## 🔴 Fase 5: Canal Público de Reservas (Widget/Link)
- [ ] Flujo público para que el cliente seleccione Servicio -> Profesional -> Horario libre.
- [ ] Formulario de carga de datos de cliente y confirmación de reserva.
- [ ] Generación de enlaces/QR por sucursal o profesional.

## 🔴 Fase 6: Notificaciones e Integraciones (Post-MVP)
- [ ] **Emails Transaccionales**: (Resgrid, SendGrid) confirmaciones de turnos.
- [ ] **WhatsApp/SMS**: Notificaciones y recordatorios automatizados.
- [ ] **Pasarela de Pagos**: Si se exige seña o pago por adelantado (MercadoPago / Stripe).

---

## 📝 Backlog / Ideas Anotadas (Futuro)
- [ ] **Generación Automática de Servicios**: Al registrar un nuevo Tenant (por ej. una barbería), que se creen automáticamente servicios por defecto (Corte, Barba, etc.) para que el usuario no tenga que empezar desde cero.
- [ ] **Turnos Genéricos**: Permitir crear Turnos (Appointments) en el sistema donde no sea estrictamente obligatorio asignar un "Servicio", dando más flexibilidad a recepcionistas para bloqueos de agenda rápidos.
- [ ] **Sobreturnos (Overbooking manual)**: Capacidad para que un administrador o recepcionista pueda forzar un turno en un horario que ya está ocupado, solapando citas intencionalmente.
- [ ] **Bloqueos de Agenda por Horario**: Funcionalidad para que un profesional o administrador pueda bloquear franjas horarias específicas de forma rápida directamente desde la vista de agenda (excepciones puntuales de disponibilidad).
