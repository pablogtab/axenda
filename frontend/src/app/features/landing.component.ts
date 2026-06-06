import { Component, OnInit, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeToggleComponent } from '../shared/components/theme-toggle.component';
import { IconComponent } from '@shared/components/icon.component';
import { SubscriptionService } from '@core/services/subscription.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, IconComponent],
  template: `
    <div class="landing-shell">
      <!-- Navbar -->
      <nav
        class="fixed top-0 left-0 right-0 z-50 glass !border-none !bg-bg-primary/80"
      >
        <div
          class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between"
        >
          <div
            class="flex items-center gap-0 group cursor-pointer"
            routerLink="/"
          >
            <img
              src="assets/logo.svg"
              alt="Axenda Logo"
              class="w-10 h-10 drop-shadow-2xl"
            />
            <span
              class="text-3xl font-extrabold tracking-tighter text-gradient -ml-1.5"
              >xenda</span
            >
          </div>

          <div
            class="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted"
          >
            <a href="#features" class="hover:text-primary transition-colors"
              >Funcionalidades</a
            >
            <a href="#pricing" class="hover:text-primary transition-colors"
              >Precios</a
            >
          </div>

          <div class="flex items-center gap-4">
            <app-theme-toggle class="mr-2" />
            <a
              routerLink="/login"
              class="text-sm font-semibold text-text-muted hover:text-text-main px-4 py-2"
              >Ingresar</a
            >
            <a routerLink="/register" class="btn-primary !py-2 !px-5 !text-sm"
              >Registrate Gratis</a
            >
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="hero-section overflow-hidden">
        <!-- Glows -->
        <div
          class="glow-bg top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20"
        ></div>
        <div
          class="glow-bg bottom-[0%] right-[-10%] w-[40%] h-[40%] bg-accent/15"
        ></div>

        <div class="section-container relative z-10">
          <div class="hero-grid-container">
            <!-- Left Column: Content -->
            <div
              class="text-left animate-in fade-in slide-in-from-left duration-1000"
            >
              <div
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8"
              >
                <span class="relative flex h-2 w-2">
                  <span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"
                  ></span>
                  <span
                    class="relative inline-flex rounded-full h-2 w-2 bg-primary"
                  ></span>
                </span>
                NUEVA VERSIÓN 2.1 DISPONIBLE
              </div>

              <h1
                class="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight"
              >
                Gestioná tu negocio <br />
                <span class="text-gradient">mientras descansás</span>
              </h1>

              <p
                class="text-lg md:text-xl text-text-muted mb-12 leading-relaxed"
              >
                Axenda centraliza turnos, cobros y recordatorios automáticos
                para que dejes de perseguir mensajes y te concentres en lo que
                importa: tus clientes.
              </p>

              <div class="flex flex-col sm:flex-row items-center gap-4">
                <a
                  routerLink="/register"
                  class="btn-primary !text-lg !px-10 w-full sm:w-auto text-center"
                  >Comenzar Gratis</a
                >
                <a
                  href="#features"
                  class="btn-secondary !text-lg !px-10 border border-border hover:bg-surface-subtle-hover w-full sm:w-auto text-center"
                  >Ver funciones</a
                >
              </div>

              <div class="mt-12 flex items-center gap-8 grayscale opacity-50">
                <div class="flex flex-col">
                  <span class="text-2xl font-bold">500+</span>
                  <span class="text-xs uppercase tracking-widest text-text-dim"
                    >Negocios</span
                  >
                </div>
                <div class="flex flex-col">
                  <span class="text-2xl font-bold">50k+</span>
                  <span class="text-xs uppercase tracking-widest text-text-dim"
                    >Turnos / mes</span
                  >
                </div>
              </div>
            </div>

            <!-- Right Column: Dashboard Preview -->
            <div
              class="relative animate-in fade-in slide-in-from-right duration-1000"
            >
              <div class="relative float-animation">
                <div
                  class="rounded-3xl p-3 bg-gradient-to-br from-surface-subtle to-transparent border border-border shadow-2xl backdrop-blur-3xl"
                >
                  <div
                    class="rounded-2xl overflow-hidden bg-bg-secondary border border-border relative aspect-video"
                  >
                    <div class="absolute inset-0 p-4 md:p-5 flex flex-col gap-3">
                      <div class="grid grid-cols-3 gap-2">
                        <div
                          class="rounded-xl bg-surface-subtle border border-border px-3 py-2"
                        >
                          <p class="text-[10px] uppercase tracking-wider text-text-dim">
                            Turnos Hoy
                          </p>
                          <p class="text-sm font-semibold text-text-main">24</p>
                        </div>
                        <div
                          class="rounded-xl bg-surface-subtle border border-border px-3 py-2"
                        >
                          <p class="text-[10px] uppercase tracking-wider text-text-dim">
                            Confirmados
                          </p>
                          <p class="text-sm font-semibold text-success">19</p>
                        </div>
                        <div
                          class="rounded-xl bg-surface-subtle border border-border px-3 py-2"
                        >
                          <p class="text-[10px] uppercase tracking-wider text-text-dim">
                            Facturado
                          </p>
                          <p class="text-sm font-semibold text-primary">$ 248k</p>
                        </div>
                      </div>

                      <div
                        class="flex-1 rounded-xl border border-border bg-bg-primary/40 p-3 space-y-2"
                      >
                        <div
                          class="flex items-center justify-between rounded-lg bg-bg-secondary/65 border border-border/70 px-3 py-2"
                        >
                          <div>
                            <p class="text-[11px] font-semibold text-text-main">
                              10:30 · Corte + Barba
                            </p>
                            <p class="text-[10px] text-text-dim">
                              Lucas Medina · Profesional: Mateo
                            </p>
                          </div>
                          <span
                            class="text-[9px] px-2 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-300/20"
                            >Confirmado</span
                          >
                        </div>

                        <div
                          class="flex items-center justify-between rounded-lg bg-bg-secondary/65 border border-border/70 px-3 py-2"
                        >
                          <div>
                            <p class="text-[11px] font-semibold text-text-main">
                              11:15 · Color + Lavado
                            </p>
                            <p class="text-[10px] text-text-dim">
                              Julieta Paz · Profesional: Sol
                            </p>
                          </div>
                          <span
                            class="text-[9px] px-2 py-1 rounded-full bg-amber-300/20 text-amber-200 border border-amber-200/20"
                            >En espera</span
                          >
                        </div>

                        <div
                          class="flex items-center justify-between rounded-lg bg-bg-secondary/65 border border-border/70 px-3 py-2"
                        >
                          <div>
                            <p class="text-[11px] font-semibold text-text-main">
                              12:00 · Consulta inicial
                            </p>
                            <p class="text-[10px] text-text-dim">
                              Daniela Suárez · Sala 2
                            </p>
                          </div>
                          <span
                            class="text-[9px] px-2 py-1 rounded-full bg-sky-300/20 text-sky-200 border border-sky-200/20"
                            >Pagado</span
                          >
                        </div>
                      </div>
                    </div>
                    <div
                      class="absolute inset-0 bg-linear-to-t from-bg-secondary/90 via-transparent to-transparent"
                    ></div>
                  </div>
                </div>

                <!-- Floating cards -->
                <div
                  class="absolute -right-8 top-12 glass p-5 rounded-2xl shadow-2xl animate-in zoom-in slide-in-from-right duration-700 delay-300"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center"
                    >
                      <app-icon name="check" class="text-success"></app-icon>
                    </div>
                    <div>
                      <p class="text-xs font-bold">Turno Confirmado</p>
                      <p class="text-[10px] text-text-muted">
                        Corte + Barba @ 15:30
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  class="absolute -left-8 bottom-12 glass p-5 rounded-2xl shadow-2xl animate-in zoom-in slide-in-from-left duration-700 delay-500"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"
                    >
                      <app-icon name="payments" class="text-primary"></app-icon>
                    </div>
                    <div>
                      <p class="text-xs font-bold">Pago Recibido</p>
                      <p class="text-[10px] text-text-muted">
                        Seña confirmada ($5.000)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Cómo Funciona (Paso a Paso) -->
      <section
        id="how-it-works"
        class="py-24 px-4 bg-surface-subtle/20 border-y border-border/50"
      >
        <div class="section-container max-w-7xl mx-auto">
          <div class="text-center mb-20">
            <span
              class="text-xs uppercase tracking-widest text-primary font-bold"
              >SIMPLE Y RÁPIDO</span
            >
            <h2
              class="text-3xl md:text-5xl font-extrabold tracking-tight mt-2 mb-4"
            >
              Empezá a automatizar en <span class="text-gradient">3 pasos</span>
            </h2>
            <p class="text-text-muted max-w-xl mx-auto text-base">
              Configurá tu negocio hoy mismo y dejá que Axenda trabaje por vos
              en piloto automático.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 relative mt-16">
            <!-- Paso 1 -->
            <div
              class="group p-8 rounded-[2rem] bg-surface-subtle border border-border/60 hover:border-primary/20 hover:bg-primary-glow/10 transition-all duration-500 relative flex flex-col h-full pt-12"
            >
              <div
                class="absolute -top-6 left-8 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20"
              >
                1
              </div>
              <div class="mb-6">
                <div
                  class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                >
                  <app-icon name="person_add" class="text-2xl"></app-icon>
                </div>
              </div>
              <h3 class="text-xl font-bold mb-3 text-text-main">
                Registrá tu cuenta
              </h3>
              <p class="text-text-muted leading-relaxed text-sm">
                Completá el registro en segundos, definí el nombre de tu marca y
                verifica tu correo. Ya estás listo para configurar tu panel.
              </p>
            </div>

            <!-- Paso 2 -->
            <div
              class="group p-8 rounded-[2rem] bg-surface-subtle border border-border/60 hover:border-primary/20 hover:bg-primary-glow/10 transition-all duration-500 relative flex flex-col h-full pt-12"
            >
              <div
                class="absolute -top-6 left-8 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20"
              >
                2
              </div>
              <div class="mb-6">
                <div
                  class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                >
                  <app-icon name="settings" class="text-2xl"></app-icon>
                </div>
              </div>
              <h3 class="text-xl font-bold mb-3 text-text-main">
                Configurá tus servicios
              </h3>
              <p class="text-text-muted leading-relaxed text-sm">
                Cargá las prestaciones que ofrecés, definí la duración, precio,
                profesionales a cargo y tus horarios de atención semanales.
              </p>
            </div>

            <!-- Paso 3 -->
            <div
              class="group p-8 rounded-[2rem] bg-surface-subtle border border-border/60 hover:border-primary/20 hover:bg-primary-glow/10 transition-all duration-500 relative flex flex-col h-full pt-12"
            >
              <div
                class="absolute -top-6 left-8 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20"
              >
                3
              </div>
              <div class="mb-6">
                <div
                  class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                >
                  <app-icon name="share" class="text-2xl"></app-icon>
                </div>
              </div>
              <h3 class="text-xl font-bold mb-3 text-text-main">
                Compartí tu link de reservas
              </h3>
              <p class="text-text-muted leading-relaxed text-sm">
                Colocá tu enlace de reserva en tu bio de Instagram o WhatsApp.
                Tus clientes elegirán el horario, pagarán la seña y recibirán
                avisos automáticos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ¿Para quién es Axenda? (Casos de uso) -->
      <section id="for-whom" class="py-24 px-4 bg-surface-subtle/30">
        <div class="section-container max-w-7xl mx-auto">
          <div class="text-center mb-16">
            <span
              class="text-xs uppercase tracking-widest text-primary font-bold"
              >RUBROS Y SECTORES</span
            >
            <h2
              class="text-3xl md:text-5xl font-extrabold tracking-tight mt-2 mb-4"
            >
              Diseñado para adaptarse a
              <span class="text-gradient">tu negocio</span>
            </h2>
            <p class="text-text-muted max-w-xl mx-auto text-base">
              Optimizá la gestión de turnos sin importar a qué te dediques.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <!-- Belleza y Bienestar -->
            <div
              class="group p-8 rounded-[2rem] bg-surface-subtle border border-border/60 hover:border-primary/20 hover:bg-primary-glow/10 transition-all duration-500 flex flex-col h-full"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500"
              >
                <app-icon
                  name="content_cut"
                  class="text-3xl text-primary"
                ></app-icon>
              </div>
              <h3 class="text-xl font-bold mb-3 text-text-main">
                Belleza y Estética
              </h3>
              <p class="text-text-muted leading-relaxed text-sm">
                Ideal para peluquerías, barberías, salones de manicuría,
                pestañas y spas. Permití reservas individuales por profesional y
                controlá la ocupación de tus camillas o sillones.
              </p>
            </div>

            <!-- Salud y Terapias -->
            <div
              class="group p-8 rounded-[2rem] bg-surface-subtle border border-border/60 hover:border-primary/20 hover:bg-primary-glow/10 transition-all duration-500 flex flex-col h-full"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500"
              >
                <app-icon
                  name="medical_services"
                  class="text-3xl text-primary"
                ></app-icon>
              </div>
              <h3 class="text-xl font-bold mb-3 text-text-main">
                Salud y Terapias
              </h3>
              <p class="text-text-muted leading-relaxed text-sm">
                Perfecto para kinesiólogos, odontólogos, psicólogos,
                nutricionistas y médicos. Organizá tu agenda médica, controlá
                las inasistencias y gestioná el historial de cada paciente.
              </p>
            </div>

            <!-- Cuidado de Mascotas -->
            <div
              class="group p-8 rounded-[2rem] bg-surface-subtle border border-border/60 hover:border-primary/20 hover:bg-primary-glow/10 transition-all duration-500 flex flex-col h-full"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500"
              >
                <app-icon name="pets" class="text-3xl text-primary"></app-icon>
              </div>
              <h3 class="text-xl font-bold mb-3 text-text-main">
                Cuidado de Mascotas
              </h3>
              <p class="text-text-muted leading-relaxed text-sm">
                Ideal para peluquerías caninas, pet grooming y veterinarias.
                Controlá la agenda de baños y consultas de forma organizada por
                profesional.
              </p>
            </div>

            <!-- Tatuajes y Arte -->
            <div
              class="group p-8 rounded-[2rem] bg-surface-subtle border border-border/60 hover:border-primary/20 hover:bg-primary-glow/10 transition-all duration-500 flex flex-col h-full"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500"
              >
                <app-icon name="brush" class="text-3xl text-primary"></app-icon>
              </div>
              <h3 class="text-xl font-bold mb-3 text-text-main">
                Tatuajes y Arte
              </h3>
              <p class="text-text-muted leading-relaxed text-sm">
                Perfecto para estudios de tatuajes y piercings. Administrá citas
                de larga duración, cobrá señas para asegurar el turno y
                comunicate con tus clientes.
              </p>
            </div>
          </div>

          <!-- Nota de Adaptabilidad -->
          <div
            class="mt-16 text-center max-w-2xl mx-auto p-6 rounded-2xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-bottom duration-1000 delay-300"
          >
            <p class="text-sm text-text-muted leading-relaxed">
              ¿Tu rubro es diferente?
              <span class="text-primary font-bold"
                >Axenda es 100% adaptable</span
              >. Gracias a nuestros campos personalizados y configuraciones
              flexibles, podés modelar la plataforma exactamente a la medida de
              tu necesidad.
            </p>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="py-24 px-4 relative">
        <div class="section-container max-w-7xl mx-auto">
          <div
            class="text-center mb-16 animate-in fade-in slide-in-from-bottom duration-1000"
          >
            <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Todo lo que necesitás para
              <span class="text-primary">escalar</span>
            </h2>
            <p class="text-text-muted max-w-2xl mx-auto text-lg">
              Axenda no es solo una agenda, es el centro de operaciones de tu
              negocio.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (feature of features; track feature.title) {
              <div
                class="group p-8 rounded-[2rem] bg-surface-subtle border border-border hover:border-primary/20 hover:bg-primary-glow transition-all duration-500"
              >
                <div
                  class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                >
                  <app-icon
                    name="{{ feature.icon }}"
                    class="text-3xl text-primary"
                  ></app-icon>
                </div>
                <h3 class="text-xl font-bold mb-3 text-text-main">
                  {{ feature.title }}
                </h3>
                <p class="text-text-muted leading-relaxed text-sm">
                  {{ feature.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section id="pricing" class="py-24 px-4 bg-surface-subtle/30">
        <div class="section-container">
          <div class="text-center mb-16">
            <h2 class="text-3xl md:text-5xl font-bold mb-4">Planes simples</h2>
            <p class="text-text-muted">
              Elegí el que mejor se adapte a tu etapa actual.
            </p>
          </div>

          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch"
          >
            <!-- Plan Starter -->
            <div
              class="pricing-card !p-8 border-border hover:border-primary/20 transition-all flex flex-col h-full"
            >
              <p
                class="text-[10px] font-bold text-text-muted mb-4 tracking-widest uppercase"
              >
                PARA EMPEZAR
              </p>
              <h3 class="text-2xl font-bold mb-1">Starter</h3>
              <div class="flex items-baseline gap-1 mb-8">
                <span class="text-4xl font-extrabold text-text-main"
                  >Gratis</span
                >
              </div>
              <ul class="flex flex-col gap-4 text-xs text-text-muted mb-10">
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-success/20 text-success flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Máximo 25 turnos / mes</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-success/20 text-success flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Perfil público</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-success/20 text-success flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Agenda interactiva</span>
                </li>
              </ul>
              <a
                routerLink="/register"
                class="btn-secondary w-full block text-center !py-2.5 !text-xs mt-auto"
                >Elegir Starter</a
              >
            </div>

            <!-- Plan Pro -->
            <div
              class="pricing-card !p-8 border-border hover:border-primary/20 transition-all flex flex-col h-full"
            >
              <p
                class="text-[10px] font-bold text-text-muted mb-4 tracking-widest uppercase"
              >
                PROFESIONAL
              </p>
              <h3 class="text-2xl font-bold mb-1">Pro</h3>
              <div class="flex flex-col mb-8">
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-extrabold text-text-main"
                    >\${{ proPriceMonthly() | number: '1.0-0' }}</span
                  >
                  <span class="text-text-muted text-xs">/mes</span>
                </div>
                <span class="text-[10px] text-primary font-semibold mt-1"
                  >\${{ proPriceYearlyMonthly() | number: '1.0-0' }}/mes pagando
                  anual</span
                >
              </div>
              <ul class="flex flex-col gap-4 text-xs text-text-muted mb-10">
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Turnos ilimitados</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Cobros con Mercado Pago</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <div class="flex flex-col">
                    <span>100 WhatsApps / mes (*)</span>
                    <span class="text-[10px] opacity-60"
                      >+ Ampliación disponible</span
                    >
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Reseñas Google (Email)</span>
                </li>
              </ul>
              <a
                routerLink="/register"
                class="btn-secondary w-full block text-center !py-2.5 !text-xs mt-auto"
                >Elegir Pro</a
              >
            </div>

            <!-- Plan Business -->
            <div
              class="pricing-card featured !p-8 !bg-primary-glow/50 flex flex-col h-full relative"
            >
              <div
                class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-white text-[10px] font-black rounded-full tracking-tighter shadow-lg shadow-primary/20 z-10"
              >
                RECOMENDADO
              </div>
              <p
                class="text-[10px] font-bold text-primary mb-4 tracking-widest uppercase"
              >
                CRECIMIENTO
              </p>
              <h3 class="text-2xl font-bold mb-1">Business</h3>
              <div class="flex flex-col mb-8">
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-extrabold text-text-main"
                    >\${{ businessPriceMonthly() | number: '1.0-0' }}</span
                  >
                  <span class="text-text-muted text-xs">/mes</span>
                </div>
                <span class="text-[10px] text-primary font-semibold mt-1"
                  >\${{ businessPriceYearlyMonthly() | number: '1.0-0' }}/mes
                  pagando anual</span
                >
              </div>
              <ul class="flex flex-col gap-4 text-xs text-text-muted mb-10">
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Hasta 5 profesionales</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <div class="flex flex-col">
                    <span>300 WhatsApps / mes (*)</span>
                    <span class="text-[10px] opacity-60"
                      >+ Ampliación disponible</span
                    >
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Reseñas Google (Email o WhatsApp)</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Todo lo del Plan Pro</span>
                </li>
              </ul>
              <a
                routerLink="/register"
                class="btn-primary w-full block text-center !py-2.5 !text-xs !shadow-2xl mt-auto"
                >Elegir Business</a
              >
            </div>

            <!-- Plan Elite -->
            <div
              class="pricing-card !p-8 border-border hover:border-primary/20 transition-all flex flex-col h-full"
            >
              <p
                class="text-[10px] font-bold text-text-muted mb-4 tracking-widest uppercase"
              >
                ÉLITE
              </p>
              <h3 class="text-2xl font-bold mb-1">Elite</h3>
              <div class="flex flex-col mb-8">
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-extrabold text-text-main"
                    >\${{ elitePriceMonthly() | number: '1.0-0' }}</span
                  >
                  <span class="text-text-muted text-xs">/mes</span>
                </div>
                <span class="text-[10px] text-primary font-semibold mt-1"
                  >\${{ elitePriceYearlyMonthly() | number: '1.0-0' }}/mes
                  pagando anual</span
                >
              </div>
              <ul class="flex flex-col gap-4 text-xs text-text-muted mb-10">
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Profesionales ilimitados</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Reseñas Google (Email o WhatsApp)</span>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <div class="flex flex-col">
                    <span>1.000 WhatsApps / mes (*)</span>
                    <span class="text-[10px] opacity-60"
                      >+ Ampliación disponible</span
                    >
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px]"
                    >✓</span
                  >
                  <span>Usá tu propio número</span>
                </li>
              </ul>
              <a
                routerLink="/register"
                class="btn-secondary w-full block text-center !py-2.5 !text-xs mt-auto"
                >Elegir Elite</a
              >
            </div>
          </div>

          <!-- Link to detailed comparison -->
          <div
            class="mt-16 text-center animate-in fade-in slide-in-from-bottom duration-1000 delay-500"
          >
            <p class="text-[10px] text-text-muted mb-6">
              (*) Los límites de WhatsApp son ampliables mediante paquetes de
              mensajes adicionales.
            </p>
            <a
              routerLink="/precios"
              class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-surface-subtle border border-border text-text-main font-bold hover:bg-surface-subtle-hover transition-all group"
            >
              <app-icon
                name="analytics"
                class="text-primary group-hover:rotate-12 transition-transform"
              ></app-icon>
              Ver comparativa completa de funciones
              <app-icon
                name="chevron_right"
                class="text-text-dim group-hover:translate-x-1 transition-transform"
              ></app-icon>
            </a>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section id="faq" class="py-24 px-4 bg-surface-subtle/30">
        <div class="section-container max-w-3xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-3xl md:text-5xl font-bold mb-4">
              Preguntas frecuentes
            </h2>
            <p class="text-text-muted">
              Todo lo que necesitás saber para empezar.
            </p>
          </div>

          <div class="flex flex-col gap-4">
            @for (item of faqs; track item.question) {
              <div class="faq-item">
                <button class="faq-trigger">
                  <span class="font-semibold">{{ item.question }}</span>
                  <app-icon name="expand_more" class="text-primary"></app-icon>
                </button>
                <div class="p-6 pt-0 text-text-muted text-sm">
                  {{ item.answer }}
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- CTA Banner -->
      <section class="py-24 px-4">
        <div class="section-container">
          <div class="cta-banner">
            <h2 class="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
              ¿Listo para escalar <br />
              tu negocio?
            </h2>
            <p class="text-lg text-text-muted max-w-xl mx-auto mb-10">
              Unite a los profesionales que ya automatizaron su agenda y están
              ganando tiempo libre cada semana.
            </p>
            <a routerLink="/register" class="btn-primary !text-lg !px-12"
              >Empezar ahora gratis</a
            >
            <p class="text-xs text-text-dim mt-6">
              Sin tarjeta de crédito. Empezá gratis hoy con nuestro plan
              Starter.
            </p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="py-20 border-t border-border">
        <div class="section-container px-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div class="col-span-1 md:col-span-2">
              <div class="flex items-center gap-0 group mb-6">
                <img src="assets/logo.svg" alt="Axenda Logo" class="w-8 h-8" />
                <span
                  class="text-2xl font-extrabold tracking-tighter text-gradient -ml-1"
                  >xenda</span
                >
              </div>
              <p class="text-text-muted text-sm max-w-xs mb-6">
                La plataforma definitiva para la gestión de turnos y CRM para
                negocios modernos.
              </p>
              <div class="mb-4">
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-text-dim"
                  >Redes Sociales</span
                >
              </div>
              <div class="flex gap-4">
                <a
                  href="#"
                  class="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center hover:bg-surface-subtle-hover transition-colors border border-border"
                >
                  <img
                    src="https://img.icons8.com/ios-filled/20/6366f1/instagram-new.png"
                    alt="Instagram"
                  />
                </a>
                <a
                  href="#"
                  class="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center hover:bg-surface-subtle-hover transition-colors border border-border"
                >
                  <img
                    src="https://img.icons8.com/ios-filled/20/6366f1/facebook-new.png"
                    alt="Facebook"
                  />
                </a>
              </div>
            </div>

            <div>
              <h4 class="font-bold mb-6">Producto</h4>
              <ul class="flex flex-col gap-4 text-sm text-text-muted">
                <li>
                  <a
                    href="#features"
                    class="hover:text-primary transition-colors"
                    >Funciones</a
                  >
                </li>
                <li>
                  <a
                    href="#pricing"
                    class="hover:text-primary transition-colors"
                    >Precios</a
                  >
                </li>
                <li>
                  <a href="#" class="hover:text-primary transition-colors"
                    >Soporte</a
                  >
                </li>
              </ul>
            </div>

            <div>
              <h4 class="font-bold mb-6">Legal</h4>
              <ul class="flex flex-col gap-4 text-sm text-text-muted">
                <li>
                  <a
                    routerLink="/terminos"
                    class="hover:text-primary transition-colors cursor-pointer"
                    >Términos</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/privacidad"
                    class="hover:text-primary transition-colors cursor-pointer"
                    >Privacidad</a
                  >
                </li>
                <li>
                  <a href="#" class="hover:text-primary transition-colors"
                    >Cookies</a
                  >
                </li>
              </ul>
            </div>
          </div>

          <div
            class="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-border pt-8 text-xs text-text-dim"
          >
            <p>© 2026 Axenda. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ para emprendedores de Latinoamérica</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: `
    @reference "../../styles.css";

    .landing-shell {
      min-height: 100vh;
      background-color: var(--color-bg-primary);
      color: var(--color-text-main);
      overflow-x: hidden;
    }

    .landing-shell ::selection {
      background-color: var(--color-primary);
      color: white;
    }

    /* Explicit Grid Fallbacks */
    .features-grid-container {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 2rem;
    }

    @media (min-width: 768px) {
      .features-grid-container {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .features-grid-container {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .hero-grid-container {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 4rem;
      align-items: center;
    }

    @media (min-width: 1024px) {
      .hero-grid-container {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .glow-bg {
      @apply absolute blur-[120px] pointer-events-none;
    }

    .hero-section {
      @apply relative pt-32 pb-20 md:pt-48 md:pb-32 px-4;
    }

    .section-container {
      @apply max-w-7xl mx-auto;
    }

    .feature-card {
      @apply card-glass flex flex-col gap-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-primary/10;
    }

    .icon-box {
      @apply w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary;
    }

    .faq-item {
      @apply card-glass !p-0 overflow-hidden mb-4 border border-border;
    }

    .faq-trigger {
      @apply w-full flex items-center justify-between p-6 text-left hover:bg-surface-subtle transition-colors;
    }

    .pricing-card {
      @apply card-glass relative border border-border;
    }

    .pricing-card.featured {
      @apply border-primary/50 shadow-2xl shadow-primary/10;
    }

    .cta-banner {
      @apply relative rounded-[2rem] overflow-hidden p-12 md:p-20 text-center bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border;
    }

    @keyframes float {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    .float-animation {
      animation: float 6s ease-in-out infinite;
    }
  `,
})
export class LandingComponent implements OnInit {
  windowWidth = signal(window.innerWidth);
  private subscriptionService = inject(SubscriptionService);

  // Precios dinámicos (valores fallback iniciales por si falla la API)
  proPriceMonthly = signal<number>(15000);
  proPriceYearlyMonthly = signal<number>(12000);

  businessPriceMonthly = signal<number>(24500);
  businessPriceYearlyMonthly = signal<number>(19600);

  elitePriceMonthly = signal<number>(48000);
  elitePriceYearlyMonthly = signal<number>(38400);

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
  }
  features = [
    {
      icon: 'calendar_month',
      title: 'Agenda Interactiva',
      description:
        'Gestioná tus turnos en una interfaz de alto rendimiento, diseñada para la velocidad y la facilidad de uso.',
    },
    {
      icon: 'chat',
      title: 'WhatsApp Automation',
      description:
        'Reducí el ausentismo hasta un 80% con recordatorios automáticos. El sistema trabaja por vos 24/7.',
    },
    {
      icon: 'payments',
      title: 'Mercado Pago Connect',
      description:
        'Asegurá tus ingresos cobrando señas o el total por adelantado. Integración nativa y sin intermediarios.',
    },
    {
      icon: 'star',
      title: 'Reseñas en Google',
      description:
        'Mejorá tu reputación online solicitando reseñas automáticamente tras cada servicio exitoso.',
    },
    {
      icon: 'public',
      title: 'Reservas Online 24/7',
      description:
        'Tu negocio nunca cierra. Permití que tus clientes agenden su próximo turno en cualquier momento y lugar.',
    },
    {
      icon: 'lan',
      title: 'Multi-Sede y Equipo',
      description:
        'Escalá tu negocio administrando múltiples sucursales y controlando el desempeño de todo tu staff.',
    },
  ];

  faqs = [
    {
      question: '¿Puedo gestionar varias sucursales?',
      answer:
        'Sí, Axenda está diseñado para negocios multi-sede. Podés administrar diferentes sucursales y ver la agenda de cada una desde un mismo panel centralizado.',
    },
    {
      question: '¿Cómo reservan mis clientes?',
      answer:
        'Te proporcionamos un link único de reserva que podés poner en tu bio de Instagram o WhatsApp. Tus clientes verán tu disponibilidad real y agendarán en segundos.',
    },
    {
      question: '¿Necesito instalar algo?',
      answer:
        'No. Axenda es una plataforma en la nube (SaaS). Podés acceder desde cualquier dispositivo con internet, ya sea PC, tablet o móvil, sin descargar ninguna app.',
    },
    {
      question: '¿Es seguro el acceso con Google?',
      answer:
        'Totalmente. Utilizamos el estándar de Google OAuth para que puedas registrarte e ingresar con un solo clic, manteniendo tus datos protegidos por la seguridad de Google.',
    },
  ];

  ngOnInit(): void {
    this.loadPlans();
  }

  async loadPlans() {
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

      const elite = plans.find((p) => p.code === 'ELITE');
      if (elite) {
        this.elitePriceMonthly.set(Number(elite.priceMonthly));
        this.elitePriceYearlyMonthly.set(Number(elite.priceYearly) / 12);
      }
    } catch (error) {
      console.error('Error fetching plans in landing', error);
    }
  }
}
