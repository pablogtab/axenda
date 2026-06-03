import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="terms-shell bg-bg-primary min-h-screen pt-32 pb-24 px-4 overflow-hidden relative">
      <!-- Glows -->
      <div class="glow-bg top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10"></div>
      <div class="glow-bg bottom-[0%] right-[-10%] w-[40%] h-[40%] bg-accent/5"></div>

      <div class="max-w-5xl mx-auto relative z-10">
        <!-- Back Button / Header Link -->
        <div class="mb-8">
          <a routerLink="/" class="inline-flex items-center gap-2 text-text-muted hover:text-primary transition-all text-sm font-semibold">
            <app-icon name="arrow_back" class="text-xs"></app-icon>
            Volver al inicio
          </a>
        </div>

        <!-- Header -->
        <div class="text-left mb-16">
          <div class="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-6">
            Información Legal
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Términos y <span class="text-gradient">Condiciones de Servicio</span></h1>
          <p class="text-text-muted text-sm">
            Última actualización: {{ lastUpdated }}
          </p>
        </div>

        <!-- Layout Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Sidebar Navigation (Sticky on desktop, hidden or inline on mobile) -->
          <div class="lg:col-span-4 sticky top-28 hidden lg:block">
            <div class="glass p-6 rounded-3xl border border-border/50 space-y-4">
              <h3 class="text-xs font-black text-text-dim uppercase tracking-wider mb-2">Contenido</h3>
              <nav class="flex flex-col gap-2">
                <button *ngFor="let section of sections" 
                        (click)="scrollToSection(section.id)"
                        class="text-left text-xs font-semibold text-text-muted hover:text-primary transition-all py-1.5 px-3 rounded-lg hover:bg-surface-subtle/50 cursor-pointer">
                  {{ section.title }}
                </button>
              </nav>
            </div>
          </div>

          <!-- Terms Content (lg:col-span-8) -->
          <div class="lg:col-span-8 space-y-12">
            <div class="glass p-8 md:p-10 rounded-[2.5rem] border border-border shadow-xl space-y-8 text-text-muted text-sm leading-relaxed">
              
              <p class="text-text-main font-medium text-base">
                Bienvenido a Axenda. Al acceder o utilizar nuestra plataforma de gestión de turnos, CRM y servicios asociados, usted acepta estar sujeto a los siguientes términos y condiciones de servicio. Por favor, léalos detenidamente.
              </p>

              <hr class="border-border/20">

              <!-- Sección 1 -->
              <section id="aceptacion" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="gavel" class="text-primary text-base"></app-icon>
                  1. Aceptación de los Términos
                </h2>
                <p>
                  Al registrarse, iniciar sesión o utilizar los servicios provistos por Axenda (en adelante, "el Servicio", "la Plataforma" o "Nosotros"), usted ("el Usuario" o "el Cliente") acepta en su totalidad estos Términos y Condiciones. Si no está de acuerdo con alguna de las disposiciones aquí descritas, deberá abstenerse de utilizar el servicio de inmediato.
                </p>
              </section>

              <!-- Sección 2 -->
              <section id="servicio" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="cloud" class="text-primary text-base"></app-icon>
                  2. Descripción del Servicio
                </h2>
                <p>
                  Axenda es una solución de software como servicio (SaaS) multi-tenant diseñada para la gestión de turnos online, administración de clientes (CRM), procesamiento de señas y pagos vinculados a reservas, y envío automatizado de notificaciones (por correo electrónico y WhatsApp Business). 
                </p>
                <p>
                  Nos reservamos el derecho de modificar, actualizar, suspender o discontinuar características de la plataforma en cualquier momento con el propósito de realizar mejoras técnicas o funcionales, sin que ello genere responsabilidad alguna hacia el usuario.
                </p>
              </section>

              <!-- Sección 3 -->
              <section id="cuentas" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="shield" class="text-primary text-base"></app-icon>
                  3. Registro y Seguridad de las Cuentas
                </h2>
                <p>
                  Para utilizar la totalidad de las funciones de Axenda, deberá completar el proceso de registro proporcionando información verídica, exacta y actualizada. 
                </p>
                <ul class="list-disc pl-5 space-y-2">
                  <li>El usuario es el único responsable de mantener la seguridad y confidencialidad de su contraseña y de las credenciales de su cuenta.</li>
                  <li>Cualquier actividad realizada bajo su cuenta será considerada de su exclusiva responsabilidad.</li>
                  <li>Deberá notificarnos de manera inmediata sobre cualquier uso no autorizado de su cuenta o brecha de seguridad detectada.</li>
                </ul>
              </section>

              <!-- Sección 4 -->
              <section id="pagos" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="payments" class="text-primary text-base"></app-icon>
                  4. Planes, Facturación y Reembolsos
                </h2>
                <p>
                  Axenda ofrece diferentes planes de suscripción (Starter, Pro, Business, Elite) cuyos precios y límites operativos (como cantidad de profesionales, sucursales y mensajes mensuales) están detallados en nuestra sección de Precios.
                </p>
                <ul class="list-disc pl-5 space-y-2">
                  <li><b>Suscripciones:</b> Los cargos se facturan por adelantado en ciclos mensuales o anuales mediante plataformas de pago integradas (Mercado Pago).</li>
                  <li><b>Plan Starter (Gratuito):</b> Este plan es limitado y gratuito, diseñado para propósitos de prueba o fases iniciales de un negocio. No incluye mensajes de WhatsApp ni la capacidad de comprar packs extras de mensajería.</li>
                  <li><b>Packs de Mensajería:</b> Los planes Pro, Business y Elite pueden adquirir paquetes adicionales de WhatsApp. Estos paquetes de mensajes extras expiran a los 3 meses desde la fecha de compra.</li>
                  <li><b>Cancelaciones y Reembolsos:</b> Puede cancelar su suscripción en cualquier momento desde la configuración de facturación. No se realizarán reembolsos prorrateados por el período mensual/anual en curso ya abonado.</li>
                </ul>
              </section>

              <!-- Sección 5 -->
              <section id="whatsapp" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="chat" class="text-primary text-base"></app-icon>
                  5. Uso de Canales de Mensajería
                </h2>
                <p>
                  Las notificaciones de WhatsApp provistas a través del canal oficial de Axenda utilizan plantillas previamente validadas por Meta.
                </p>
                <ul class="list-disc pl-5 space-y-2">
                  <li>Queda terminantemente prohibido el uso de los canales de comunicación de Axenda para enviar contenido fraudulento, de spam, ofensivo o que viole las políticas comerciales de WhatsApp/Meta.</li>
                  <li>La suspensión de la cuenta de WhatsApp por mal uso o reportes de spam de los destinatarios será responsabilidad exclusiva del Usuario.</li>
                </ul>
              </section>

              <!-- Sección 6 -->
              <section id="responsabilidad" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="warning" class="text-primary text-base"></app-icon>
                  6. Limitación de Responsabilidad
                </h2>
                <p>
                  Axenda provee la plataforma "tal cual" y "según disponibilidad". En la máxima medida permitida por la ley aplicable:
                </p>
                <ul class="list-disc pl-5 space-y-2">
                  <li>No garantizamos que el servicio sea ininterrumpido, libre de errores o completamente seguro.</li>
                  <li>No nos hacemos responsables por pérdidas de ingresos, oportunidades comerciales, datos, fallas en la API de Mercado Pago, o fallas en la entrega de notificaciones de WhatsApp.</li>
                  <li>Es responsabilidad del usuario garantizar el cumplimiento de las regulaciones locales sobre protección de datos y consentimiento de sus clientes para el envío de notificaciones.</li>
                </ul>
              </section>

              <!-- Sección 7 -->
              <section id="modificaciones" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="edit" class="text-primary text-base"></app-icon>
                  7. Modificaciones de los Términos
                </h2>
                <p>
                  Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Si realizamos cambios significativos, se lo notificaremos mediante un aviso en la plataforma o por correo electrónico. La continuación en el uso de Axenda tras dichas modificaciones constituirá la aceptación de los nuevos términos.
                </p>
              </section>

              <!-- Sección 8 -->
              <section id="contacto" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="mail" class="text-primary text-base"></app-icon>
                  8. Contacto
                </h2>
                <p>
                  Si tiene alguna consulta técnica, comercial o legal sobre los presentes Términos y Condiciones, puede ponerse en contacto con nuestro equipo de soporte enviando un correo electrónico a: <a href="mailto:contacto@axenda.com" class="text-primary hover:underline">contacto@axenda.com</a>.
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .terms-shell {
      background-color: var(--color-bg-primary);
      color: var(--color-text-main);
    }
    .glow-bg {
      position: absolute;
      filter: blur(120px);
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
    }
    .glass {
      background: var(--color-glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--color-glass-border);
    }
  `]
})
export class TermsComponent {
  lastUpdated = '27 de Mayo de 2026';

  sections = [
    { id: 'aceptacion', title: '1. Aceptación de los Términos' },
    { id: 'servicio', title: '2. Descripción del Servicio' },
    { id: 'cuentas', title: '3. Registro y Seguridad de las Cuentas' },
    { id: 'pagos', title: '4. Planes, Facturación y Reembolsos' },
    { id: 'whatsapp', title: '5. Uso de Canales de Mensajería' },
    { id: 'responsabilidad', title: '6. Limitación de Responsabilidad' },
    { id: 'modificaciones', title: '7. Modificaciones del Servicio' },
    { id: 'contacto', title: '8. Contacto' }
  ];

  scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
