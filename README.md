# Axenda - Plataforma de Gestión de Turnos Premium

Axenda es una solución integral para la gestión de turnos y agendas, diseñada con un enfoque en la experiencia de usuario (UX) y una estética moderna y profesional.

## 🚀 Funcionalidades Principales

### 📅 Agenda Interactiva
- **Vistas Flexibles**: Visualización diaria y semanal con soporte para múltiples profesionales.
- **Drag & Drop**: Reprogramación rápida de turnos simplemente arrastrando las citas.
- **Zonas de Navegación**: Navegación táctil intuitiva entre días y semanas.

### 👤 Gestión de Clientes (CRM)
- **Carga Rápida**: Creación de clientes "on-the-fly" directamente desde el modal de agendamiento.
- **Historial**: Seguimiento detallado de citas y preferencias.

### 🛠️ Configuración de Negocio
- **Multi-Tenant**: Soporte para múltiples negocios con sucursales independientes.
- **Gestión de Equipo**: Perfiles de profesionales con horarios y servicios específicos vinculados.
- **Catálogo de Servicios**: Configuración granular de duración, precios y categorías.

## 🎨 Diseño y UX
- **Estética Premium**: Interfaz moderna basada en "Glassmorphism" con modo oscuro.
- **Optimización Mobile**: Diseñado para ser utilizado cómodamente desde smartphones y tablets.
- **Foco en el Detalle**: Micro-animaciones, validaciones en tiempo real y transiciones suaves.

## 🛠️ Stack Tecnológico
- **Frontend**: Angular 18 (Signals, Standalone Components, CDK).
- **Backend**: NestJS, Prisma ORM, PostgreSQL.
- **Styling**: Tailwind CSS.

## 🛠️ Instalación y Desarrollo

### Requisitos
- Node.js v18+
- Docker (para la base de datos)

### Pasos
1. Clonar el repositorio.
2. Levantar la base de datos: `docker-compose up -d`.
3. Instalar dependencias: `npm install`.
4. Iniciar servicios:
   - Backend: `npm run start:backend`
   - Frontend: `npm run start:frontend`

---
*Desarrollado con ❤️ para maximizar la productividad de tu negocio.*
