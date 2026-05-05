---
trigger: model_decision
description: cuando trabajas en el frontend
---

# Axenda - Guía de Estilo y UI (Agent Rules)

Esta guía define las reglas innegociables para mantener la estética Premium y la coherencia técnica del sistema de diseño de Axenda.

## 🎨 Sistema de Colores y Tokens
- **Centralización**: Todos los colores deben definirse como variables CSS en `src/styles.css`.
- **Modo Oscuro**: El color de fondo principal para el modo oscuro es `#0a0b14` (Deep Night). No usar negros puros si no es necesario.
- **Tailwind v4**: Utilizar la directiva `@theme` en `styles.css` para mapear las variables CSS y permitir su uso mediante clases de Tailwind (ej: `bg-toggle-bg`).
- **Contraste**: Siempre verificar la visibilidad en modo claro sobre fondos blancos. Usar bordes sutiles (`border-black/5` o `border-white/10`) para separar elementos que comparten color de fondo.

## 💎 Iconografía (Material Symbols Rounded)
- **Variante**: Usar exclusivamente `material-symbols-rounded` para un aspecto suave y moderno.
- **Configuración Variable**: Siempre definir los ajustes mediante `style="font-variation-settings: ..."`.
  - **FILL**: Generalmente en `1` para iconos con cuerpo y presencia.
  - **wght**: Usar `500` para un peso equilibrado (ni muy fino ni muy grueso).
  - **opsz**: Ajustar el tamaño óptico según el `font-size`. Para iconos pequeños (12px), usar `opsz 16` o `12`.
- **Tamaño**: Preferir el uso de tamaños exactos con Tailwind (ej: `text-[12px]` o `text-[18px]`) para un control total sobre el diseño.

## ✨ Estética "Premium" (Glassmorphism)
- **Superficies**: Usar la clase `glass` para contenedores que requieran profundidad.
- **Efectos de Brillo**: Implementar efectos de "Glow" sutiles mediante sombras externas de color (ej: `shadow-primary/20`) y opacidades variables.
- **Bordes**: Los bordes deben ser extremadamente finos y con opacidad reducida (`border-border/20` o `border-border/50`).

## 🏃 Animaciones y Feedback
- **Transiciones**: Usar siempre `transition-all duration-500` para cambios de estado globales (como el toggle de tema).
- **Physics**: Para movimientos de componentes UI (knobs, sliders), usar la curva de Bézier premium: `ease-[cubic-bezier(0.34,1.56,0.64,1)]`.
- **Feedback Táctil**: Todo elemento interactivo debe tener un estado activo que reduzca ligeramente su escala (`active:scale-95` o `group-active:scale-90`).
- **Rotaciones**: Los iconos que cambian de estado (sol/luna) deben rotar 360 grados (`rotate-[360deg]`).

## 🧱 Arquitectura de Componentes
- **Standalone**: Todos los componentes UI nuevos deben ser `standalone: true`.
- **Reutilización**: Si un elemento visual se usa en más de un lugar (ej: Landing y Dashboard), DEBE ser un componente en `src/app/shared/components/`.
- **Inputs de Configuración**: Los componentes deben ser flexibles mediante `@Input` (ej: `showLabels`) para adaptarse a diferentes contextos sin duplicar código.
