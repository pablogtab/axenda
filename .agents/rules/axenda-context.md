---
trigger: always_on
---

# Axenda - Project Context

## 📌 Visión General
**Axenda** es una plataforma premium de gestión de turnos y CRM diseñada para negocios que buscan una experiencia de usuario excepcional y una estética moderna. El enfoque principal es la productividad, la facilidad de uso desde dispositivos móviles y una interfaz visualmente impactante (Glassmorphism, Modo Oscuro).

## 🛠️ Stack Tecnológico
- **Monorepo**: Gestionado con npm workspaces.
- **Frontend**: 
  - **Framework**: Angular 21+ (Signals, Standalone Components).
  - **Estilos**: Tailwind CSS, animaciones personalizadas.
  - **Diseño**: Glassmorphism, Responsive-first.
- **Backend**: 
  - **Framework**: NestJS.
  - **ORM**: Prisma (con esquema dividido en `backend/prisma/schema/`).
  - **Base de Datos**: PostgreSQL.
- **Infraestructura**:
  - **Contenedores**: Docker & Docker Compose.
  - **CI/CD**: GitHub Actions (despliegue automático a producción).
  - **Registro**: GitHub Container Registry (GHCR).

## 📂 Estructura del Proyecto
- `/frontend`: Aplicación Angular.
  - `/src/app/core`: Servicios globales, guards, interceptores.
  - `/src/app/shared`: Componentes UI reutilizables (botones, modales, etc.).
  - `/src/app/modules`: Módulos de negocio (agenda, auth, admin).
- `/backend`: API NestJS.
  - `/prisma/schema`: Definiciones de modelos (auth, business, etc.).
  - `/src`: Lógica de negocio dividida por módulos (auth, appointments, professionals).
- `docker-compose.yml`: Orquestación local y de producción.

## 🚀 Funcionalidades Clave
1. **Agenda Interactiva**: Drag & drop, múltiples vistas, navegación fluida.
2. **Multi-Tenant**: Soporte para múltiples organizaciones y sucursales.
3. **Registro Multi-Etapa**: Flujo de onboarding seguro con verificación de email y creación de organización.
4. **Google OAuth**: Integración nativa para autenticación social.
5. **Notificaciones**: Sistema de correos asíncrono basado en eventos.

---

# 🔄 Flujo de Trabajo Genérico

### 1. Desarrollo de Funcionalidades
- **Backend**: Crear/Modificar módulos en `backend/src`. Asegurar que los DTOs y tipos estén alineados.
- **Frontend**: Utilizar Angular Signals para el estado y componentes Standalone. Mantener la consistencia visual de Tailwind.

### 2. Cambios en Base de Datos
- Modificar archivos `.prisma` en `backend/prisma/schema/`.
- Ejecutar `npm run prisma:generate` (o equivalente) y crear migraciones con `npx prisma migrate dev --name descripcion_cambio`.

### 3. Pruebas y Calidad
- Ejecutar tests de integración en el backend: `npm run test:e2e` o `npm run test:watch`.
- Mantener los archivos `.spec.ts` actualizados junto a la lógica de negocio.

### 4. Despliegue (CI/CD)
- Los cambios en la rama `master` disparan automáticamente el pipeline de GitHub Actions.
- El pipeline construye las imágenes Docker, las sube a GHCR y despliega en el servidor mediante SSH/Docker Compose.

### 5. Estilo de Código (Reglas Locales)
- Seguir el `code-style-guide.md` del repositorio.
- Uso mandatorio de Prettier y ESLint.
- **Importante**: Al crear UI, priorizar la estética "Wowed" solicitada en las instrucciones de sistema de Antigravity.
