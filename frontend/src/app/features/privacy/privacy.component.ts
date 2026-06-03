import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="privacy-shell bg-bg-primary min-h-screen pt-32 pb-24 px-4 overflow-hidden relative">
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
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Política de <span class="text-gradient">Privacidad</span></h1>
          <p class="text-text-muted text-sm">
            Última actualización: {{ lastUpdated }}
          </p>
        </div>

        <!-- Layout Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Sidebar Navigation (Sticky on desktop) -->
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

          <!-- Privacy Content (lg:col-span-8) -->
          <div class="lg:col-span-8 space-y-12">
            <div class="glass p-8 md:p-10 rounded-[2.5rem] border border-border shadow-xl space-y-8 text-text-muted text-sm leading-relaxed">
              
              <p class="text-text-main font-medium text-base">
                En Axenda, valoramos y respetamos su privacidad. Esta Política de Privacidad describe el tipo de información personal que recopilamos, cómo la utilizamos, con quién la compartimos y las medidas de seguridad que implementamos para protegerla.
              </p>

              <hr class="border-border/20">

              <!-- Sección 1 -->
              <section id="recoleccion" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="database" class="text-primary text-base"></app-icon>
                  1. Recolección de Información
                </h2>
                <p>
                  Recopilamos información necesaria para proveer el servicio de gestión de turnos y CRM. Esto incluye:
                </p>
                <ul class="list-disc pl-5 space-y-2">
                  <li><b>Información de Cuenta:</b> Nombre completo, correo electrónico, número de teléfono, nombre de su negocio y contraseña encriptada.</li>
                  <li><b>Información de Clientes de su Negocio:</b> Datos provistos para reservar turnos (nombre, teléfono, correo electrónico, notas de reserva).</li>
                  <li><b>Datos de Uso y Transacciones:</b> Historial de turnos programados, transacciones procesadas (mediante integraciones de pago como Mercado Pago) y volumen de mensajes enviados.</li>
                </ul>
              </section>

              <!-- Sección 2 -->
              <section id="uso" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="visibility" class="text-primary text-base"></app-icon>
                  2. Uso de la Información
                </h2>
                <p>
                  Utilizamos los datos recopilados exclusivamente para fines operativos del servicio:
                </p>
                <ul class="list-disc pl-5 space-y-2">
                  <li>Facilitar la reserva, reprogramación y cancelación de turnos online.</li>
                  <li>Enviar notificaciones y recordatorios automáticos (vía email y WhatsApp) relacionados con las reservas.</li>
                  <li>Procesar cobros y gestionar la facturación de su suscripción a Axenda.</li>
                  <li>Brindar soporte técnico y responder a sus consultas.</li>
                  <li>Analizar métricas de uso agregadas no identificables para mejorar continuamente la plataforma.</li>
                </ul>
              </section>

              <!-- Sección 3 -->
              <section id="compartir" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="share" class="text-primary text-base"></app-icon>
                  3. Compartir con Terceros
                </h2>
                <p>
                  No vendemos ni alquilamos su información personal a terceros. Compartimos datos únicamente con proveedores de servicios necesarios para el funcionamiento de Axenda:
                </p>
                <ul class="list-disc pl-5 space-y-2">
                  <li><b>Mercado Pago:</b> Para procesar de manera segura los pagos de las señas y de su suscripción.</li>
                  <li><b>Meta (WhatsApp Business API):</b> Para procesar y entregar los mensajes y recordatorios automáticos de turnos.</li>
                  <li><b>Proveedores de Infraestructura en la Nube (Google Cloud Storage / Firebase / Hostings):</b> Para el almacenamiento y procesamiento seguro de la base de datos y archivos multimedia.</li>
                </ul>
              </section>

              <!-- Sección 4 -->
              <section id="seguridad" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="lock" class="text-primary text-base"></app-icon>
                  4. Seguridad de los Datos
                </h2>
                <p>
                  Implementamos medidas de seguridad técnicas y organizativas para proteger su información contra pérdida, robo, alteración y acceso no autorizado. Esto incluye el cifrado de datos en tránsito y en reposo (mediante protocolos HTTPS/TLS y cifrado de contraseñas con algoritmos seguros). Sin embargo, ningún sistema en internet es 100% seguro; nos comprometemos a actuar rápidamente ante cualquier vulnerabilidad reportada.
                </p>
              </section>

              <!-- Sección 5 -->
              <section id="derechos" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="person" class="text-primary text-base"></app-icon>
                  5. Sus Derechos
                </h2>
                <p>
                  Como usuario, usted tiene derecho a acceder, rectificar, limitar o solicitar la eliminación total de sus datos personales y de los datos de sus clientes. Puede gestionar la mayoría de esta información directamente desde su panel de administración, o contactando a nuestro equipo de soporte.
                </p>
              </section>

              <!-- Sección 6 -->
              <section id="cookies" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="cookie" class="text-primary text-base"></app-icon>
                  6. Política de Cookies
                </h2>
                <p>
                  Utilizamos cookies esenciales y tecnologías similares para mantener las sesiones de usuario iniciadas, recordar preferencias visuales (como el modo oscuro o claro) y recopilar estadísticas de visitas anónimas. Puede deshabilitar las cookies en su navegador, aunque esto podría afectar el correcto funcionamiento de algunas secciones de la plataforma.
                </p>
              </section>

              <!-- Sección 7 -->
              <section id="contacto" class="space-y-4 scroll-mt-28">
                <h2 class="text-lg font-bold text-text-main flex items-center gap-2">
                  <app-icon name="mail" class="text-primary text-base"></app-icon>
                  7. Contacto
                </h2>
                <p>
                  Si tiene inquietudes o preguntas acerca de cómo tratamos sus datos personales, puede escribirnos directamente a: <a href="mailto:contacto@axenda.com" class="text-primary hover:underline">contacto@axenda.com</a>.
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .privacy-shell {
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
export class PrivacyComponent {
  lastUpdated = '27 de Mayo de 2026';

  sections = [
    { id: 'recoleccion', title: '1. Recolección de Información' },
    { id: 'uso', title: '2. Uso de la Información' },
    { id: 'compartir', title: '3. Compartir con Terceros' },
    { id: 'seguridad', title: '4. Seguridad de los Datos' },
    { id: 'derechos', title: '5. Sus Derechos' },
    { id: 'cookies', title: '6. Política de Cookies' },
    { id: 'contacto', title: '7. Contacto' }
  ];

  scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
