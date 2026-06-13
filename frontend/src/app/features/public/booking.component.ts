import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService, Tenant } from '../../core/services/tenants.service';
import { PublicBookingService } from '../../core/services/public-booking.service';
import { StoragePipe } from '../../shared/pipes/storage.pipe';
import { IconComponent } from '@shared/components/icon.component';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, StoragePipe, FormsModule, IconComponent],
  template: `
    <div
      class="public-booking-container"
      *ngIf="tenant(); else loadingOrError"
      [ngStyle]="brandStyles()"
    >
      <!-- Banner / Header -->
      <header class="banner-container">
        @if (tenant()?.bannerUrl) {
          <img
            [src]="tenant()!.bannerUrl | storage"
            class="absolute inset-0 w-full h-full object-cover"
            alt="Banner"
          />
        }
        <div class="absolute inset-0 bg-black/10"></div>
      </header>

      <!-- Business Info -->
      <section class="profile-section">
        <div class="profile-image-wrapper">
          @if (tenant()?.logoUrl) {
            <img
              [src]="tenant()!.logoUrl | storage"
              class="profile-image"
              alt="Logo"
            />
          } @else {
            <div class="profile-image placeholder-gradient">
              {{ tenant()?.name?.charAt(0) || 'A' }}
            </div>
          }
        </div>
        <h1 class="business-name">{{ tenant()!.name }}</h1>

        @if (tenant()?.phone || tenant()?.email || tenant()?.address) {
          <div class="business-contact-info">
            @if (tenant()?.phone) {
              <a [href]="'tel:' + tenant()!.phone" class="contact-item cursor-pointer">
                <app-icon name="call" style="font-variation-settings: 'FILL' 1, 'wght' 500, 'opsz' 20"></app-icon>
                <span>{{ tenant()!.phone }}</span>
              </a>
            }
            @if (tenant()?.email) {
              <a [href]="'mailto:' + tenant()!.email" class="contact-item cursor-pointer">
                <app-icon name="mail" style="font-variation-settings: 'FILL' 1, 'wght' 500, 'opsz' 20"></app-icon>
                <span>{{ tenant()!.email }}</span>
              </a>
            }
            @if (tenant()?.address) {
              <div class="contact-item">
                <app-icon name="pin_drop" style="font-variation-settings: 'FILL' 1, 'wght' 500, 'opsz' 20"></app-icon>
                <span>{{ tenant()!.address }}</span>
              </div>
            }
          </div>
        }
      </section>

      <!-- Stepper Nav (Only show if not success and not cancel mode) -->
      <nav class="stepper-nav" *ngIf="!success() && !isCancelMode()">
        @for (step of steps(); track step.id; let i = $index) {
          <div
            class="step-item"
            [class.active]="currentStep() === i + 1"
            [class.completed]="currentStep() > i + 1"
          >
            <span class="step-dot" *ngIf="currentStep() <= i + 1">{{
              i + 1
            }}</span>
            <span class="step-dot check" *ngIf="currentStep() > i + 1">✓</span>
            <span class="step-label">{{ step.label }}</span>
          </div>
          @if (i < steps().length - 1) {
            <span class="step-line"></span>
          }
        }
      </nav>

      <main class="booking-layout" *ngIf="!success(); else successState">
        <!-- Step Content -->
        <div class="step-content">
          <!-- CANCEL MODE: APPOINTMENT DETAILS CARD -->
          <div
            class="step-card animate-in fade-in duration-500"
            *ngIf="isCancelMode() && !isRescheduling()"
          >
            <div class="step-header">
              <span
                class="status-badge"
                [class]="appointment()?.status?.toLowerCase()"
              >
                {{
                  appointment()?.status === 'CANCELLED'
                    ? 'Cancelado'
                    : appointment()?.status === 'CONFIRMED'
                      ? 'Confirmado'
                      : 'Pendiente'
                }}
              </span>
              <h2 class="step-title mt-4">Detalles de tu Turno</h2>
              <p class="step-description">
                Aquí tienes la información sobre tu reserva.
              </p>
            </div>

            <div class="appointment-details-grid">
              <div class="detail-block">
                <span class="block-label">Cliente</span>
                <span class="block-value"
                  >{{ appointment()?.client?.firstName }}
                  {{ appointment()?.client?.lastName }}</span
                >
              </div>

              <div class="detail-block">
                <span class="block-label">Fecha y Hora</span>
                <span class="block-value highlight-value">
                  {{
                    appointment()?.startTime
                      | date: "EEEE d 'de' MMMM"
                      | titlecase
                  }}
                  a las {{ appointment()?.startTime | date: 'HH:mm' }} hs
                </span>
              </div>

              <div class="detail-block">
                <span class="block-label">Servicio</span>
                <span class="block-value"
                  >{{ appointment()?.service?.name }} ({{
                    appointment()?.service?.duration
                  }}
                  min)</span
                >
              </div>

              <div class="detail-block">
                <span class="block-label">Profesional</span>
                <span class="block-value"
                  >{{ appointment()?.professional?.firstName }}
                  {{ appointment()?.professional?.lastName }}</span
                >
              </div>

              <div class="detail-block">
                <span class="block-label">Sucursal / Ubicación</span>
                <span class="block-value"
                  >{{ appointment()?.branch?.name }} ({{
                    appointment()?.branch?.address
                  }})</span
                >
              </div>
            </div>

            <!-- Alerta de Límite de Tiempo Superado -->
            <div
              *ngIf="
                isActionTimeLimitPassed() &&
                appointment()?.status !== 'CANCELLED'
              "
              class="mt-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-text-main animate-in fade-in duration-300"
            >
              <div class="flex gap-3 items-start">
                <app-icon
                  name="warning"
                  class="text-yellow-500 text-xl shrink-0 mt-0.5"
                ></app-icon>
                <div class="flex flex-col gap-1">
                  <span class="font-bold text-sm text-text-main"
                    >Plazo de modificación vencido</span
                  >
                  <p class="text-xs text-text-muted leading-relaxed">
                    {{ timeLimitMessage() }}
                  </p>
                  <div
                    class="mt-3 text-xs text-text-main font-semibold flex flex-col gap-1.5 border-t border-border/30 pt-2.5"
                  >
                    <span
                      >Para cancelar o reprogramar este turno, comunícate
                      directamente con el negocio:</span
                    >
                    <div
                      class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 font-medium text-text-muted"
                    >
                      <span
                        class="flex items-center gap-1.5"
                        *ngIf="appointment()?.tenant?.phone"
                      >
                        <app-icon
                          name="call"
                          class="text-sm text-primary"
                        ></app-icon>
                        {{ appointment()?.tenant?.phone }}
                      </span>
                      <span
                        class="flex items-center gap-1.5"
                        *ngIf="appointment()?.tenant?.email"
                      >
                        <app-icon
                          name="mail"
                          class="text-sm text-primary"
                        ></app-icon>
                        {{ appointment()?.tenant?.email }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div
              class="step-footer mt-8 flex flex-col sm:flex-row gap-4"
              *ngIf="
                appointment()?.status !== 'CANCELLED' &&
                !isActionTimeLimitPassed()
              "
            >
              <button
                class="btn-danger flex-1 cursor-pointer"
                [disabled]="isBooking()"
                (click)="cancelAppointment()"
              >
                <span *ngIf="!isBooking()">Cancelar Turno</span>
                <div class="spinner-sm white" *ngIf="isBooking()"></div>
              </button>

              <button
                class="btn-primary outline flex-1 cursor-pointer"
                *ngIf="appointment()?.tenant?.allowReschedule"
                (click)="startRescheduling()"
              >
                Reprogramar Turno
              </button>
            </div>

            <div
              class="step-footer mt-8 justify-center"
              *ngIf="
                appointment()?.status === 'CANCELLED' ||
                (appointment()?.status !== 'CANCELLED' &&
                  isActionTimeLimitPassed())
              "
            >
              <button
                class="btn-primary w-full cursor-pointer"
                (click)="goBackToBusiness()"
              >
                Agendar nuevo turno
              </button>
            </div>
          </div>

          <!-- Step: Sucursal (Normal Mode) -->
          <div
            class="step-card animate-in fade-in slide-in-from-bottom-4 duration-500"
            *ngIf="!isCancelMode() && currentStepId() === 'branch'"
          >
            <div class="step-header">
              <h2 class="step-title">¿A qué sucursal quieres ir?</h2>
              <p class="step-description">
                Elige el local que más te convenga.
              </p>
            </div>
            <div class="grid gap-4">
              @for (branch of availableBranches(); track branch.id) {
                <div
                  class="option-card"
                  [class.selected]="selectedBranch()?.id === branch.id"
                  (click)="selectBranch(branch)"
                >
                  <div class="option-info">
                    <span class="option-icon">📍</span>
                    <div>
                      <div class="option-name">{{ branch.name }}</div>
                      <div class="option-sub">{{ branch.address }}</div>
                    </div>
                  </div>
                </div>
              }
            </div>
            <div class="step-footer">
              <button
                class="btn-primary"
                [disabled]="!selectedBranch()"
                (click)="nextStep()"
              >
                Continuar
              </button>
            </div>
          </div>

          <!-- Step: Servicios (Normal Mode) -->
          <div
            class="step-card animate-in fade-in slide-in-from-bottom-4 duration-500"
            *ngIf="!isCancelMode() && currentStepId() === 'services'"
          >
            <div class="step-header">
              <h2 class="step-title">¿Qué servicio necesitas?</h2>
              <p class="step-description">
                Selecciona una de nuestras opciones para continuar.
              </p>
            </div>

            <div class="service-list">
              @for (service of availableServices(); track service.id) {
                <div
                  class="service-item"
                  [class.selected]="selectedService()?.id === service.id"
                  [class.expanded]="expandedServiceId() === service.id"
                  (click)="selectService(service)"
                >
                  <div class="service-main-row">
                    <div class="service-info">
                      <div class="service-icon-wrapper">
                        @if (service.mainImageKey) {
                          <img
                            [src]="service.mainImageKey | storage"
                            class="service-image-thumb"
                            alt="Thumbnail"
                          />
                        } @else {
                          <div
                            class="service-icon"
                            [style.background-color]="
                              (service.color || '#6366f1') + '20'
                            "
                          >
                            <span [style.color]="service.color || '#6366f1'"
                              >★</span
                            >
                          </div>
                        }
                      </div>
                      <div>
                        <div class="service-name">{{ service.name }}</div>
                        @if (service.showDuration !== false) {
                          <div class="service-duration">
                            {{ service.duration }} min
                          </div>
                        }
                      </div>
                    </div>

                    <div class="service-price-and-action">
                      @if (service.showPrice !== false) {
                        <div class="service-price">\${{ service.price }}</div>
                      } @else if (service.customPriceLabel) {
                        <div class="service-price-label">
                          {{ service.customPriceLabel }}
                        </div>
                      }

                      @if (
                        service.description ||
                        service.indications ||
                        (service.galleryKeys && service.galleryKeys.length > 0)
                      ) {
                        <button
                          class="btn-expand-info"
                          [class.active]="expandedServiceId() === service.id"
                          (click)="toggleExpandService(service.id, $event)"
                        >
                          <app-icon
                            [name]="
                              expandedServiceId() === service.id
                                ? 'expand_less'
                                : 'info'
                            "
                          ></app-icon>
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Collapsible Details Panel -->
                  @if (expandedServiceId() === service.id) {
                    <div
                      class="service-details-panel"
                      (click)="$event.stopPropagation()"
                    >
                      @if (service.description) {
                        <p class="service-details-description">
                          {{ service.description }}
                        </p>
                      }

                      @if (
                        false && service.includes && service.includes.length > 0
                      ) {
                        <div class="service-includes-section">
                          <span class="section-title">¿Qué incluye?</span>
                          <div class="includes-chips">
                            @for (item of service.includes; track item) {
                              <span class="include-chip">
                                <app-icon
                                  name="check"
                                  class="chip-check-icon"
                                ></app-icon>
                                {{ item }}
                              </span>
                            }
                          </div>
                        </div>
                      }

                      @if (service.indications) {
                        <div class="service-indications-box">
                          <app-icon
                            name="warning"
                            class="indication-icon"
                          ></app-icon>
                          <div class="indication-content">
                            <span class="indication-title"
                              >Requisitos / Indicaciones</span
                            >
                            <p class="indication-text">
                              {{ service.indications }}
                            </p>
                          </div>
                        </div>
                      }

                      @if (
                        service.galleryKeys && service.galleryKeys.length > 0
                      ) {
                        <div class="service-gallery-section">
                          <span class="section-title">Galería de fotos</span>
                          <div class="gallery-scroll-container">
                            @for (imgKey of service.galleryKeys; track imgKey) {
                              <div
                                class="gallery-thumb-wrapper"
                                (click)="openImageZoom(imgKey, $event)"
                              >
                                <img
                                  [src]="imgKey | storage"
                                  class="gallery-thumb"
                                  alt="Gallery image"
                                />
                                <div class="gallery-thumb-hover">
                                  <app-icon name="zoom_in"></app-icon>
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
            <div class="step-footer">
              <button
                class="btn-back"
                *ngIf="currentStep() > 1"
                (click)="prevStep()"
              >
                Volver
              </button>
              <button
                class="btn-primary"
                [disabled]="!selectedService()"
                (click)="nextStep()"
              >
                Continuar
              </button>
            </div>
          </div>

          <!-- Step: Profesional (Normal Mode) -->
          <div
            class="step-card animate-in fade-in slide-in-from-bottom-4 duration-500"
            *ngIf="!isCancelMode() && currentStepId() === 'professional'"
          >
            <div class="step-header">
              <h2 class="step-title">¿Con quién quieres atenderte?</h2>
              <p class="step-description">
                Nuestros profesionales están listos para ayudarte.
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (prof of availableProfessionals(); track prof.id) {
                <div
                  class="professional-card"
                  [class.selected]="selectedProfessional()?.id === prof.id"
                  (click)="selectProfessional(prof)"
                >
                  <div class="prof-photo-wrapper">
                    <img
                      *ngIf="prof.photoUrl"
                      [src]="prof.photoUrl | storage"
                      class="prof-photo"
                    />
                    <div *ngIf="!prof.photoUrl" class="prof-photo placeholder">
                      {{ prof.firstName.charAt(0)
                      }}{{ prof.lastName.charAt(0) }}
                    </div>
                  </div>
                  <div class="prof-name">
                    {{ prof.firstName }} {{ prof.lastName }}
                  </div>
                </div>
              }
            </div>
            <div class="step-footer">
              <button class="btn-back" (click)="prevStep()">Volver</button>
              <button
                class="btn-primary"
                [disabled]="!selectedProfessional()"
                (click)="nextStep()"
              >
                Continuar
              </button>
            </div>
          </div>

          <!-- Step: Schedule / Rescheduling (Fecha y Horario - Reused in both flows) -->
          <div
            class="step-card animate-in fade-in slide-in-from-bottom-4 duration-500"
            *ngIf="
              currentStepId() === 'schedule' ||
              (isCancelMode() && isRescheduling())
            "
          >
            <div class="step-header">
              <h2 class="step-title">
                {{
                  isCancelMode()
                    ? 'Reprogramar Turno'
                    : '¿Cuándo quieres venir?'
                }}
              </h2>
              <p class="step-description">
                Selecciona el día y luego el horario que prefieras.
              </p>
            </div>

            <div class="schedule-container">
              <!-- Custom Calendar -->
              <div class="calendar-card">
                <div class="calendar-header">
                  <button (click)="prevMonth()" class="calendar-nav-btn">
                    ‹
                  </button>
                  <h3 class="current-month">
                    {{
                      currentMonth() | date: 'MMMM yyyy' : '' : 'es' | titlecase
                    }}
                  </h3>
                  <button (click)="nextMonth()" class="calendar-nav-btn">
                    ›
                  </button>
                </div>
                <div class="calendar-grid">
                  <div class="weekday">Dom</div>
                  <div class="weekday">Lun</div>
                  <div class="weekday">Mar</div>
                  <div class="weekday">Mié</div>
                  <div class="weekday">Jue</div>
                  <div class="weekday">Vie</div>
                  <div class="weekday">Sáb</div>

                  @for (
                    day of calendarDays();
                    track day.day + '-' + day.month + '-' + day.year
                  ) {
                    <button
                      class="day-cell"
                      [class.padding]="day.isPadding"
                      [class.today]="day.isToday"
                      [class.selected]="
                        selectedDate()?.getTime() === day.date?.getTime()
                      "
                      [class.unavailable]="
                        !isDayAvailable(day) && !day.isPadding && !day.isPast
                      "
                      [class.past]="day.isPast"
                      [disabled]="
                        day.isPadding ||
                        day.isPast ||
                        (!isDayAvailable(day) && !day.isPadding)
                      "
                      (click)="day.date && selectDate(day.date)"
                    >
                      {{ day.day }}
                    </button>
                  }
                </div>
              </div>

              <!-- Time Slots -->
              <div class="slots-card">
                <div class="slots-header" *ngIf="selectedDate()">
                  <h3 class="slots-title">
                    Horarios para el {{ selectedDate() | date: 'dd/MM' }}
                  </h3>
                </div>

                <div class="slots-placeholder" *ngIf="!selectedDate()">
                  <span class="text-3xl mb-2">👈</span>
                  <p>Selecciona un día del calendario</p>
                </div>

                <div class="loading-slots" *ngIf="loadingSlots()">
                  <div class="spinner-sm"></div>
                  <span>Buscando...</span>
                </div>

                <div
                  class="slots-grid"
                  *ngIf="selectedDate() && !loadingSlots()"
                >
                  @for (slot of availableSlots(); track slot.time) {
                    <button
                      class="time-button"
                      [class.selected]="selectedTime() === slot.time"
                      [class.unavailable]="!slot.available"
                      [disabled]="!slot.available"
                      (click)="slot.available && selectedTime.set(slot.time)"
                    >
                      {{ slot.time }}
                    </button>
                  } @empty {
                    <div class="empty-slots" *ngIf="!loadingSlots()">
                      <p>Sin disponibilidad</p>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="step-footer">
              @if (isCancelMode() && isRescheduling()) {
                <button
                  class="btn-back cursor-pointer"
                  (click)="cancelRescheduling()"
                >
                  Cancelar
                </button>
                <button
                  class="btn-primary cursor-pointer"
                  [disabled]="!selectedDate() || !selectedTime() || isBooking()"
                  (click)="confirmBooking()"
                >
                  <span *ngIf="!isBooking()">Confirmar Cambio</span>
                  <div class="spinner-sm white" *ngIf="isBooking()"></div>
                </button>
              } @else {
                <button class="btn-back" (click)="prevStep()">Volver</button>
                <button
                  class="btn-primary"
                  [disabled]="!selectedDate() || !selectedTime()"
                  (click)="nextStep()"
                >
                  Continuar
                </button>
              }
            </div>
          </div>

          <!-- Step: Datos Personales (Normal Mode) -->
          <div
            class="step-card animate-in fade-in slide-in-from-bottom-4 duration-500"
            *ngIf="!isCancelMode() && currentStepId() === 'personal'"
          >
            <div class="step-header">
              <h2 class="step-title">Ya casi estamos</h2>
              <p class="step-description">
                Completa tus datos para finalizar la reserva.
              </p>
            </div>

            <div class="form-container">
              <div class="input-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  [(ngModel)]="clientName"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    [(ngModel)]="clientEmail"
                    placeholder="tu@email.com"
                  />
                </div>
                <div class="input-group">
                  <label>Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    [(ngModel)]="clientPhone"
                    placeholder="Ej: +54 9 351 ..."
                  />
                </div>
              </div>
            </div>
            <div class="step-footer">
              <button class="btn-back" (click)="prevStep()">Volver</button>
              <button
                class="btn-primary cursor-pointer"
                [disabled]="!canContinue() || isBooking()"
                (click)="confirmBooking()"
              >
                <span *ngIf="!isBooking()">Confirmar Reserva</span>
                <div class="spinner-sm white" *ngIf="isBooking()"></div>
              </button>
            </div>
          </div>
        </div>

        <!-- Summary Sidebar (Visible on Desktop) -->
        <aside class="summary-sidebar">
          <div class="summary-card">
            <h3 class="summary-title">
              {{ isCancelMode() ? 'Resumen de Cita' : 'Resumen' }}
            </h3>

            <div class="summary-details">
              <!-- Sucursal -->
              <div class="summary-item" *ngIf="selectedBranch()">
                <div class="summary-icon">📍</div>
                <div class="flex flex-col">
                  <span class="summary-label">Ubicación</span>
                  <span class="summary-value">{{
                    selectedBranch()!.name
                  }}</span>
                </div>
              </div>

              <!-- Servicio -->
              <div
                class="summary-item align-items-center"
                *ngIf="selectedService()"
              >
                <div class="summary-service-icon-wrapper">
                  @if (selectedService()!.mainImageKey) {
                    <img
                      [src]="selectedService()!.mainImageKey | storage"
                      class="summary-service-image-thumb"
                      alt="Service thumbnail"
                    />
                  } @else {
                    <div
                      class="summary-icon"
                      [style.background-color]="
                        (selectedService()!.color || '#6366f1') + '20'
                      "
                    >
                      <span
                        [style.color]="selectedService()!.color || '#6366f1'"
                        >★</span
                      >
                    </div>
                  }
                </div>
                <div class="flex flex-col">
                  <span class="summary-label">Servicio</span>
                  <span class="summary-value">{{
                    selectedService()!.name
                  }}</span>
                </div>
              </div>

              <!-- Profesional -->
              <div class="summary-item" *ngIf="selectedProfessional()">
                <div class="summary-icon">👤</div>
                <div class="flex flex-col">
                  <span class="summary-label">Profesional</span>
                  <span class="summary-value"
                    >{{ selectedProfessional()!.firstName }}
                    {{ selectedProfessional()!.lastName }}</span
                  >
                </div>
              </div>

              <!-- Fecha y Hora -->
              <div class="grid grid-cols-2 gap-4 mt-2">
                <div class="summary-item">
                  <div class="summary-icon">📅</div>
                  <div class="flex flex-col">
                    <span class="summary-label">Fecha</span>
                    <span class="summary-value">
                      {{
                        selectedDate() ||
                          (isCancelMode() ? appointment()?.startTime : null)
                          | date: 'dd/MM/yy'
                      }}
                    </span>
                  </div>
                </div>
                <div class="summary-item">
                  <div class="summary-icon">🕒</div>
                  <div class="flex flex-col">
                    <span class="summary-label">Hora</span>
                    <span class="summary-value">
                      {{
                        selectedTime() ||
                          (isCancelMode()
                            ? (appointment()?.startTime | date: 'HH:mm')
                            : '--')
                      }}
                      hs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="summary-footer"
              *ngIf="
                selectedService() &&
                (selectedService()!.showPrice !== false ||
                  selectedService()!.customPriceLabel)
              "
            >
              <div class="total-price">
                <span>Total</span>
                @if (selectedService()!.showPrice !== false) {
                  <span class="price">\${{ selectedService()!.price }}</span>
                } @else {
                  <span class="price-label">{{
                    selectedService()!.customPriceLabel
                  }}</span>
                }
              </div>
            </div>
          </div>
        </aside>
      </main>

      <!-- SUCCESS STATES -->
      <ng-template #successState>
        <div class="success-container animate-in fade-in zoom-in duration-700">
          <div class="success-card">
            <!-- Cancel Mode Success: CANCELLED -->
            @if (isCancelMode() && appointment()?.status === 'CANCELLED') {
              <div class="success-icon-wrapper danger">
                <div class="success-icon">🚫</div>
              </div>
              <h2 class="success-title">Turno Cancelado</h2>
              <p class="success-message">
                Tu turno para
                <strong>{{ appointment()?.service?.name }}</strong> en
                <strong>{{ appointment()?.tenant?.name }}</strong> ha sido
                cancelado con éxito.
              </p>

              <div class="success-actions mt-6">
                <button
                  (click)="goToHome()"
                  class="btn-primary w-full cursor-pointer"
                >
                  Agendar nuevo turno
                </button>
              </div>
            }

            <!-- Cancel Mode Success: RESCHEDULED -->
            @else if (isCancelMode() && appointment()?.status !== 'CANCELLED') {
              <div class="success-icon-wrapper">
                <div class="success-icon">✓</div>
              </div>
              <h2 class="success-title">Turno Reprogramado</h2>
              <p class="success-message">
                Tu reserva ha sido reprogramada con éxito. Te enviamos la
                confirmación del nuevo horario.
              </p>

              <div class="success-details">
                <div class="detail-row">
                  <span>Nueva Fecha</span>
                  <strong>{{
                    appointment()?.startTime | date: 'fullDate' : '' : 'es'
                  }}</strong>
                </div>
                <div class="detail-row">
                  <span>Nuevo Horario</span>
                  <strong
                    >{{ appointment()?.startTime | date: 'HH:mm' }} hs</strong
                  >
                </div>
                <div class="detail-row">
                  <span>Profesional</span>
                  <strong
                    >{{ appointment()?.professional?.firstName }}
                    {{ appointment()?.professional?.lastName }}</strong
                  >
                </div>
                <div class="detail-row">
                  <span>Ubicación</span>
                  <strong
                    >{{ appointment()?.branch?.name }} -
                    {{ appointment()?.branch?.address }}</strong
                  >
                </div>
              </div>

              <div class="success-actions">
                <button
                  (click)="goToHome()"
                  class="btn-primary w-full cursor-pointer"
                >
                  Volver al inicio
                </button>
              </div>
            }

            <!-- Normal Mode Success: BOOKED -->
            @else {
              <div class="success-icon-wrapper">
                <div class="success-icon">✓</div>
              </div>
              <h2 class="success-title">¡Turno Agendado!</h2>
              <p class="success-message">
                Hola <strong>{{ clientName() }}</strong
                >, tu reserva para
                <strong>{{ selectedService()?.name }}</strong> ha sido
                confirmada.
              </p>

              <div class="success-details">
                <div class="detail-row">
                  <span>Fecha</span>
                  <strong>{{
                    selectedDate() | date: 'fullDate' : '' : 'es'
                  }}</strong>
                </div>
                <div class="detail-row">
                  <span>Horario</span>
                  <strong>{{ selectedTime() }} hs</strong>
                </div>
                <div class="detail-row">
                  <span>Lugar</span>
                  <strong *ngIf="selectedBranch()"
                    >{{ selectedBranch()!.name
                    }}{{
                      selectedBranch()!.address
                        ? ' - ' + selectedBranch()!.address
                        : ''
                    }}</strong
                  >
                </div>
                <div class="detail-row">
                  <span>Atendido por</span>
                  <strong
                    >{{ selectedProfessional()?.firstName }}
                    {{ selectedProfessional()?.lastName }}</strong
                  >
                </div>
              </div>

              <div class="success-actions">
                <button
                  (click)="goToHome()"
                  class="btn-text w-full cursor-pointer"
                >
                  Agendar otro turno
                </button>
              </div>
            }
          </div>
        </div>
      </ng-template>

      <!-- Fullscreen Image Zoom Overlay -->
      @if (zoomImageKey()) {
        <div class="image-zoom-overlay" (click)="closeImageZoom()">
          <div class="zoom-modal-container" (click)="$event.stopPropagation()">
            <button class="zoom-close-btn" (click)="closeImageZoom()">
              <app-icon name="close"></app-icon>
            </button>
            <img
              [src]="zoomImageKey()! | storage"
              class="zoom-large-image"
              alt="Zoomed service photo"
            />
          </div>
        </div>
      }
    </div>

    <ng-template #loadingOrError>
      <div
        class="public-booking-container min-h-screen flex flex-col items-center justify-center p-4"
        [ngStyle]="brandStyles()"
      >
        <div *ngIf="loading()" class="flex flex-col items-center gap-6">
          <div class="loader-ripple">
            <div></div>
            <div></div>
          </div>
          <p class="text-text-muted font-medium">Cargando...</p>
        </div>

        <div
          *ngIf="!loading() && error()"
          class="text-center space-y-4 max-w-sm"
        >
          <span class="text-7xl block mb-6">🏜️</span>
          <h2 class="text-2xl font-bold text-text-main">
            No pudimos encontrar tu reserva
          </h2>
          <p class="text-text-muted">
            {{
              isCancelMode()
                ? 'No pudimos encontrar los detalles de tu turno. Es posible que el link sea incorrecto o haya expirado.'
                : 'El link que ingresaste no es válido o el negocio ya no está disponible.'
            }}
          </p>
          <button (click)="goToHome()" class="btn-primary !mt-8 cursor-pointer">
            Ir al Inicio
          </button>
        </div>
      </div>
    </ng-template>

    <style>
      .time-button.selected {
        background: var(--booking-primary);
        border-color: var(--booking-primary);
        color: white;
        transform: scale(1.05);
        box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
      }

      .time-button.unavailable {
        opacity: 0.4;
        text-decoration: line-through;
        cursor: not-allowed;
        background: color-mix(in srgb, var(--booking-border), transparent 50%);
        border-style: dashed;
      }
    </style>
  `,
  styles: [
    `
      .public-booking-container {
        /* Dynamic theme variables mapping */
        --booking-primary: var(--color-primary, #6366f1);
        --booking-primary-hover: var(--color-primary-hover, #4f46e5);
        --booking-accent: var(--color-accent, #a855f7);
        --booking-bg: var(--color-bg-primary, #0a0b14);
        --booking-text-main: var(--color-text-main, #f8fafc);

        /* Derived tokens */
        --booking-primary-soft: color-mix(
          in srgb,
          var(--booking-primary),
          transparent 90%
        );
        --booking-text-muted: color-mix(
          in srgb,
          var(--booking-text-main),
          transparent 30%
        );
        --booking-surface: color-mix(
          in srgb,
          var(--booking-bg),
          var(--booking-text-main) 4%
        );
        --booking-border: color-mix(
          in srgb,
          var(--booking-bg),
          var(--booking-text-main) 10%
        );

        --booking-radius-lg: 1.5rem;
        --booking-radius-md: 1rem;
        --booking-shadow:
          0 10px 25px -5px rgba(0, 0, 0, 0.1),
          0 8px 10px -6px rgba(0, 0, 0, 0.1);

        min-height: 100vh;
        background-color: var(--booking-bg);
        color: var(--booking-text-main);
        font-family:
          'Inter',
          system-ui,
          -apple-system,
          sans-serif;
        overflow-x: hidden;
      }

      /* Banner */
      .banner-container {
        height: 200px;
        background: linear-gradient(
          135deg,
          var(--booking-primary),
          var(--booking-accent)
        );
        position: relative;
        overflow: hidden;
      }

      .banner-container::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at 70% 30%,
          rgba(255, 255, 255, 0.15),
          transparent 70%
        );
      }

      /* Business Header */
      .profile-section {
        max-width: 1100px;
        margin: -60px auto 0;
        padding: 0 2rem;
        position: relative;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .profile-image-wrapper {
        width: 120px;
        height: 120px;
        background: var(--booking-surface);
        border-radius: 30%;
        padding: 4px;
        border: 4px solid var(--booking-bg);
        box-shadow: var(--booking-shadow);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .profile-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: calc(30% - 4px);
      }

      .placeholder-gradient {
        background: linear-gradient(
          135deg,
          var(--booking-primary),
          var(--booking-accent)
        );
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 3rem;
        font-weight: 800;
      }

      .business-name {
        margin-top: 1.5rem;
        font-size: 2.25rem;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .business-contact-info {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.75rem;
        margin-top: 1rem;
        max-width: 600px;
        padding: 0 1rem;
      }

      .contact-item {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: color-mix(in srgb, var(--booking-surface), transparent 30%);
        border: 1px solid var(--booking-border);
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--booking-text-muted);
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: default;
      }

      a.contact-item {
        cursor: pointer;
      }

      a.contact-item:hover {
        border-color: var(--booking-primary);
        color: var(--booking-text-main);
        background: var(--booking-primary-soft);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      a.contact-item:active {
        transform: scale(0.95);
      }

      .contact-item app-icon {
        font-size: 1.125rem;
        display: flex;
        align-items: center;
        color: var(--booking-primary);
        transition: color 0.3s ease;
      }

      a.contact-item:hover app-icon {
        color: var(--booking-primary-hover);
      }

      /* Stepper */
      .stepper-nav {
        max-width: 800px;
        margin: 3rem auto;
        padding: 0 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
      }

      .step-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        position: relative;
        z-index: 2;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .step-dot {
        width: 36px;
        height: 36px;
        background: var(--booking-surface);
        border: 2px solid var(--booking-border);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.875rem;
        color: var(--booking-text-muted);
        transition: all 0.3s ease;
      }

      .step-item.active .step-dot {
        background: var(--booking-primary);
        border-color: var(--booking-primary);
        color: white;
        box-shadow: 0 0 0 4px var(--booking-primary-soft);
        transform: scale(1.1);
      }

      .step-item.completed .step-dot {
        background: var(--booking-accent);
        border-color: var(--booking-accent);
        color: white;
      }

      .step-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--booking-text-muted);
      }

      .step-item.active .step-label {
        color: var(--booking-primary);
      }

      .step-line {
        flex: 1;
        height: 2px;
        background: var(--booking-border);
        margin: 0 -20px;
        margin-top: -24px;
        z-index: 1;
      }

      /* Layout */
      .booking-layout {
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 2rem 5rem;
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 3rem;
        align-items: start;
      }

      @media (max-width: 968px) {
        .booking-layout {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
      }

      /* Cards */
      .step-card {
        background: var(--booking-surface);
        border-radius: var(--booking-radius-lg);
        border: 1px solid var(--booking-border);
        padding: 2rem 3rem 3rem;
        box-shadow: var(--booking-shadow);
        display: flex;
        flex-direction: column;
      }

      .step-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding-top: 2rem;
        margin-top: 2rem;
        border-top: 1px solid var(--booking-border);
      }

      @media (max-width: 768px) {
        .step-card {
          padding: 1.5rem;
        }
        .step-footer {
          justify-content: space-between;
        }
        .step-footer button {
          flex: 1;
        }
      }

      .step-header {
        margin-bottom: 2.5rem;
      }

      .step-title {
        font-size: 1.75rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin-bottom: 0.5rem;
      }

      .step-description {
        color: var(--booking-text-muted);
        font-size: 1rem;
      }

      /* Option and Professional Cards */
      .option-card,
      .professional-card {
        display: flex;
        align-items: center;
        padding: 1.5rem;
        background: var(--booking-bg);
        border-radius: var(--booking-radius-md);
        border: 1px solid var(--booking-border);
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .option-card:hover,
      .professional-card:hover {
        border-color: var(--booking-primary);
        transform: translateY(-2px);
      }

      .option-card.selected,
      .professional-card.selected {
        border-color: var(--booking-primary);
        background: var(--booking-primary-soft);
        border-width: 2px;
      }

      .option-info {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }

      .option-icon {
        font-size: 1.5rem;
      }

      .option-name {
        font-weight: 700;
        font-size: 1.1rem;
      }

      .option-sub {
        font-size: 0.875rem;
        color: var(--booking-text-muted);
      }

      .professional-card {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .prof-photo-wrapper {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid var(--booking-border);
        transition: all 0.2s;
      }

      .professional-card.selected .prof-photo-wrapper {
        border-color: var(--booking-primary);
      }

      .prof-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .prof-photo.placeholder {
        background: linear-gradient(
          135deg,
          var(--booking-primary),
          var(--booking-accent)
        );
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 1.5rem;
      }

      .prof-name {
        font-weight: 700;
        font-size: 1rem;
      }

      /* Service Card List */
      .service-list {
        display: grid;
        gap: 1.25rem;
      }

      .service-item {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 1.5rem;
        background: var(--booking-bg);
        border-radius: var(--booking-radius-md);
        border: 1px solid var(--booking-border);
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .service-item:hover {
        border-color: var(--booking-primary);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .service-item:hover:not(.expanded) {
        transform: translateX(4px);
      }

      .service-item.selected {
        border-color: var(--booking-primary);
        background: var(--booking-primary-soft);
        border-width: 2px;
      }

      .service-main-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      .service-info {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }

      .service-icon-wrapper {
        width: 50px;
        height: 50px;
        border-radius: 14px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--booking-surface);
        border: 1px solid var(--booking-border);
        flex-shrink: 0;
      }

      .service-image-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .service-icon {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }

      .service-name {
        font-weight: 700;
        font-size: 1.1rem;
      }

      .service-duration {
        font-size: 0.875rem;
        color: var(--booking-text-muted);
      }

      .service-price-and-action {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .service-price {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--booking-primary);
      }

      .service-price-label {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--booking-text-muted);
      }

      .btn-expand-info {
        background: transparent;
        border: none;
        color: var(--booking-text-muted);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-expand-info:hover {
        background: var(--booking-primary-soft);
        color: var(--booking-primary);
      }

      .btn-expand-info.active {
        color: var(--booking-primary);
        background: var(--booking-primary-soft);
      }

      /* Collapsible Details Panel */
      .service-details-panel {
        margin-top: 1.25rem;
        padding-top: 1.25rem;
        border-top: 1px solid var(--booking-border);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .service-details-description {
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--booking-text-muted);
        margin: 0;
      }

      .service-includes-section,
      .service-gallery-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .section-title {
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--booking-text-muted);
        letter-spacing: 0.05em;
      }

      .includes-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .include-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.35rem 0.75rem;
        background: var(--booking-surface);
        border: 1px solid var(--booking-border);
        border-radius: 9999px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--booking-text-main);
      }

      .chip-check-icon {
        font-size: 1rem;
        color: #10b981;
      }

      /* Indications box */
      .service-indications-box {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        background: rgba(245, 158, 11, 0.08);
        border: 1px solid rgba(245, 158, 11, 0.25);
        border-radius: 12px;
      }

      .indication-icon {
        font-size: 1.25rem;
        color: #f59e0b;
        flex-shrink: 0;
        margin-top: 0.125rem;
      }

      .indication-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .indication-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #f59e0b;
      }

      .indication-text {
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--booking-text-muted);
        margin: 0;
      }

      /* Gallery Scroll */
      .gallery-scroll-container {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        padding-bottom: 0.5rem;
        scrollbar-width: thin;
        scrollbar-color: var(--booking-border) transparent;
      }

      .gallery-scroll-container::-webkit-scrollbar {
        height: 6px;
      }

      .gallery-scroll-container::-webkit-scrollbar-track {
        background: transparent;
      }

      .gallery-scroll-container::-webkit-scrollbar-thumb {
        background-color: var(--booking-border);
        border-radius: 3px;
      }

      .gallery-thumb-wrapper {
        position: relative;
        width: 120px;
        height: 90px;
        border-radius: 10px;
        overflow: hidden;
        flex-shrink: 0;
        cursor: zoom-in;
        border: 1px solid var(--booking-border);
        transition:
          transform 0.2s ease,
          border-color 0.2s ease;
      }

      .gallery-thumb-wrapper:hover {
        transform: scale(1.03);
        border-color: var(--booking-primary);
      }

      .gallery-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .gallery-thumb-hover {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .gallery-thumb-wrapper:hover .gallery-thumb-hover {
        opacity: 1;
      }

      .gallery-thumb-hover app-icon {
        color: white;
        font-size: 1.5rem;
      }

      /* Fullscreen Zoom overlay */
      .image-zoom-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        animation: fadeIn 0.25s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .zoom-modal-container {
        position: relative;
        max-width: 90vw;
        max-height: 85vh;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        animation: zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes zoomIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .zoom-large-image {
        max-width: 100%;
        max-height: 85vh;
        object-fit: contain;
      }

      .zoom-close-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 10;
      }

      .zoom-close-btn:hover {
        background: rgba(0, 0, 0, 0.8);
        transform: scale(1.05);
      }

      .zoom-close-btn app-icon {
        font-size: 1.5rem;
      }

      /* Summary Card custom icon styling */
      .summary-service-icon-wrapper {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--booking-surface);
        border: 1px solid var(--booking-border);
        flex-shrink: 0;
      }

      .summary-service-image-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .align-items-center {
        align-items: center;
      }

      /* Date Selection */
      .date-input {
        width: 100%;
        padding: 1.5rem;
        background: var(--booking-bg);
        border: 1px solid var(--booking-border);
        border-radius: var(--booking-radius-md);
        color: var(--booking-text-main);
        font-size: 1.1rem;
        outline: none;
        transition: border-color 0.2s;
      }

      .date-input:focus {
        border-color: var(--booking-primary);
      }

      .info-card {
        padding: 1.5rem;
        background: var(--booking-primary-soft);
        border-radius: var(--booking-radius-md);
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .info-text {
        color: var(--booking-primary);
        font-weight: 600;
        font-size: 0.9rem;
      }

      /* Time Buttons */
      .time-button {
        padding: 1rem;
        background: var(--booking-bg);
        border: 1px solid var(--booking-border);
        border-radius: 12px;
        font-weight: 700;
        color: var(--booking-text-main);
        transition: all 0.2s;
      }

      .time-button:hover:not(.selected) {
        border-color: var(--booking-primary);
        background: var(--booking-primary-soft);
      }

      .time-button.selected {
        background: var(--booking-primary);
        border-color: var(--booking-primary);
        color: white;
        transform: scale(1.05);
        box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
      }

      /* Form Container */
      .form-container {
        display: grid;
        gap: 1.5rem;
      }

      .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .input-group label {
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--booking-text-muted);
        letter-spacing: 0.05em;
      }

      .input-group input {
        padding: 1.25rem;
        background: var(--booking-bg);
        border: 1px solid var(--booking-border);
        border-radius: 12px;
        color: var(--booking-text-main);
        font-size: 1rem;
        outline: none;
        transition: all 0.2s;
      }

      .input-group input:focus {
        border-color: var(--booking-primary);
        box-shadow: 0 0 0 4px var(--booking-primary-soft);
      }

      /* Summary Card */
      .summary-card {
        background: var(--booking-surface);
        border-radius: var(--booking-radius-lg);
        border: 1px solid var(--booking-border);
        padding: 2.5rem;
        box-shadow: var(--booking-shadow);
        position: sticky;
        top: 2rem;
      }

      .summary-title {
        font-size: 1.5rem;
        font-weight: 800;
        margin-bottom: 2rem;
        letter-spacing: -0.02em;
      }

      .summary-details {
        display: grid;
        gap: 1rem;
      }

      .summary-item {
        display: flex;
        gap: 1rem;
        padding: 1.25rem;
        background: var(--booking-bg);
        border-radius: 16px;
      }

      .summary-icon {
        width: 44px;
        height: 44px;
        background: var(--booking-surface);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }

      .summary-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        font-weight: 800;
        color: var(--booking-text-muted);
        letter-spacing: 0.05em;
      }

      .summary-value {
        font-size: 0.95rem;
        font-weight: 700;
      }

      .summary-footer {
        margin-top: 2.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .total-price {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
        border-top: 1px dashed var(--booking-border);
        font-weight: 800;
        font-size: 1.1rem;
      }

      .total-price .price {
        font-size: 1.75rem;
        color: var(--booking-primary);
      }

      .total-price .price-label {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--booking-text-muted);
      }

      /* Buttons */
      .btn-primary {
        background: var(--booking-primary);
        color: white;
        padding: 1.25rem;
        border-radius: 16px;
        font-weight: 800;
        font-size: 1.1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
      }

      .btn-primary:hover:not(:disabled) {
        background: var(--booking-primary-hover);
        transform: translateY(-2px);
        box-shadow: 0 15px 30px -10px rgba(99, 102, 241, 0.5);
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary.outline {
        background: transparent;
        border: 2px solid var(--booking-primary);
        color: var(--booking-primary);
        box-shadow: none;
      }

      .btn-back {
        background: transparent;
        color: var(--booking-text-muted);
        font-weight: 700;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .btn-text {
        background: transparent;
        color: var(--booking-primary);
        font-weight: 700;
        font-size: 1rem;
        padding: 0.5rem;
      }

      /* Success State */
      .success-container {
        max-width: 600px;
        margin: 2rem auto;
        padding: 0 2rem 5rem;
      }

      .success-card {
        background: var(--booking-surface);
        border-radius: var(--booking-radius-lg);
        padding: 4rem 3rem;
        text-align: center;
        border: 1px solid var(--booking-border);
        box-shadow: var(--booking-shadow);
      }

      .success-icon-wrapper {
        width: 100px;
        height: 100px;
        background: #10b98120;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 2.5rem;
      }

      .success-icon {
        width: 60px;
        height: 60px;
        background: #10b981;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: 900;
      }

      .success-title {
        font-size: 2.5rem;
        font-weight: 900;
        letter-spacing: -0.04em;
        margin-bottom: 1rem;
      }

      @media (max-width: 768px) {
        .success-title {
          font-size: 2rem;
        }
      }

      .success-message {
        color: var(--booking-text-muted);
        font-size: 1.125rem;
        margin-bottom: 3rem;
      }

      .success-details {
        background: var(--booking-bg);
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 3rem;
        display: grid;
        gap: 1rem;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        font-size: 1rem;
        gap: 1rem;
      }

      .detail-row span {
        color: var(--booking-text-muted);
        font-weight: 500;
        white-space: nowrap;
      }

      .detail-row strong {
        font-weight: 700;
        text-align: right;
        flex: 1;
      }

      @media (max-width: 768px) {
        .success-card {
          padding: 2.5rem 1.5rem;
        }
        .success-details {
          padding: 1.5rem;
          gap: 1.25rem;
        }
        .detail-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
          text-align: left;
        }
        .detail-row strong {
          text-align: left;
          font-size: 1.05rem;
        }
      }

      .success-actions {
        display: grid;
        gap: 1rem;
      }

      /* Loaders */
      .spinner-sm {
        width: 24px;
        height: 24px;
        border: 3px solid var(--booking-primary-soft);
        border-top-color: var(--booking-primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .spinner-sm.white {
        border-color: rgba(255, 255, 255, 0.3);
        border-top-color: white;
        margin: 0 auto;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loader-ripple {
        display: inline-block;
        position: relative;
        width: 80px;
        height: 80px;
      }
      .loader-ripple div {
        position: absolute;
        border: 4px solid var(--booking-primary);
        opacity: 1;
        border-radius: 50%;
        animation: loader-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
      }
      .loader-ripple div:nth-child(2) {
        animation-delay: -0.5s;
      }
      @keyframes loader-ripple {
        0% {
          top: 36px;
          left: 36px;
          width: 0;
          height: 0;
          opacity: 0;
        }
        4.9% {
          top: 36px;
          left: 36px;
          width: 0;
          height: 0;
          opacity: 0;
        }
        5% {
          top: 36px;
          left: 36px;
          width: 0;
          height: 0;
          opacity: 1;
        }
        100% {
          top: 0px;
          left: 0px;
          width: 72px;
          height: 72px;
          opacity: 0;
        }
      }

      /* Schedule Container (Merged Date & Time) */
      .schedule-container {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 2rem;
        min-height: 400px;
      }

      @media (max-width: 768px) {
        .schedule-container {
          grid-template-columns: 1fr;
        }
      }

      .calendar-card {
        background: var(--booking-bg);
        border-radius: 24px;
        padding: 1.5rem;
        border: 1px solid var(--booking-border);
      }

      .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding: 0 0.5rem;
      }

      .current-month {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--booking-text-main);
      }

      .calendar-nav-btn {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        background: var(--booking-surface);
        color: var(--booking-text-main);
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .calendar-nav-btn:hover {
        background: var(--booking-primary);
        color: white;
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
      }

      .weekday {
        text-align: center;
        font-size: 0.7rem;
        font-weight: 800;
        color: var(--booking-text-muted);
        text-transform: uppercase;
        padding-bottom: 8px;
      }

      .day-cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background: transparent;
        color: var(--booking-text-main);
      }

      .day-cell:hover:not(.padding):not(.selected) {
        background: var(--booking-primary-soft);
        color: var(--booking-primary);
      }

      .day-cell.today {
        color: var(--booking-primary);
        text-decoration: underline;
        text-underline-offset: 4px;
        font-weight: 800;
      }

      .day-cell.selected {
        background: var(--booking-primary);
        color: white;
        box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
        transform: scale(1.1);
        z-index: 2;
      }

      .day-cell.unavailable {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
        background: color-mix(in srgb, var(--booking-border), transparent 80%);
      }

      .day-cell.past {
        opacity: 0.2;
        cursor: not-allowed;
        pointer-events: none;
      }

      .day-cell.padding {
        opacity: 0;
        pointer-events: none;
      }

      /* Slots Card */
      .slots-card {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .slots-header {
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--booking-border);
      }

      .slots-title {
        font-size: 0.9rem;
        font-weight: 800;
        color: var(--booking-text-main);
      }

      .slots-placeholder {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: var(--booking-text-muted);
        font-size: 0.875rem;
        border: 2px dashed var(--booking-border);
        border-radius: 24px;
        padding: 2rem;
      }

      .slots-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        overflow-y: auto;
        max-height: 400px;
        padding-right: 4px;
      }

      .slots-grid::-webkit-scrollbar {
        width: 4px;
      }

      .slots-grid::-webkit-scrollbar-thumb {
        background: var(--booking-border);
        border-radius: 10px;
      }

      @media (max-width: 768px) {
        .slots-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }

      .total-price {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
        border-top: 1px dashed var(--booking-border);
        font-weight: 800;
        font-size: 1.1rem;
      }

      .total-price .price {
        font-size: 1.75rem;
        color: var(--booking-primary);
      }

      /* Animations */
      .animate-in {
        animation-duration: 500ms;
        animation-fill-mode: both;
      }

      .fade-in {
        animation-name: fadeIn;
      }
      .slide-in-from-bottom-4 {
        animation-name: slideInFromBottom;
      }
      .zoom-in {
        animation-name: zoomIn;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideInFromBottom {
        from {
          transform: translateY(16px);
        }
        to {
          transform: translateY(0);
        }
      }

      @keyframes zoomIn {
        from {
          transform: scale(0.95);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      /* ==========================================
   Cancellation & Rescheduling Flow Styles
   ========================================== */

      /* Appointment Details Grid */
      .appointment-details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-top: 1.5rem;
      }

      @media (max-width: 640px) {
        .appointment-details-grid {
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
      }

      .detail-block {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        background: var(--booking-bg);
        padding: 1.25rem;
        border-radius: var(--booking-radius-md);
        border: 1px solid var(--booking-border);
      }

      .detail-block:nth-child(2) {
        grid-column: 1 / -1;
        background: color-mix(in srgb, var(--booking-primary), transparent 94%);
        border-color: color-mix(
          in srgb,
          var(--booking-primary),
          transparent 75%
        );
      }

      .block-label {
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--booking-text-muted);
        letter-spacing: 0.05em;
      }

      .block-value {
        font-size: 1rem;
        font-weight: 700;
      }

      .highlight-value {
        font-size: 1.15rem;
        color: var(--booking-primary);
      }

      /* Status Badges */
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        font-weight: 800;
        text-transform: uppercase;
        border-radius: 9999px;
        width: fit-content;
        letter-spacing: 0.03em;
      }

      .status-badge.pending {
        background-color: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }

      .status-badge.confirmed {
        background-color: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .status-badge.cancelled,
      .status-badge.canceled {
        background-color: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      /* Red Danger Buttons */
      .btn-danger {
        background: #ef4444;
        color: white;
        padding: 1.25rem;
        border-radius: 16px;
        font-weight: 800;
        font-size: 1.1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 10px 20px -5px rgba(239, 68, 68, 0.4);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-danger:hover:not(:disabled) {
        background: #dc2626;
        transform: translateY(-2px);
        box-shadow: 0 15px 30px -10px rgba(239, 68, 68, 0.5);
      }

      .btn-danger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Danger Success State Icon */
      .success-icon-wrapper.danger {
        background: rgba(239, 68, 68, 0.15);
      }

      .success-icon-wrapper.danger .success-icon {
        background: #ef4444;
      }
    `,
  ],
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenantsService = inject(TenantsService);
  private bookingService = inject(PublicBookingService);
  private titleService = inject(Title);

  tenant = signal<Tenant | null>(null);
  invitation = signal<any | null>(null);
  invitationToken = signal<string | null>(null);
  loading = signal(true);
  error = signal(false);
  success = signal(false);
  isBooking = signal(false);

  // Cancellation and Rescheduling State
  token = signal<string | null>(null);
  appointment = signal<any | null>(null);
  isCancelMode = signal(false);
  isRescheduling = signal(false);
  isActionTimeLimitPassed = signal(false);
  timeLimitMessage = signal('');

  // Stepper State
  currentStep = signal(1);

  steps = computed(() => {
    const t = this.tenant();
    if (!t) return [];
    const inv = this.invitation();

    const dynamicSteps = [];

    // Step: Branch (If enabled, more than 1 branch, and invitation doesn't fix one)
    if (
      t.publicShowBranchSelection &&
      t.branches &&
      t.branches.length > 1 &&
      !inv?.branchId
    ) {
      dynamicSteps.push({ id: 'branch', label: 'Sucursal' });
    }

    dynamicSteps.push({ id: 'services', label: 'Servicios' });

    // Step: Professional (If enabled and invitation doesn't fix one)
    if (t.publicShowProfessionalSelection && !inv?.professionalId) {
      dynamicSteps.push({ id: 'professional', label: 'Profesional' });
    }

    dynamicSteps.push({ id: 'schedule', label: 'Horario' });

    if (!inv?.client) {
      dynamicSteps.push({ id: 'personal', label: 'Tus Datos' });
    }

    return dynamicSteps;
  });

  // Selection State
  selectedBranch = signal<any | null>(null);
  selectedService = signal<any | null>(null);
  selectedProfessional = signal<any | null>(null);
  selectedDate = signal<Date | null>(null);
  selectedTime = signal<string | null>(null);

  availableSlots = signal<{ time: string; available: boolean }[]>([]);

  loadingSlots = signal(false);
  slotError = signal<string | null>(null);
  checkedAvailability = signal<Record<string, boolean>>({});

  // Client Info State
  clientName = signal('');
  clientEmail = signal('');
  clientPhone = signal('');

  availableServices = computed(() => this.tenant()?.services || []);
  availableBranches = computed(() => {
    const inv = this.invitation();
    const branches = this.tenant()?.branches || [];
    if (inv?.branchId)
      return branches.filter((b: any) => b.id === inv.branchId);
    return branches;
  });

  // Profesionales que ofrecen el servicio seleccionado
  availableProfessionals = computed(() => {
    const service = this.selectedService();
    const inv = this.invitation();
    if (!service || !service.professionals) return [];
    let profs = service.professionals.map((p: any) => p.professional);
    if (inv?.professionalId)
      profs = profs.filter((p: any) => p.id === inv.professionalId);
    return profs;
  });

  brandStyles = computed(() => {
    const t = this.tenant();
    if (!t) return {};
    return {
      '--color-primary': t.primaryColor || '#6366f1',
      '--color-primary-hover': t.primaryHoverColor || '#4f46e5',
      '--color-accent': t.accentColor || '#a855f7',
      '--color-bg-primary': t.backgroundColor || '#0a0b14',
      '--color-text-main': t.textColor || '#f8fafc',
    };
  });

  // Calendar State
  currentMonth = signal<Date>(new Date());
  calendarDays = computed(() => {
    // Dependencias para que se regenere al cambiar estos valores
    this.selectedProfessional();
    this.selectedBranch();
    return this.generateCalendar(this.currentMonth());
  });

  constructor() {
    effect(() => {
      const date = this.selectedDate();
      const service = this.selectedService();
      const branch = this.selectedBranch();
      const prof = this.selectedProfessional();
      const tenant = this.tenant();

      if (
        date &&
        service &&
        branch &&
        prof &&
        tenant &&
        (this.currentStepId() === 'schedule' || this.isRescheduling())
      ) {
        this.loadAvailability();
      }
    });

    effect(() => {
      const days = this.calendarDays();
      const service = this.selectedService();
      const branch = this.selectedBranch();
      const prof = this.selectedProfessional();
      const tenant = this.tenant();

      const stepId = this.currentStepId();
      const isResched = this.isRescheduling();

      if (
        days.length > 0 &&
        service &&
        branch &&
        prof &&
        tenant &&
        (stepId === 'schedule' || isResched)
      ) {
        setTimeout(() => {
          this.checkMonthAvailability(days, service, branch, prof, tenant);
        });
      }
    });
  }

  private generateCalendar(monthDate: Date) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // Padding start (previous month days)
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        month: month - 1,
        year,
        isPadding: true,
      });
    }

    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
      const prof = this.selectedProfessional();
      const branch = this.selectedBranch();
      const invitation = this.invitation();

      let hasAvailability = false;
      if (prof && branch) {
        // 1. Check weekly schedule
        let weeklyMatch = prof.availability?.some(
          (a: any) => a.dayOfWeek === dayOfWeek && a.branchId === branch.id,
        );

        // Intersect with invitation schedule if present
        if (
          weeklyMatch &&
          invitation &&
          invitation.schedule &&
          invitation.schedule.length > 0
        ) {
          const invDayScheds = invitation.schedule.filter(
            (s: any) => s.dayOfWeek === dayOfWeek,
          );
          if (invDayScheds.length === 0) {
            weeklyMatch = false; // No availability on this day allowed by invitation
          }
        }

        // 2. Check if it's a holiday/leave for this professional
        const isOut = prof.exceptions?.some((ex: any) => {
          const exDate = new Date(ex.date);
          exDate.setHours(0, 0, 0, 0);
          const end = ex.endDate ? new Date(ex.endDate) : exDate;
          end.setHours(0, 0, 0, 0);
          return (
            d >= exDate &&
            d <= end &&
            (ex.type === 'HOLIDAY' || ex.type === 'LEAVE')
          );
        });

        // 3. Check invitation date bounds (start/end date)
        let withinInvitationDateRange = true;
        if (invitation) {
          const dStr = this.formatDate(d);
          if (invitation.startDate) {
            const invStartStr = new Date(invitation.startDate)
              .toISOString()
              .split('T')[0];
            if (dStr < invStartStr) withinInvitationDateRange = false;
          }
          if (invitation.endDate) {
            const invEndStr = new Date(invitation.endDate)
              .toISOString()
              .split('T')[0];
            if (dStr > invEndStr) withinInvitationDateRange = false;
          }
        }

        hasAvailability = !!weeklyMatch && !isOut && withinInvitationDateRange;
      }

      days.push({
        day: i,
        month,
        year,
        isPadding: false,
        isToday: d.getTime() === today.getTime(),
        isPast: d.getTime() < today.getTime(),
        hasAvailability,
        date: d,
      });
    }

    return days;
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(
      new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  }

  prevMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(
      new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  }

  selectDate(date: Date) {
    this.selectedDate.set(date);
    this.selectedTime.set(null); // Reset time when date changes
  }

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('publicSlug');
    const token = this.route.snapshot.paramMap.get('token');
    const invitationToken =
      this.route.snapshot.queryParamMap.get('invitation') || null;

    if (token) {
      this.token.set(token);
      this.isCancelMode.set(true);
      this.loadAppointment(token);
    } else if (slug) {
      if (invitationToken) {
        this.invitationToken.set(invitationToken);
        this.loading.set(true);
        this.bookingService.validateInvitationToken(invitationToken).subscribe({
          next: (inv) => {
            this.invitation.set(inv);
            this.loadTenant(slug, invitationToken);
          },
          error: (err) => {
            console.error('Error validating invitation token:', err);
            this.error.set(true);
            this.loading.set(false);
          },
        });
      } else {
        this.loadTenant(slug);
      }
    } else {
      this.router.navigate(['/']);
    }
  }

  checkCancellationLimit(appt: any) {
    const limit = appt.tenant.cancellationLimit || '24h';

    if (limit === 'never') {
      this.isActionTimeLimitPassed.set(true);
      this.timeLimitMessage.set(
        'Este negocio no permite cancelaciones o reprogramaciones online.',
      );
      return;
    }

    // Convert limit to minutes
    let limitMins = 24 * 60; // default 24h
    const match = limit.match(/^(\d+)([hm])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      if (unit === 'h') {
        limitMins = value * 60;
      } else if (unit === 'm') {
        limitMins = value;
      }
    }

    const now = new Date();
    const appointmentStart = new Date(appt.startTime);
    const diffMs = appointmentStart.getTime() - now.getTime();
    const diffMins = diffMs / 60000;

    if (diffMins < limitMins) {
      this.isActionTimeLimitPassed.set(true);
      const limitHours = limitMins / 60;
      const limitText =
        limitHours >= 1
          ? `${limitHours} ${limitHours === 1 ? 'hora' : 'horas'}`
          : `${limitMins} minutos`;
      this.timeLimitMessage.set(
        `El plazo para cancelar o reprogramar online ha expirado (debe realizarse con al menos ${limitText} de anticipación).`,
      );
    } else {
      this.isActionTimeLimitPassed.set(false);
      this.timeLimitMessage.set('');
    }
  }

  loadAppointment(token: string) {
    this.loading.set(true);
    this.error.set(false);

    this.bookingService.getAppointmentByToken(token).subscribe({
      next: (appt) => {
        this.appointment.set(appt);
        this.tenant.set(appt.tenant);
        this.titleService.setTitle(`Gestionar Turno - ${appt.tenant.name}`);

        if (appt.invitation) {
          this.invitation.set(appt.invitation);
          this.invitationToken.set(appt.invitation.token);
        }

        // Preload values for scheduling
        this.selectedBranch.set(appt.branch);
        this.selectedService.set(appt.service);
        this.selectedProfessional.set(appt.professional);

        // Check limit
        this.checkCancellationLimit(appt);

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading appointment:', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  loadTenant(slug: string, invitationToken?: string) {
    this.tenantsService.getPublicInfo(slug, invitationToken).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.titleService.setTitle(`${tenant.name} - Turnos Online`);

        const inv = this.invitation();

        // Pre-select branch from invitation or default to first
        if (inv?.branchId && tenant.branches) {
          const fixedBranch = tenant.branches.find(
            (b: any) => b.id === inv.branchId,
          );
          if (fixedBranch) this.selectedBranch.set(fixedBranch);
        } else if (tenant.branches && tenant.branches.length > 0) {
          this.selectedBranch.set(tenant.branches[0]);
        }

        // Si la invitación tiene un cliente pre-asociado, cargamos sus datos automáticamente
        if (inv?.client) {
          this.clientName.set(
            `${inv.client.firstName} ${inv.client.lastName}`.trim(),
          );
          this.clientEmail.set(inv.client.email || '');
          this.clientPhone.set(inv.client.phone || '');
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  currentStepId() {
    return this.steps()[this.currentStep() - 1]?.id;
  }

  loadAvailability() {
    const tenant = this.tenant();
    const date = this.selectedDate();
    const service = this.selectedService();
    const branch = this.selectedBranch();
    const prof = this.selectedProfessional();

    if (!tenant || !date || !service || !branch || !prof) return;

    const slug =
      tenant.publicSlug || this.route.snapshot.paramMap.get('publicSlug') || '';

    this.loadingSlots.set(true);
    this.slotError.set(null);

    const appt = this.appointment();

    const queryParams: any = {
      professionalId: prof.id,
      serviceId: service.id,
      branchId: branch.id,
      date: this.formatDate(date),
    };

    if (appt?.id) {
      queryParams.excludeAppointmentId = appt.id;
    }
    if (this.invitationToken()) {
      queryParams.invitationToken = this.invitationToken();
    }

    this.bookingService.getAvailability(slug, queryParams).subscribe({
      next: (slots) => {
        this.availableSlots.set(slots);
        this.loadingSlots.set(false);
      },
      error: (err) => {
        console.error('Error loading slots:', err);
        this.slotError.set('Error al cargar horarios. Intente otra fecha.');
        this.loadingSlots.set(false);
      },
    });
  }

  checkMonthAvailability(
    days: any[],
    service: any,
    branch: any,
    prof: any,
    tenant: any,
  ) {
    const slug =
      tenant.publicSlug || this.route.snapshot.paramMap.get('publicSlug') || '';
    const daysToCheck = days.filter(
      (d) => d.hasAvailability && !d.isPadding && !d.isPast,
    );

    // Clear previous check results
    this.checkedAvailability.set({});

    const appt = this.appointment();
    const invitationToken = this.invitationToken();

    daysToCheck.forEach((day) => {
      const dateStr = this.formatDate(day.date);
      const queryParams: any = {
        professionalId: prof.id,
        serviceId: service.id,
        branchId: branch.id,
        date: dateStr,
      };

      if (appt?.id) {
        queryParams.excludeAppointmentId = appt.id;
      }
      if (invitationToken) {
        queryParams.invitationToken = invitationToken;
      }

      this.bookingService.getAvailability(slug, queryParams).subscribe({
        next: (slots) => {
          const hasAnySlot = slots && slots.some((s: any) => s.available);
          this.checkedAvailability.update((prev) => ({
            ...prev,
            [dateStr]: hasAnySlot,
          }));
        },
        error: (err) => {
          console.error(`Error checking availability for ${dateStr}:`, err);
        },
      });
    });
  }

  isDayAvailable(day: any): boolean {
    if (day.isPadding || day.isPast) return false;
    if (!day.hasAvailability) return false;

    const dateStr = this.formatDate(day.date);
    const checked = this.checkedAvailability()[dateStr];
    if (checked === false) {
      return false; // Checked and verified as no available slots
    }
    return true; // Default to true if not checked yet or if it has slots
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  selectBranch(branch: any) {
    this.selectedBranch.set(branch);
  }

  selectService(service: any) {
    this.selectedService.set(service);

    const inv = this.invitation();

    // Si la invitación fija un profesional, seleccionarlo directamente
    if (inv?.professionalId && service.professionals?.length > 0) {
      const fixedProf = service.professionals.find(
        (ps: any) => ps.professional?.id === inv.professionalId,
      );
      if (fixedProf) {
        this.selectedProfessional.set(fixedProf.professional);
        return;
      }
    }

    // Si no se muestra selección de profesional, asignar el primero automáticamente
    if (
      !this.tenant()?.publicShowProfessionalSelection &&
      service.professionals?.length > 0
    ) {
      this.selectedProfessional.set(service.professionals[0].professional);
    }
  }

  selectProfessional(prof: any) {
    this.selectedProfessional.set(prof);
  }

  canContinue(): boolean {
    const stepId = this.currentStepId();
    if (stepId === 'branch') return !!this.selectedBranch();
    if (stepId === 'services') return !!this.selectedService();
    if (stepId === 'professional') return !!this.selectedProfessional();
    if (stepId === 'schedule')
      return !!this.selectedDate() && !!this.selectedTime();
    if (stepId === 'personal')
      return (
        !!this.clientName().trim() &&
        !!this.clientEmail().trim() &&
        !!this.clientPhone().trim()
      );
    return true;
  }

  nextStep() {
    if (this.canContinue() && this.currentStep() < this.steps().length) {
      this.currentStep.update((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (this.currentStep() === this.steps().length) {
      this.confirmBooking();
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  confirmBooking() {
    if (!this.canContinue() || this.isBooking()) return;

    this.isBooking.set(true);
    const tenant = this.tenant()!;
    const service = this.selectedService()!;
    const date = this.selectedDate()!;
    const time = this.selectedTime()!;
    const prof = this.selectedProfessional()!;

    const [hours, minutes] = time.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);

    const token = this.token();

    if (this.isCancelMode() && this.isRescheduling() && token) {
      this.bookingService
        .rescheduleAppointment(token, startTime.toISOString())
        .subscribe({
          next: (updatedAppt) => {
            this.appointment.set(updatedAppt);
            this.success.set(true);
            this.isRescheduling.set(false);
            this.isBooking.set(false);
          },
          error: (err) => {
            alert(
              err.error?.message ||
                'Error al reprogramar el turno. Por favor intente nuevamente.',
            );
            this.isBooking.set(false);
          },
        });
      return;
    }

    const bookingData = {
      professionalId: prof.id,
      serviceId: service.id,
      branchId: this.selectedBranch()?.id,
      startTime: startTime.toISOString(),
      clientName: this.clientName(),
      clientEmail: this.clientEmail(),
      clientPhone: this.clientPhone(),
      invitationToken: this.invitationToken() || undefined,
    };

    const slug =
      tenant.publicSlug || this.route.snapshot.paramMap.get('publicSlug') || '';

    this.bookingService.book(slug, bookingData).subscribe({
      next: () => {
        this.success.set(true);
        this.isBooking.set(false);
      },
      error: (err) => {
        alert(
          err.error?.message ||
            'Error al agendar el turno. Por favor intente nuevamente.',
        );
        this.isBooking.set(false);
      },
    });
  }

  cancelAppointment() {
    const token = this.token();
    if (!token || this.isBooking() || this.isActionTimeLimitPassed()) return;

    if (
      !confirm(
        '¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }

    this.isBooking.set(true);
    this.bookingService.cancelAppointment(token).subscribe({
      next: () => {
        const appt = this.appointment();
        if (appt) {
          appt.status = 'CANCELLED';
          this.appointment.set({ ...appt });
        }
        this.success.set(true);
        this.isBooking.set(false);
      },
      error: (err) => {
        alert(
          err.error?.message ||
            'Error al cancelar el turno. Por favor intente de nuevo.',
        );
        this.isBooking.set(false);
      },
    });
  }

  startRescheduling() {
    if (this.isActionTimeLimitPassed()) return;
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.availableSlots.set([]);
    this.isRescheduling.set(true);
  }

  cancelRescheduling() {
    this.isRescheduling.set(false);
  }

  goBackToBusiness() {
    const slug =
      this.tenant()?.publicSlug ||
      this.route.snapshot.paramMap.get('publicSlug');
    if (slug) {
      this.router.navigate([`/${slug}`]);
    } else {
      this.router.navigate(['/']);
    }
  }

  goToHome() {
    if (this.isCancelMode()) {
      this.goBackToBusiness();
      return;
    }
    this.success.set(false);
    this.currentStep.set(1);
    this.selectedService.set(null);
    this.selectedProfessional.set(null);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.availableSlots.set([]);
    this.slotError.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  expandedServiceId = signal<string | null>(null);
  zoomImageKey = signal<string | null>(null);

  toggleExpandService(serviceId: string, event: Event): void {
    event.stopPropagation();
    if (this.expandedServiceId() === serviceId) {
      this.expandedServiceId.set(null);
    } else {
      this.expandedServiceId.set(serviceId);
    }
  }

  openImageZoom(key: string, event: Event): void {
    event.stopPropagation();
    this.zoomImageKey.set(key);
  }

  closeImageZoom(): void {
    this.zoomImageKey.set(null);
  }
}
