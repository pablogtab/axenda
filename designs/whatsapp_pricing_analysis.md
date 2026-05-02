# Análisis de Costos de WhatsApp para Axenda (2026)

Este análisis estima cuánto gastaría Axenda por cada cliente (negocio) según su volumen de turnos, considerando que cada turno genera idealmente **2 mensajes de utilidad** (Confirmación + Recordatorio).

## 🧮 Escenarios por Plan de Cliente

| Métrica | Cliente Pequeño (Basic) | Cliente Medio (Pro) | Cliente Grande (Enterprise) |
| :--- | :--- | :--- | :--- |
| **Turnos al mes** | 100 | 500 | 2,000 |
| **Mensajes Utilidad/mes** (x2.1*) | 210 | 1,050 | 4,200 |
| **Costo Utilidad** ($0.015/u) | **$3.15** | **$15.75** | **$63.00** |
| **Mensajes Marketing** (Promos) | 20 | 100 | 500 |
| **Costo Marketing** ($0.055/u) | **$1.10** | **$5.50** | **$27.50** |
| **TOTAL GASTO META/MES** | **$4.25** | **$21.25** | **$90.50** |

*\*Factor 2.1 incluye un 10% extra por reprogramaciones o cancelaciones.*

## 💡 Recomendaciones Estratégicas para Axenda

1. **Modelo de "Pay-as-you-go":** Dado que el costo de WhatsApp es variable y puede escalar rápido (especialmente en Marketing), es riesgoso incluir mensajes ilimitados en un plan fijo.
   - *Opción A:* Cobrar una tarifa base que incluya X mensajes y luego un "add-on" por mensaje extra.
   - *Opción B:* El cliente conecta su propio WABA (WhatsApp Business Account) y paga a Meta directamente, Axenda cobra solo por la gestión.

2. **Aprovechar los Mensajes de Servicio:** Incentivar que los clientes inicien la charla. Si el cliente pregunta "¿A qué hora es mi turno?", la respuesta del bot es **gratuita**.

3. **Margen de BSP:** Si usas un proveedor como Twilio o 360dialog, suma un costo fijo mensual (aprox. $5 - $15 USD) o un pequeño markup por mensaje.

4. **Región:** Ten en cuenta que si un cliente de Axenda en Argentina envía un mensaje a un número de Uruguay o España, Meta cobrará la tarifa de ese país (que suele ser más cara).
