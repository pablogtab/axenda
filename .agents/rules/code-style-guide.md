---
trigger: always_on
---

Puedes ejecutar cualquier comando de lectura que necesites
cualquier comando de npm test por ejemplo

## 📦 Regla de Desarrollo: Componentes Single-File (Inline HTML y CSS)
A partir de ahora, todo el desarrollo de componentes Angular debe centralizarse directamente en el archivo TypeScript (`.ts`).
1. **Plantilla Inline (HTML)**: Utilizar la propiedad `template` en el decorador `@Component` en lugar de `templateUrl`.
2. **Estilos Inline (CSS)**: Utilizar la propiedad `styles` en el decorador `@Component` en lugar de `styleUrls` o `styleUrl`. No crear archivos `.html` ni `.css` externos para nuevos componentes.
3. **Regla del Boy Scout**: Si al trabajar en la base de código encuentras un componente con archivos `.html` o `.css` externos asociados, debes consultar primero con el usuario si hay tiempo disponible para realizar la refactorización antes de proceder a integrar sus contenidos dentro del archivo `.ts` correspondiente (como `template` y `styles` inline) y eliminar los archivos externos obsoletos.