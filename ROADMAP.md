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

## 🟡 Fase 4: UX de Gestión Interna (Prioridad Actual)
- [x] Setup de proyecto Frontend (Angular).
- [x] Integración de Auth en UI.
- [x] Calendario interactivo (Vista diaria/semanal, drag & drop).
- [x] **Carga rápida de clientes**: Crear un cliente nuevo directamente desde el buscador del modal de turnos.
- [x] **Estados detallados de reserva**: Implementar flujo *Confirmado, En Espera, Asiste, No asistió*.
- [x] **Bloqueos rápidos con motivo**: Bloquear franjas horarias desde la agenda con una razón (almuerzo, trámite, etc.).

## 🔴 Fase 5: Reglas de Negocio y Lógica Avanzada
- [x] **Políticas de Anticipación**: Configurar límites mínimos y máximos para reservas.
- [ ] **Modalidad Presencial/Virtual**: Definir tipo de servicio y links de reunión automáticos.
- [ ] **Horarios por Servicio**: Restricción de disponibilidad y filtrado en agenda según el servicio seleccionado.
- [ ] **Turnos Genéricos**: Bloqueos de tiempo sin servicio específico.
- [ ] **Reservas Recurrentes**: Soporte para citas que se repiten en el tiempo.

## 🔴 Fase 6: Canal Público y Link de Reserva
- [x] **Link Público Personalizable**: Flujo de reserva para clientes finales (*Servicio → Prof → Hora*).
- [x] **Diseño y Temas**: Personalización de colores y logo en la vista pública.
- [x] **Generación de QR**: Generar códigos para acceso rápido al agendamiento.
- [ ] **Google Login**: Autenticación social para clientes.

## 🔴 Fase 7: Pagos y Notificaciones (Post-MVP)
- [ ] **Integración MercadoPago**: Cobro de señas o total del turno.
- [ ] **Estados de Pago**: Tracking de *Pendiente, Señado, Pagado*.
- [ ] **WhatsApp Recordatorios**: Mensajes automáticos previos a la cita.
- [ ] **Bot de WhatsApp**: Reservas automáticas vía chat.

## 🔴 Fase 8: Valor Agregado y Cierre
- [ ] **Google Reviews**: Integración para solicitar reseñas post-cita.
- [ ] **Guía de Configuración**: Onboarding guiado para nuevos negocios.
- [ ] **Tutoriales y Cursos**: Centro de ayuda integrado.
- [ ] **Generación Automática de Servicios**: Templates por rubro al registrarse.

- [ ] **Impresión de Agenda**: Vista optimizada para imprimir el día de trabajo.
- [ ] **Pantalla de Sala de Espera**: Mostrar la agenda en un monitor para que los clientes vean el estado de los turnos.
