import {
  Component,
  OnInit,
  signal,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon.component';
import { SubscriptionService } from '@core/services/subscription.service';

interface LandingScreen {
  id: string;
  label: string;
  /** Nombre base del asset sin prefijo (ej. `home` → desktop-home.png / mobile-home.png). */
  key: string;
  caption: string;
  audience?: string;
  /** Mockup de celular en mobile y desktop (vista del cliente). */
  phoneMockupAlways?: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="landing-page">
      <!-- Navbar -->
      <header class="landing-nav">
        <div class="landing-nav-inner">
          <a routerLink="/" class="landing-logo">
            <img src="assets/logo.svg" alt="Axenda" class="w-9 h-9" />
            <span class="landing-logo-text">xenda</span>
          </a>

          <nav class="landing-nav-links hidden lg:flex">
            <a href="#funciones">Funciones</a>
            <a href="#pantallas">Pantallas</a>
            <a href="#precios">Precios</a>
            <a href="#como-funciona">Cómo funciona</a>
          </nav>

          <div class="landing-nav-actions">
            <a routerLink="/login" class="landing-link-login">Ingresar</a>
            <a routerLink="/register" class="btn-primary !py-2 !px-4 !text-sm"
              >Registrate gratis</a
            >
          </div>
        </div>
      </header>

      <!-- Hero -->
      <section class="landing-hero">
        <div class="landing-container landing-hero-grid">
          <div class="landing-hero-copy">
            <p class="landing-eyebrow">Autogestión · Sin app · es-AR</p>
            <h1>
              Configurá tu negocio y dejá que tus clientes
              <span class="text-primary">se autogestionen el turno</span>
            </h1>
            <p class="landing-lead">
              Definí servicios, horarios y preferencias una sola vez. Tus
              clientes reservan, reprograman o cancelan solos desde un link —
              y vos gestionás la agenda desde la PC o el celular, sin instalar
              nada.
            </p>
            <ul class="landing-bullets">
              <li>
                <app-icon name="devices" class="text-primary shrink-0" />
                Panel completo en computadora o celular: agenda, clientes y
                configuración
              </li>
              <li>
                <app-icon name="public" class="text-primary shrink-0" />
                Link público para que tus clientes reserven online, las 24 hs
              </li>
              <li>
                <app-icon name="check_circle" class="text-primary shrink-0" />
                Recordatorios por WhatsApp sin perseguir mensajes
              </li>
            </ul>
            <div class="landing-hero-ctas">
              <a routerLink="/register" class="btn-primary !text-base !px-8"
                >Empezar gratis</a
              >
              <a href="#pantallas" class="btn-secondary !text-base !px-8 border border-border"
                >Ver pantallas</a
              >
            </div>
          </div>

          <div class="landing-hero-phones">
            <div class="landing-phones-duo">
              <div class="phone-mockup phone-mockup-primary">
                <div class="phone-mockup-bezel">
                  <div class="phone-mockup-notch" aria-hidden="true"></div>
                  <img
                    [src]="heroImgSrc('home')"
                    (error)="onLandingImgError($event, 'mobile-home')"
                    alt="Panel de inicio de Axenda — vista del negocio"
                    class="phone-mockup-img"
                  />
                </div>
                <span class="phone-mockup-label">Vos — panel del negocio</span>
              </div>

              <div class="phone-mockup phone-mockup-secondary">
                <div class="phone-mockup-bezel">
                  <div class="phone-mockup-notch" aria-hidden="true"></div>
                  <img
                    [src]="heroImgSrc('portal-reserva')"
                    (error)="onLandingImgError($event, 'mobile-portal-reserva')"
                    alt="Portal de reservas de Axenda — vista del cliente"
                    class="phone-mockup-img"
                  />
                </div>
                <span class="phone-mockup-label">Tu cliente — reserva online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Rubros -->
      <section class="landing-rubros">
        <div class="landing-container">
          <h2 class="landing-section-title text-center">
            Hecho para tu tipo de negocio
          </h2>
          <p class="landing-section-sub text-center">
            Un mismo sistema, distintos rubros de servicios.
          </p>
          <div class="landing-chips">
            @for (rubro of rubros; track rubro) {
              <span class="landing-chip">{{ rubro }}</span>
            }
          </div>
        </div>
      </section>

      <!-- Galería mobile -->
      <section id="pantallas" class="landing-screens">
        <div class="landing-container">
          <h2 class="landing-section-title text-center">Así se ve Axenda</h2>
          <p class="landing-section-sub text-center max-w-2xl mx-auto">
            Capturas reales del panel de gestión y del portal donde tus clientes
            reservan solos.
          </p>

          <div class="landing-tabs-scroll">
            <div class="landing-tabs" role="tablist">
              @for (screen of screens; track screen.id) {
                <button
                  type="button"
                  role="tab"
                  class="landing-tab"
                  [class.landing-tab-active]="activeScreenId() === screen.id"
                  [attr.aria-selected]="activeScreenId() === screen.id"
                  (click)="activeScreenId.set(screen.id)"
                >
                  {{ screen.label }}
                </button>
              }
            </div>
          </div>

          <div class="landing-screens-stage">
            @if (activeScreen(); as screen) {
              <!-- Celular (< md): mockup + captura mobile en todos los tabs -->
              <div class="md:hidden">
                <div class="phone-mockup phone-mockup-gallery">
                  <div class="phone-mockup-bezel">
                    <div class="phone-mockup-notch" aria-hidden="true"></div>
                    <img
                      [src]="mobileScreenImgSrc(screen)"
                      (error)="onLandingImgError($event, 'mobile-' + screen.key)"
                      [alt]="screen.caption"
                      class="phone-mockup-img"
                    />
                  </div>
                </div>
              </div>

              <!-- PC (≥ md): showcase + captura desktop (excepto reserva cliente) -->
              @if (!screen.phoneMockupAlways) {
                <div class="hidden md:block w-full">
                  <div class="showcase-frame">
                    <div class="showcase-frame-bar">
                      <span></span><span></span><span></span>
                    </div>
                    <div class="showcase-frame-body">
                      <img
                        [src]="desktopScreenImgSrc(screen)"
                        (error)="onLandingImgError($event, 'desktop-' + screen.key)"
                        [alt]="screen.caption"
                        class="showcase-img"
                      />
                    </div>
                  </div>
                </div>
              }

              <!-- PC (≥ md): reserva cliente siempre en mockup de celular -->
              @if (screen.phoneMockupAlways) {
                <div class="hidden md:flex md:justify-center w-full">
                  <div class="phone-mockup phone-mockup-gallery">
                    <div class="phone-mockup-bezel">
                      <div class="phone-mockup-notch" aria-hidden="true"></div>
                      <img
                        [src]="mobileScreenImgSrc(screen)"
                        (error)="onLandingImgError($event, 'mobile-' + screen.key)"
                        [alt]="screen.caption"
                        class="phone-mockup-img"
                      />
                    </div>
                  </div>
                </div>
              }
              <p class="landing-shot-caption text-center mt-5 max-w-lg mx-auto">
                {{ screen.caption }}
              </p>
              @if (screen.audience) {
                <p class="landing-screen-audience">{{ screen.audience }}</p>
              }
            }
          </div>
        </div>
      </section>

      <!-- Funciones -->
      <section id="funciones" class="landing-features">
        <div class="landing-container">
          <h2 class="landing-section-title text-center">
            Todo lo que necesitás en el día a día
          </h2>
          <p class="landing-section-sub text-center">
            Gestioná tu negocio desde la PC o el celular, sin instalar apps.
          </p>
          <div class="landing-features-grid">
            @for (feature of features; track feature.title) {
              <article class="landing-feature-card">
                <div class="landing-feature-icon">
                  <app-icon [name]="feature.icon" class="text-primary text-2xl" />
                </div>
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.description }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <!-- Cómo funciona -->
      <section id="como-funciona" class="landing-steps">
        <div class="landing-container">
          <h2 class="landing-section-title text-center">Cómo funciona</h2>
          <p class="landing-section-sub text-center">
            Tres pasos para tener el negocio ordenado.
          </p>
          <div class="landing-steps-grid">
            @for (step of steps; track step.number) {
              <article class="landing-step-card">
                <span class="landing-step-num">{{ step.number }}</span>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <!-- Precios -->
      <section id="precios" class="landing-pricing">
        <div class="landing-container">
          <h2 class="landing-section-title text-center">
            Un plan simple para tu negocio
          </h2>
          <p class="landing-section-sub text-center">
            Empezá gratis y escalá cuando lo necesites.
          </p>

          <div class="landing-pricing-grid">
            <article class="landing-price-card">
              <p class="landing-price-label">PARA EMPEZAR</p>
              <h3>Starter</h3>
              <p class="landing-price-amount">Gratis</p>
              <ul>
                <li>25 turnos por mes</li>
                <li>Agenda y portal público</li>
                <li>Sin tarjeta de crédito</li>
              </ul>
              <a routerLink="/register" class="btn-secondary w-full text-center block"
                >Empezar gratis</a
              >
            </article>

            <article class="landing-price-card landing-price-featured">
              <span class="landing-price-badge">Recomendado</span>
              <p class="landing-price-label text-primary">CRECIMIENTO</p>
              <h3>Business</h3>
              <p class="landing-price-amount">
                \${{ businessPriceMonthly() | number: '1.0-0' }}
                <small>/mes</small>
              </p>
              <p class="landing-price-alt">
                \${{ businessPriceYearlyMonthly() | number: '1.0-0' }}/mes pagando
                anual
              </p>
              <ul>
                <li>Hasta 5 profesionales</li>
                <li>Turnos ilimitados</li>
                <li>300 WhatsApps / mes</li>
                <li>Recordatorios y cancelaciones</li>
              </ul>
              <a routerLink="/register" class="btn-primary w-full text-center block"
                >Elegir Business</a
              >
            </article>

            <article class="landing-price-card">
              <p class="landing-price-label">PROFESIONAL</p>
              <h3>Pro</h3>
              <p class="landing-price-amount">
                \${{ proPriceMonthly() | number: '1.0-0' }}
                <small>/mes</small>
              </p>
              <p class="landing-price-alt">
                \${{ proPriceYearlyMonthly() | number: '1.0-0' }}/mes pagando anual
              </p>
              <ul>
                <li>Turnos ilimitados</li>
                <li>100 WhatsApps / mes</li>
                <li>Cobros con Mercado Pago</li>
              </ul>
              <a routerLink="/register" class="btn-secondary w-full text-center block"
                >Elegir Pro</a
              >
            </article>
          </div>

          <div class="landing-pricing-more">
            <a routerLink="/precios" class="landing-pricing-link">
              Ver comparativa completa de planes
              <app-icon name="chevron_right" class="text-text-dim" />
            </a>
          </div>
        </div>
      </section>

      <!-- CTA final -->
      <section class="landing-final-cta">
        <div class="landing-container">
          <div class="landing-final-box">
            <h2>¿Querés verlo en acción?</h2>
            <p>
              Creá tu cuenta gratis en minutos. Funciona en cualquier navegador,
              desde la computadora o el celular.
            </p>
            <div class="landing-hero-ctas justify-center">
              <a routerLink="/register" class="btn-primary !px-10"
                >Crear cuenta gratis</a
              >
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="landing-container landing-footer-inner">
          <div class="landing-footer-brand">
            <a routerLink="/" class="landing-logo">
              <img src="assets/logo.svg" alt="Axenda" class="w-8 h-8" />
              <span class="landing-logo-text text-2xl">xenda</span>
            </a>
            <p>
              Gestión de turnos, agenda y CRM para negocios de servicios en
              Argentina.
            </p>
          </div>
          <div>
            <h4>Producto</h4>
            <ul>
              <li><a href="#funciones">Funciones</a></li>
              <li><a href="#pantallas">Pantallas</a></li>
              <li><a href="#precios">Precios</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a routerLink="/terminos">Términos</a></li>
              <li><a routerLink="/privacidad">Privacidad</a></li>
            </ul>
          </div>
        </div>
        <div class="landing-container landing-footer-copy">
          <p>© {{ currentYear }} Axenda. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  `,
  styles: `
    @reference "../../styles.css";

    .landing-page {
      min-height: 100vh;
      background: #ffffff;
      color: #0f172a;

      /* Siempre modo claro: la landing no depende del tema global. */
      --color-bg-primary: #f1f5f9;
      --color-bg-secondary: #ffffff;
      --color-surface: #ffffff;
      --color-surface-hover: #f8fafc;
      --color-primary: #6366f1;
      --color-primary-dark: #4338ca;
      --color-primary-hover: #4f46e5;
      --color-primary-glow: rgba(99, 102, 241, 0.15);
      --color-accent: #a855f7;
      --color-text-main: #0f172a;
      --color-text-muted: #334155;
      --color-text-dim: #64748b;
      --color-border: rgba(15, 23, 42, 0.08);
      --color-glass-bg: rgba(255, 255, 255, 0.85);
      --color-glass-border: rgba(15, 23, 42, 0.08);
    }

    .landing-container {
      @apply max-w-6xl mx-auto px-5 md:px-8;
    }

    /* Nav */
    .landing-nav {
      @apply sticky top-0 z-50 border-b border-border;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
    }

    .landing-nav-inner {
      @apply max-w-6xl mx-auto px-5 md:px-8 h-16 md:h-[4.5rem] flex items-center justify-between gap-4;
    }

    .landing-logo {
      @apply flex items-center gap-0 shrink-0;
    }

    .landing-logo-text {
      @apply text-2xl font-extrabold tracking-tighter text-primary -ml-1.5;
    }

    .landing-nav-links {
      @apply items-center gap-7 text-sm font-medium text-text-muted;
    }

    .landing-nav-links a {
      @apply hover:text-primary transition-colors;
    }

    .landing-nav-actions {
      @apply flex items-center gap-2 md:gap-3 shrink-0;
    }

    .landing-link-login {
      @apply text-sm font-semibold text-text-muted hover:text-text-main px-2 hidden md:inline;
    }

    /* Hero */
    .landing-hero {
      @apply pt-12 pb-16 md:pt-16 md:pb-24;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    }

    .landing-hero-grid {
      @apply grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center;
    }

    .landing-hero-phones {
      @apply flex justify-center lg:justify-end order-first lg:order-last;
    }

    .landing-phones-duo {
      @apply relative flex items-end justify-center gap-4 md:gap-6 min-h-[420px] md:min-h-[480px];
    }

    .phone-mockup {
      @apply flex flex-col items-center;
    }

    .phone-mockup-bezel {
      @apply relative overflow-hidden;
      width: 220px;
      border-radius: 2.25rem;
      border: 8px solid #1e293b;
      background: #1e293b;
      box-shadow:
        0 25px 50px -12px rgba(15, 23, 42, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.06) inset;
    }

    @media (min-width: 768px) {
      .phone-mockup-bezel {
        width: 250px;
        border-width: 10px;
        border-radius: 2.5rem;
      }
    }

    @media (min-width: 1024px) {
      .phone-mockup-bezel {
        width: 270px;
      }
    }

    .phone-mockup-gallery .phone-mockup-bezel {
      width: min(280px, 78vw);
    }

    @media (min-width: 768px) {
      .phone-mockup-gallery .phone-mockup-bezel {
        width: 290px;
      }
    }

    .showcase-frame {
      @apply w-full max-w-5xl mx-auto rounded-2xl border border-border bg-white shadow-xl shadow-slate-200/60 overflow-hidden;
    }

    .showcase-frame-bar {
      @apply flex items-center gap-1.5 px-4 py-3 border-b border-border bg-slate-50;
    }

    .showcase-frame-bar span {
      @apply w-2.5 h-2.5 rounded-full bg-slate-300;
    }

    .showcase-frame-bar span:first-child {
      @apply bg-red-400/80;
    }

    .showcase-frame-bar span:nth-child(2) {
      @apply bg-amber-400/80;
    }

    .showcase-frame-bar span:nth-child(3) {
      @apply bg-emerald-400/80;
    }

    .showcase-frame-body {
      @apply flex justify-center items-center bg-slate-100/60 overflow-hidden;
      min-height: 0;
    }

    .showcase-img {
      @apply block w-full h-auto;
      object-fit: contain;
      object-position: top center;
    }

    .phone-mockup-notch {
      @apply absolute top-0 left-1/2 -translate-x-1/2 z-10;
      width: 88px;
      height: 22px;
      background: #1e293b;
      border-radius: 0 0 14px 14px;
    }

    .phone-mockup-img {
      @apply block w-full bg-white;
      aspect-ratio: 390 / 844;
      object-fit: cover;
      object-position: top;
    }

    .phone-mockup-label {
      @apply mt-3 text-[11px] font-semibold text-text-dim text-center max-w-[220px];
    }

    .phone-mockup-primary {
      @apply z-10;
    }

    .phone-mockup-secondary {
      @apply hidden sm:flex;
      transform: translateY(24px) rotate(4deg);
      opacity: 0.95;
    }

    .phone-mockup-secondary .phone-mockup-bezel {
      width: 200px;
    }

    @media (min-width: 768px) {
      .phone-mockup-secondary .phone-mockup-bezel {
        width: 220px;
      }
    }

    .landing-screen-audience {
      @apply text-center text-[11px] font-bold uppercase tracking-widest text-primary mt-2;
    }

    .landing-eyebrow {
      @apply text-xs font-bold uppercase tracking-widest text-primary mb-4;
    }

    .landing-hero-copy h1 {
      @apply text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.1] tracking-tight mb-6 text-slate-900;
    }

    .landing-lead {
      @apply text-lg text-text-muted leading-relaxed mb-8 max-w-xl;
    }

    .landing-bullets {
      @apply flex flex-col gap-3 mb-10 text-sm md:text-base text-text-muted;
    }

    .landing-bullets li {
      @apply flex items-start gap-2.5;
    }

    .landing-hero-ctas {
      @apply flex flex-col sm:flex-row flex-wrap gap-3;
    }

    .landing-shot-caption {
      @apply text-xs text-text-dim leading-relaxed;
    }

    /* Rubros */
    .landing-rubros {
      @apply py-14 md:py-16 border-y border-border bg-slate-50/80;
    }

    .landing-section-title {
      @apply text-2xl md:text-4xl font-extrabold tracking-tight mb-3 text-slate-900;
    }

    .landing-section-sub {
      @apply text-text-muted mb-10;
    }

    .landing-chips {
      @apply flex flex-wrap justify-center gap-2 md:gap-3;
    }

    .landing-chip {
      @apply px-4 py-2 rounded-full text-sm font-medium bg-white border border-border text-text-muted;
    }

    /* Screens */
    .landing-screens {
      @apply py-16 md:py-24;
    }

    .landing-tabs-scroll {
      @apply -mx-5 px-5 md:mx-0 md:px-0 mb-8 overflow-x-auto;
      scrollbar-width: none;
    }

    .landing-tabs-scroll::-webkit-scrollbar {
      display: none;
    }

    .landing-tabs {
      @apply flex flex-nowrap md:flex-wrap justify-start md:justify-center gap-2 min-w-max md:min-w-0 pb-1;
    }

    .landing-tab {
      @apply px-4 py-2 rounded-full text-sm font-semibold border border-border bg-white text-text-muted transition-all whitespace-nowrap shrink-0;
    }

    .landing-tab:hover {
      @apply border-primary/30 text-text-main;
    }

    .landing-tab-active {
      @apply bg-primary text-white border-primary shadow-md shadow-primary/20;
    }

    .landing-screens-stage {
      @apply flex flex-col items-center w-full;
    }

    /* Features */
    .landing-features {
      @apply py-16 md:py-20 bg-slate-50/50;
    }

    .landing-features-grid {
      @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6;
    }

    .landing-feature-card {
      @apply p-6 rounded-2xl bg-white border border-border;
    }

    .landing-feature-icon {
      @apply w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4;
    }

    .landing-feature-card h3 {
      @apply font-bold text-lg mb-2 text-slate-900;
    }

    .landing-feature-card p {
      @apply text-sm text-text-muted leading-relaxed;
    }

    /* Steps */
    .landing-steps {
      @apply py-16 md:py-20;
    }

    .landing-steps-grid {
      @apply grid grid-cols-1 md:grid-cols-3 gap-8;
    }

    .landing-step-card {
      @apply relative p-8 pt-10 rounded-2xl bg-white border border-border;
    }

    .landing-step-num {
      @apply absolute -top-4 left-8 w-10 h-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center shadow-lg shadow-primary/25;
    }

    .landing-step-card h3 {
      @apply font-bold text-lg mb-2 text-slate-900;
    }

    .landing-step-card p {
      @apply text-sm text-text-muted leading-relaxed;
    }

    /* Pricing */
    .landing-pricing {
      @apply py-16 md:py-24 bg-slate-50/80 border-t border-border;
    }

    .landing-pricing-grid {
      @apply grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch;
    }

    .landing-price-card {
      @apply relative p-8 rounded-2xl bg-white border border-border flex flex-col;
    }

    .landing-price-featured {
      @apply border-primary/40 shadow-xl shadow-primary/10 md:-translate-y-1;
    }

    .landing-price-badge {
      @apply absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-wide;
    }

    .landing-price-label {
      @apply text-[10px] font-bold tracking-widest text-text-dim mb-2;
    }

    .landing-price-card h3 {
      @apply text-2xl font-bold mb-2 text-slate-900;
    }

    .landing-price-amount {
      @apply text-4xl font-extrabold mb-1 text-slate-900;
    }

    .landing-price-amount small {
      @apply text-base font-normal text-text-muted;
    }

    .landing-price-alt {
      @apply text-xs text-primary font-semibold mb-6;
    }

    .landing-price-card ul {
      @apply flex flex-col gap-3 text-sm text-text-muted mb-8 flex-1;
    }

    .landing-price-card ul li::before {
      content: '✓';
      @apply text-success mr-2 font-bold;
    }

    .landing-pricing-more {
      @apply text-center mt-10;
    }

    .landing-pricing-link {
      @apply inline-flex items-center gap-2 font-semibold text-text-main hover:text-primary transition-colors;
    }

    /* Final CTA */
    .landing-final-cta {
      @apply py-16 md:py-20;
    }

    .landing-final-box {
      @apply text-center p-10 md:p-16 rounded-3xl border border-border;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(168, 85, 247, 0.04));
    }

    .landing-final-box h2 {
      @apply text-3xl md:text-4xl font-extrabold mb-4 text-slate-900;
    }

    .landing-final-box p {
      @apply text-text-muted mb-8 max-w-lg mx-auto;
    }

    /* Footer */
    .landing-footer {
      @apply pt-14 pb-8 border-t border-border bg-white;
    }

    .landing-footer-inner {
      @apply grid grid-cols-1 md:grid-cols-3 gap-10 mb-10;
    }

    .landing-footer-brand p {
      @apply text-sm text-text-muted mt-4 max-w-xs;
    }

    .landing-footer h4 {
      @apply font-bold mb-4 text-sm;
    }

    .landing-footer ul {
      @apply flex flex-col gap-3 text-sm text-text-muted;
    }

    .landing-footer a:hover {
      @apply text-primary;
    }

    .landing-footer-copy {
      @apply pt-8 border-t border-border text-xs text-text-dim text-center;
    }
  `,
})
export class LandingComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);

  currentYear = new Date().getFullYear();
  activeScreenId = signal('home');

  proPriceMonthly = signal(15000);
  proPriceYearlyMonthly = signal(12000);
  businessPriceMonthly = signal(24500);
  businessPriceYearlyMonthly = signal(19600);

  screens: LandingScreen[] = [
    {
      id: 'home',
      label: 'Inicio',
      key: 'home',
      caption: 'Resumen del día: turnos, métricas y accesos rápidos.',
      audience: 'Panel del negocio',
    },
    {
      id: 'agenda-dia',
      label: 'Agenda',
      key: 'agenda-dia',
      caption: 'Vista diaria con turnos del día, ideal para el equipo.',
      audience: 'Panel del negocio',
    },
    {
      id: 'lista-turnos',
      label: 'Lista',
      key: 'lista-turnos',
      caption: 'Listado con búsqueda, filtros y cambio de estado con un toque.',
      audience: 'Panel del negocio',
    },
    {
      id: 'nuevo-turno',
      label: 'Nuevo turno',
      key: 'nuevo-turno',
      caption: 'Cargá un turno en segundos mientras atendés al cliente.',
      audience: 'Panel del negocio',
    },
    {
      id: 'clientes',
      label: 'Clientes',
      key: 'clientes',
      caption: 'Ficha del cliente, contacto e historial al alcance de la mano.',
      audience: 'Panel del negocio',
    },
    {
      id: 'config-publica',
      label: 'Sitio público',
      key: 'config-publica',
      caption: 'Personalizá colores, logo, QR y reglas de reserva online.',
      audience: 'Panel del negocio',
    },
    {
      id: 'portal-reserva',
      label: 'Reserva cliente',
      key: 'portal-reserva',
      caption: 'Así reserva tu cliente online, sin llamarte ni escribirte.',
      audience: 'Vista del cliente',
      phoneMockupAlways: true,
    },
  ];

  activeScreen = computed(() =>
    this.screens.find((s) => s.id === this.activeScreenId()) ?? this.screens[0],
  );

  rubros = [
    'Barbería',
    'Peluquería',
    'Estética',
    'Salud',
    'Kinesiología',
    'Odontología',
    'Consultorios',
    'Educación',
    'Tatuajes',
  ];

  features = [
    {
      icon: 'devices',
      title: 'PC o celular, misma experiencia',
      description:
        'Panel responsive para trabajar desde la computadora del local o el celular, donde te quede más cómodo.',
    },
    {
      icon: 'calendar_month',
      title: 'Agenda completa',
      description:
        'Vistas diaria, semanal y lista. Reprogramá turnos, bloqueá horarios y controlá el día a día.',
    },
    {
      icon: 'public',
      title: 'Autogestión del cliente',
      description:
        'Link público con tu marca. Tus clientes reservan, reprograman o cancelan solos, disponible 24/7.',
    },
    {
      icon: 'chat',
      title: 'WhatsApp automático',
      description:
        'Confirmaciones y recordatorios que reducen inasistencias sin que escribas uno por uno.',
    },
    {
      icon: 'groups',
      title: 'CRM integrado',
      description:
        'Clientes, notas y etiquetas siempre a mano mientras organizás la agenda.',
    },
    {
      icon: 'add_circle',
      title: 'Turnos al vuelo',
      description:
        'Creá clientes y turnos en segundos desde el modal, cuando te llaman o te escriben.',
    },
  ];

  steps = [
    {
      number: 1,
      title: 'Configurá tu negocio',
      description:
        'Cargá servicios, horarios, sucursales y reglas de reserva. Todo desde el navegador.',
    },
    {
      number: 2,
      title: 'Compartí tu link',
      description:
        'Enviá el enlace por WhatsApp, Instagram o tu web. Tus clientes se autogestionan el turno.',
    },
    {
      number: 3,
      title: 'Gestioná y automatizá',
      description:
        'Seguí la agenda desde PC o celular. Axenda avisa a tus clientes por vos.',
    },
  ];

  ngOnInit(): void {
    this.loadPlans();
  }

  /** Hero: siempre mockup de celular → capturas mobile-*. */
  heroImgSrc(key: string): string {
    return this.landingImgSrc(`mobile-${key}`);
  }

  mobileScreenImgSrc(screen: LandingScreen): string {
    return this.landingImgSrc(`mobile-${screen.key}`);
  }

  desktopScreenImgSrc(screen: LandingScreen): string {
    return this.landingImgSrc(`desktop-${screen.key}`);
  }

  landingImgSrc(file: string): string {
    return `/assets/landing/${file}.png`;
  }

  onLandingImgError(event: Event, file: string): void {
    const img = event.target as HTMLImageElement;

    // Si falta mobile-*, usar desktop-* como respaldo temporal.
    if (file.startsWith('mobile-') && !img.dataset['desktopFallback']) {
      img.dataset['desktopFallback'] = 'true';
      img.src = this.landingImgSrc(`desktop-${file.slice('mobile-'.length)}`);
      return;
    }

    const fallback = `/assets/landing/${file}.svg`;
    if (!img.src.endsWith('.svg')) {
      img.src = fallback;
    }
  }

  async loadPlans(): Promise<void> {
    try {
      const plans = await this.subscriptionService.getPlans();
      const pro = plans.find((p) => p.code === 'PRO');
      if (pro) {
        this.proPriceMonthly.set(Number(pro.priceMonthly));
        this.proPriceYearlyMonthly.set(Number(pro.priceYearly) / 12);
      }
      const business = plans.find((p) => p.code === 'BUSINESS');
      if (business) {
        this.businessPriceMonthly.set(Number(business.priceMonthly));
        this.businessPriceYearlyMonthly.set(Number(business.priceYearly) / 12);
      }
    } catch {
      // Fallback prices already set
    }
  }
}
