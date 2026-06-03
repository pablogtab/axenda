import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProfessionalsService,
  Professional,
  AvailabilityException,
} from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ModalService } from '@services/modal.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import {
  format,
  addDays,
  startOfDay,
  startOfWeek,
  addMonths,
  startOfMonth,
  endOfMonth,
  endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { SidebarService } from '@services/sidebar.service';
import { startOfLocalDate, endOfLocalDate } from '@core/utils/date-utils';
import {
  AppointmentsService,
  Appointment,
} from '@services/appointments.service';

import { AppointmentFormComponent } from '../appointments/appointment-form/appointment-form';
import { AgendaDayViewComponent } from './views/agenda-day-view/agenda-day-view.component';
import { AgendaMonthViewComponent } from './views/agenda-month-view/agenda-month-view.component';
import { AgendaViewType } from './agenda.types';
import { AgendaSettingsComponent } from './components/agenda-settings/agenda-settings.component';
import { AgendaWeekViewComponent } from './views/agenda-week-view/agenda-week-view.component';
import { AgendaService } from './agenda.service';
import { AgendaAppointmentCardComponent } from './components/agenda-appointment-card/agenda-appointment-card.component';
import { AgendaActionSelectorComponent } from './components/agenda-action-selector/agenda-action-selector.component';
import { ProfessionalExceptionFormComponent } from '../professionals/professional-exception-form/professional-exception-form';
import { AgendaNavigationZonesComponent } from './components/agenda-navigation-zones/agenda-navigation-zones.component';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgendaDayViewComponent,
    AgendaWeekViewComponent,
    AgendaMonthViewComponent,
    AgendaNavigationZonesComponent,
    AgendaAppointmentCardComponent,
  ],
  template: `
    <div class="flex flex-col h-full bg-agenda-bg overflow-hidden no-select">
      @if (showFilters() || showViewSelector()) {
        <div
          class="fixed inset-0 z-[60]"
          (click)="showFilters.set(false); showViewSelector.set(false)"
        ></div>
      }
      <!-- Header: Controles -->
      <header
        class="py-1 sm:py-2 px-2 sm:px-4 border-b border-agenda-border bg-agenda-header-bg/95 backdrop-blur-md flex justify-between items-center z-[70]"
      >
        @if (sidebarService.isMobile()) {
          <div class="flex items-center w-full justify-between gap-1">
            <div class="flex items-center gap-0.5">
              <!-- Sidebar Toggle Mobile -->
              <button
                (click)="sidebarService.toggle()"
                class="p-2 hover:bg-surface-subtle-hover text-text-dim rounded-xl transition-all active:scale-90"
              >
                <span class="text-xl">☰</span>
              </button>

              <div
                class="flex items-center bg-surface-subtle rounded-full border border-border p-0.5"
              >
                <button
                  (click)="changeDate(-1)"
                  class="py-0.5 px-1.5 hover:bg-white/10 rounded-full transition-all text-text-dim hover:text-text-main active:scale-90"
                >
                  <span class="text-lg">‹</span>
                </button>

                <span
                  class="text-xs font-bold text-text-main capitalize px-1 min-w-[100px] text-center"
                  >{{ currentDateLabel() }}</span
                >

                <button
                  (click)="changeDate(1)"
                  class="py-0.5 px-1.5 hover:bg-white/10 rounded-full transition-all text-text-dim hover:text-text-main active:scale-90"
                >
                  <span class="text-lg">›</span>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <!-- Botón Hoy Mobile (Pill con texto) -->
              <button
                (click)="today()"
                class="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle-hover text-text-main rounded-xl border border-border transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                title="Hoy"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-3.5 h-3.5 text-text-dim"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Hoy</span>
              </button>

              <!-- Botón Configuración (Sliders) -->
              <button
                (click)="showMobileSettings.set(true)"
                class="p-2 bg-surface-subtle hover:bg-surface-subtle-hover text-text-dim hover:text-text-main rounded-xl border border-border transition-all active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5"
                >
                  <line x1="4" y1="8" x2="20" y2="8"></line>
                  <line x1="4" y1="16" x2="20" y2="16"></line>
                  <rect
                    x="14"
                    y="5"
                    width="4"
                    height="6"
                    rx="1.5"
                    fill="currentColor"
                    fill-opacity="0.1"
                  ></rect>
                  <rect
                    x="6"
                    y="13"
                    width="4"
                    height="6"
                    rx="1.5"
                    fill="currentColor"
                    fill-opacity="0.1"
                  ></rect>
                </svg>
              </button>
            </div>
          </div>
        } @else {
          <!-- Header Desktop -->
          <div class="flex items-center gap-1.5 sm:gap-4">
            <!-- Sidebar Toggle -->
            <button
              (click)="sidebarService.toggle()"
              class="p-1.5 sm:p-2 bg-surface-subtle hover:bg-surface-subtle-hover text-text-dim hover:text-text-main rounded-lg sm:rounded-xl border border-border transition-all active:scale-95 group"
              [title]="
                sidebarService.isCollapsed() ? 'Mostrar menú' : 'Ocultar menú'
              "
            >
              <span
                class="text-base sm:text-lg transition-transform group-hover:scale-110"
                >☰</span
              >
            </button>

            <!-- Navegación de Fecha Desktop -->
            <button
              (click)="today()"
              class="px-4 py-1.5 bg-surface-subtle hover:bg-surface-subtle-hover text-text-main rounded-xl border border-border text-xs font-bold transition-all active:scale-95"
            >
              Hoy
            </button>

            <div
              class="flex items-center bg-surface-subtle rounded-xl border border-border p-0.5"
            >
              <button
                (click)="changeDate(-1)"
                class="py-1 px-3 hover:bg-white/10 rounded-lg transition-all text-text-dim hover:text-text-main active:scale-90"
              >
                <span class="text-lg">‹</span>
              </button>

              <span
                class="text-sm sm:text-base font-bold text-text-main capitalize px-4 min-w-[200px] text-center"
                >{{ currentDateLabel() }}</span
              >

              <button
                (click)="changeDate(1)"
                class="py-1 px-3 hover:bg-white/10 rounded-lg transition-all text-text-dim hover:text-text-main active:scale-90"
              >
                <span class="text-lg">›</span>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Centro de Configuración Consolidado -->
            <div class="relative">
              <button
                (click)="showFilters.set(!showFilters())"
                class="p-2 bg-surface-subtle hover:bg-surface-subtle-hover text-text-dim hover:text-text-main rounded-xl border border-border transition-all active:scale-95 relative group"
                [class.border-primary]="showFilters()"
                [class.text-primary]="showFilters()"
                title="Configuración de Agenda"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5 transition-transform group-hover:rotate-12"
                >
                  <line x1="4" y1="8" x2="20" y2="8"></line>
                  <line x1="4" y1="16" x2="20" y2="16"></line>
                  <rect
                    x="14"
                    y="5"
                    width="4"
                    height="6"
                    rx="1.5"
                    fill="currentColor"
                    fill-opacity="0.1"
                  ></rect>
                  <rect
                    x="6"
                    y="13"
                    width="4"
                    height="6"
                    rx="1.5"
                    fill="currentColor"
                    fill-opacity="0.1"
                  ></rect>
                </svg>
                @if (!isAllProfessionalsSelected()) {
                  <span
                    class="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-bg-primary"
                  ></span>
                }
              </button>

              <!-- Contenido del Dropdown Consolidado -->
              @if (showFilters()) {
                <div
                  (click)="$event.stopPropagation()"
                  class="absolute right-0 mt-2 w-80 bg-surface/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                  <!-- Header del Dropdown -->
                  <div class="p-3 border-b border-border bg-surface-subtle">
                    <h3
                      class="text-xs font-bold text-text-main flex items-center gap-2"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="w-4 h-4"
                      >
                        <line x1="4" y1="8" x2="20" y2="8"></line>
                        <line x1="4" y1="16" x2="20" y2="16"></line>
                        <rect x="14" y="5" width="4" height="6" rx="1.5"></rect>
                        <rect x="6" y="13" width="4" height="6" rx="1.5"></rect>
                      </svg>
                      Configurar Vista
                    </h3>
                  </div>

                  <div
                    class="p-1 max-h-[70dvh] overflow-y-auto custom-scrollbar flex flex-col"
                  >
                    <!-- Sección: Tipo de Vista -->
                    <div class="px-2 pt-2 pb-1">
                      <span
                        class="text-[9px] uppercase font-bold text-text-dim tracking-widest px-2"
                        >Vista</span
                      >
                    </div>
                    <div class="flex flex-col gap-0.5 mb-2">
                      <button
                        (click)="setView('day'); showFilters.set(false)"
                        class="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-subtle rounded-xl transition-colors text-xs group/item"
                        [class.bg-primary/5]="selectedView() === 'day'"
                      >
                        <div class="flex items-center gap-3">
                          <span
                            class="w-1.5 h-1.5 rounded-full transition-all"
                            [class.bg-primary]="selectedView() === 'day'"
                            [class.bg-transparent]="selectedView() !== 'day'"
                          ></span>
                          <span
                            [class.text-primary]="selectedView() === 'day'"
                            [class.text-text-main]="selectedView() !== 'day'"
                            class="font-medium"
                            >Día</span
                          >
                        </div>
                        <span
                          class="text-text-dim text-[10px] font-bold bg-surface-subtle px-2 py-0.5 rounded uppercase tracking-tighter"
                          >D</span
                        >
                      </button>

                      <button
                        (click)="setView('week'); showFilters.set(false)"
                        class="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-subtle rounded-xl transition-colors text-xs group/item"
                        [class.bg-primary/5]="selectedView() === 'week'"
                      >
                        <div class="flex items-center gap-3">
                          <span
                            class="w-1.5 h-1.5 rounded-full transition-all"
                            [class.bg-primary]="selectedView() === 'week'"
                            [class.bg-transparent]="selectedView() !== 'week'"
                          ></span>
                          <span
                            [class.text-primary]="selectedView() === 'week'"
                            [class.text-text-main]="selectedView() !== 'week'"
                            class="font-medium"
                            >Semana</span
                          >
                        </div>
                        <span
                          class="text-text-dim text-[10px] font-bold bg-surface-subtle px-2 py-0.5 rounded uppercase tracking-tighter"
                          >W</span
                        >
                      </button>

                      <button
                        (click)="setView('month'); showFilters.set(false)"
                        class="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-subtle rounded-xl transition-colors text-xs group/item"
                        [class.bg-primary/5]="selectedView() === 'month'"
                      >
                        <div class="flex items-center gap-3">
                          <span
                            class="w-1.5 h-1.5 rounded-full transition-all"
                            [class.bg-primary]="selectedView() === 'month'"
                            [class.bg-transparent]="selectedView() !== 'month'"
                          ></span>
                          <span
                            [class.text-primary]="selectedView() === 'month'"
                            [class.text-text-main]="selectedView() !== 'month'"
                            class="font-medium"
                            >Mes</span
                          >
                        </div>
                        <span
                          class="text-text-dim text-[10px] font-bold bg-surface-subtle px-2 py-0.5 rounded uppercase tracking-tighter"
                          >M</span
                        >
                      </button>
                    </div>

                    <!-- Sección Sucursal -->
                    <div class="px-2 pt-2 pb-1 border-t border-border">
                      <span
                        class="text-[9px] uppercase font-bold text-text-dim tracking-widest px-2"
                        >Sucursal</span
                      >
                    </div>
                    <div class="flex flex-col gap-0.5 mb-2">
                      @for (branch of branches(); track branch.id) {
                        <button
                          (click)="
                            onBranchChange(branch.id); showFilters.set(false)
                          "
                          [class.bg-primary/10]="
                            selectedBranchId() === branch.id
                          "
                          [class.text-primary]="
                            selectedBranchId() === branch.id
                          "
                          class="flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all hover:bg-surface-subtle text-text-main group/item"
                        >
                          <div class="flex items-center gap-2">
                            <span class="text-sm">🏢</span>
                            <span class="font-medium">{{ branch.name }}</span>
                          </div>
                          @if (selectedBranchId() === branch.id) {
                            <span class="text-primary">✓</span>
                          }
                        </button>
                      }
                    </div>

                    <!-- Sección Profesionales -->
                    <div
                      class="px-2 pt-2 pb-1 border-t border-border flex justify-between items-center"
                    >
                      <span
                        class="text-[9px] uppercase font-bold text-text-dim tracking-widest px-2"
                        >Profesionales</span
                      >
                      <button
                        (click)="selectAllProfessionals()"
                        class="text-[9px] font-bold text-primary hover:text-primary-hover transition-colors px-2 uppercase tracking-tight"
                      >
                        Todos
                      </button>
                    </div>
                    <div class="flex flex-col gap-0.5 mb-2">
                      @for (prof of professionals(); track prof.id) {
                        @let isSelected =
                          selectedProfessionalIds().includes(prof.id) ||
                          selectedProfessionalIds().length === 0;
                        <button
                          (click)="toggleProfessional(prof.id)"
                          class="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all hover:bg-surface-subtle text-text-main group/item"
                        >
                          <div class="flex items-center gap-2">
                            <div
                              class="w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center"
                              [class.bg-primary]="isSelected"
                              [class.border-primary]="isSelected"
                              [class.border-border]="!isSelected"
                            >
                              @if (isSelected) {
                                <span class="text-white text-[9px] font-bold"
                                  >✓</span
                                >
                              }
                            </div>
                            <span
                              class="font-medium"
                              [class.text-text-main]="isSelected"
                              [class.text-text-dim]="!isSelected"
                            >
                              {{ prof.firstName }} {{ prof.lastName }}
                            </span>
                          </div>
                        </button>
                      }
                    </div>

                    <!-- Sección Estados -->
                    <div
                      class="px-2 pt-2 pb-1 border-t border-border flex justify-between items-center"
                    >
                      <span
                        class="text-[9px] uppercase font-bold text-text-dim tracking-widest px-2"
                        >Estados</span
                      >
                    </div>
                    <div class="flex flex-col gap-0.5 mb-2">
                      @for (status of statusFilterOptions; track status.value) {
                        @let isSelected = isStatusSelected(status.value);
                        <button
                          (click)="toggleStatus(status.value)"
                          class="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all hover:bg-surface-subtle text-text-main group/item"
                        >
                          <div class="flex items-center gap-2">
                            <div
                              class="w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center"
                              [style.background-color]="
                                isSelected ? status.color : 'transparent'
                              "
                              [style.border-color]="
                                isSelected
                                  ? status.color
                                  : 'rgba(255,255,255,0.1)'
                              "
                            >
                              @if (isSelected) {
                                <span class="text-white text-[9px] font-bold"
                                  >✓</span
                                >
                              }
                            </div>
                            <span
                              class="font-medium"
                              [class.text-text-main]="isSelected"
                              [class.text-text-dim]="!isSelected"
                              [style.color]="isSelected ? status.color : ''"
                            >
                              {{ status.label }}
                            </span>
                          </div>
                        </button>
                      }
                    </div>

                    <!-- Sección: Configuración Avanzada -->
                    <div class="mt-auto p-1 border-t border-border">
                      <button
                        (click)="openSettings(); showFilters.set(false)"
                        class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-subtle rounded-xl transition-all text-text-dim hover:text-text-main group/settings"
                      >
                        <span
                          class="text-sm transition-transform group-hover/settings:rotate-45"
                          >⚙️</span
                        >
                        <span class="text-xs font-medium"
                          >Configuración Avanzada</span
                        >
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <button
              (click)="
                onAddAppointment({
                  professional: activeProfessionals()[0],
                  time: '09:00',
                })
              "
              class="bg-primary hover:bg-primary/90 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span class="hidden sm:inline">+ Nuevo Turno</span>
              <span class="sm:hidden">+ Nuevo</span>
            </button>
          </div>
        }
      </header>

      <!-- Contenido de la Vista -->
      <div class="flex-1 overflow-hidden relative">
        @if (isLoading() && !agendaService.isDragging()) {
          <div
            class="absolute inset-0 bg-bg-primary/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div
              class="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"
            ></div>
          </div>
        }

        <div [class]="viewTransitionClass()" class="h-full w-full">
          @switch (selectedView()) {
            @case ('day') {
              <app-agenda-day-view
                [date]="selectedDate()"
                [branchId]="selectedBranchId()"
                [professionals]="activeProfessionals()"
                [selectedStatuses]="selectedStatuses()"
                (addAppointment)="onAddAppointment($event)"
                (editAppointment)="
                  onEditAppointment($event.appointment, $event.newDate)
                "
                (editException)="onEditException($event)"
                (dateChange)="selectedDate.set($event)"
              ></app-agenda-day-view>
            }
            @case ('week') {
              <app-agenda-week-view
                [date]="selectedDate()"
                [branchId]="selectedBranchId()"
                [professionals]="activeProfessionals()"
                [selectedStatuses]="selectedStatuses()"
                (addAppointment)="onAddAppointment($event)"
                (editAppointment)="
                  onEditAppointment($event.appointment, $event.newDate)
                "
                (editException)="onEditException($event)"
                (dateChange)="selectedDate.set($event)"
              ></app-agenda-week-view>
            }
            @case ('month') {
              <app-agenda-month-view
                [date]="selectedDate()"
                [branchId]="selectedBranchId()"
                [professionals]="activeProfessionals()"
                [selectedStatuses]="selectedStatuses()"
                (addAppointment)="onAddAppointment($event)"
                (editAppointment)="
                  onEditAppointment($event.appointment, $event.newDate)
                "
                (dateChange)="selectedDate.set($event)"
                (dayClick)="setView('day'); selectedDate.set($event)"
              ></app-agenda-month-view>
            }
          }
        </div>

        <app-agenda-navigation-zones
          [prevLabel]="navLabels().prev"
          [nextLabel]="navLabels().next"
          [offsetLeft]="navLabels().offset"
          [disabled]="
            showFilters() || showViewSelector() || modal.hasOpenDialogs
          "
          [currentView]="selectedView()"
          (navigate)="changeDate($event === 'prev' ? -1 : 1)"
        >
        </app-agenda-navigation-zones>
      </div>

      @if (agendaService.isDragging() && agendaService.draggedApp(); as app) {
        <div
          class="fixed pointer-events-none z-[9999] rounded-lg shadow-2xl border border-border backdrop-blur-xl scale-105 origin-top-left"
          [style.left.px]="agendaService.mouseX() + 5"
          [style.top.px]="agendaService.mouseY() + 5"
          [style.width.px]="agendaService.draggedAppWidth()"
          [style.height.px]="agendaService.draggedAppHeight()"
          [ngStyle]="{
            'background-color': app.service.color + '80',
            'border-left': '4px solid ' + app.service.color,
            color: app.service.color,
          }"
        >
          <app-agenda-appointment-card
            [appointment]="app"
            [height]="agendaService.draggedAppHeight()"
            [showProfessionalBadge]="true"
          ></app-agenda-appointment-card>
        </div>
      }
      <!-- Mobile Configuration Drawer (Slide from Right) -->
      @if (sidebarService.isMobile() && showMobileSettings()) {
        <div class="fixed inset-0 z-[100] flex justify-end">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            (click)="showMobileSettings.set(false)"
          ></div>

          <!-- Content -->
          <div
            class="relative w-80 max-w-[85vw] h-full bg-surface border-l border-border shadow-2xl flex flex-col slide-in-from-right overflow-hidden"
          >
            <!-- Header Drawer -->
            <div
              class="p-4 border-b border-border flex justify-between items-center bg-surface-subtle"
            >
              <div class="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5 text-text-main"
                >
                  <line x1="4" y1="8" x2="20" y2="8"></line>
                  <line x1="4" y1="16" x2="20" y2="16"></line>
                  <rect x="14" y="5" width="4" height="6" rx="1.5"></rect>
                  <rect x="6" y="13" width="4" height="6" rx="1.5"></rect>
                </svg>
                <h2 class="text-base font-bold text-text-main">
                  Configuración
                </h2>
              </div>
              <button
                (click)="showMobileSettings.set(false)"
                class="p-2 hover:bg-white/10 rounded-full text-text-dim transition-colors"
              >
                ✕
              </button>
            </div>

            <!-- Scrollable Content -->
            <div
              class="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar"
            >
              <div class="flex flex-col">
                <button
                  (click)="today(); showMobileSettings.set(false)"
                  class="flex items-center justify-center gap-2 py-3 bg-surface-subtle hover:bg-surface-subtle-hover rounded-xl border border-border text-text-main text-xs font-bold transition-all active:scale-95"
                >
                  <span>📅</span> Hoy
                </button>
              </div>

              <!-- Selector de Vista -->
              <section>
                <h3
                  class="text-[10px] uppercase font-bold text-text-dim tracking-widest mb-3"
                >
                  Vista de Agenda
                </h3>
                <div class="flex flex-col gap-1">
                  <button
                    (click)="setView('day'); showMobileSettings.set(false)"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    [class.bg-primary/10]="selectedView() === 'day'"
                    [class.border-primary/20]="selectedView() === 'day'"
                    [class.border]="selectedView() === 'day'"
                    [class.bg-surface-subtle]="selectedView() !== 'day'"
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      [class.bg-primary]="selectedView() === 'day'"
                      [class.bg-text-dim/20]="selectedView() !== 'day'"
                    ></span>
                    <span
                      class="text-sm font-medium"
                      [class.text-primary]="selectedView() === 'day'"
                      [class.text-text-main]="selectedView() !== 'day'"
                      >Día</span
                    >
                  </button>

                  <button
                    (click)="setView('week'); showMobileSettings.set(false)"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    [class.bg-primary/10]="selectedView() === 'week'"
                    [class.border-primary/20]="selectedView() === 'week'"
                    [class.border]="selectedView() === 'week'"
                    [class.bg-surface-subtle]="selectedView() !== 'week'"
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      [class.bg-primary]="selectedView() === 'week'"
                      [class.bg-text-dim/20]="selectedView() !== 'week'"
                    ></span>
                    <span
                      class="text-sm font-medium"
                      [class.text-primary]="selectedView() === 'week'"
                      [class.text-text-main]="selectedView() !== 'week'"
                      >Semana</span
                    >
                  </button>

                  <button
                    (click)="setView('month'); showMobileSettings.set(false)"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    [class.bg-primary/10]="selectedView() === 'month'"
                    [class.border-primary/20]="selectedView() === 'month'"
                    [class.border]="selectedView() === 'month'"
                    [class.bg-surface-subtle]="selectedView() !== 'month'"
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      [class.bg-primary]="selectedView() === 'month'"
                      [class.bg-text-dim/20]="selectedView() !== 'month'"
                    ></span>
                    <span
                      class="text-sm font-medium"
                      [class.text-primary]="selectedView() === 'month'"
                      [class.text-text-main]="selectedView() !== 'month'"
                      >Mes</span
                    >
                  </button>
                </div>
              </section>

              <!-- Sucursal -->
              <section>
                <h3
                  class="text-[10px] uppercase font-bold text-text-dim tracking-widest mb-3"
                >
                  Sucursal
                </h3>
                <div class="flex flex-col gap-1">
                  @for (branch of branches(); track branch.id) {
                    <button
                      (click)="onBranchChange(branch.id)"
                      [class.bg-primary/10]="selectedBranchId() === branch.id"
                      [class.text-primary]="selectedBranchId() === branch.id"
                      class="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all bg-surface-subtle hover:bg-surface-subtle-hover text-text-main"
                    >
                      <div class="flex items-center gap-2">
                        <span>🏢</span>
                        <span class="font-medium">{{ branch.name }}</span>
                      </div>
                      @if (selectedBranchId() === branch.id) {
                        <span class="text-primary">✓</span>
                      }
                    </button>
                  }
                </div>
              </section>

              <!-- Profesionales -->
              <section>
                <div class="flex justify-between items-center mb-3">
                  <h3
                    class="text-[10px] uppercase font-bold text-text-dim tracking-widest"
                  >
                    Profesionales
                  </h3>
                  <button
                    (click)="selectAllProfessionals()"
                    class="text-[10px] font-bold text-primary"
                  >
                    Todos
                  </button>
                </div>
                <div class="flex flex-col gap-1">
                  @for (prof of professionals(); track prof.id) {
                    @let isSelected =
                      selectedProfessionalIds().includes(prof.id) ||
                      selectedProfessionalIds().length === 0;
                    <button
                      (click)="toggleProfessional(prof.id)"
                      class="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all bg-surface-subtle hover:bg-surface-subtle-hover text-text-main"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all"
                          [class.bg-primary]="isSelected"
                          [class.border-primary]="isSelected"
                          [class.border-border]="!isSelected"
                        >
                          @if (isSelected) {
                            <span class="text-white text-[10px]">✓</span>
                          }
                        </div>
                        <span
                          class="font-medium"
                          [class.text-text-main]="isSelected"
                          [class.text-text-muted]="!isSelected"
                        >
                          {{ prof.firstName }} {{ prof.lastName }}
                        </span>
                      </div>
                    </button>
                  }
                </div>
              </section>
              <!-- Estados -->
              <section>
                <div class="flex justify-between items-center mb-3">
                  <h3
                    class="text-[10px] uppercase font-bold text-text-dim tracking-widest"
                  >
                    Estados
                  </h3>
                </div>
                <div class="flex flex-col gap-1">
                  @for (status of statusFilterOptions; track status.value) {
                    @let isSelected = isStatusSelected(status.value);
                    <button
                      (click)="toggleStatus(status.value)"
                      class="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all bg-surface-subtle hover:bg-surface-subtle-hover text-text-main"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all"
                          [style.background-color]="
                            isSelected ? status.color : 'transparent'
                          "
                          [style.border-color]="
                            isSelected ? status.color : 'var(--color-border)'
                          "
                        >
                          @if (isSelected) {
                            <span class="text-white text-[10px]">✓</span>
                          }
                        </div>
                        <span
                          class="font-medium"
                          [class.text-text-main]="isSelected"
                          [class.text-text-muted]="!isSelected"
                          [style.color]="isSelected ? status.color : ''"
                        >
                          {{ status.label }}
                        </span>
                      </div>
                    </button>
                  }
                </div>
              </section>

              <!-- Configuración Avanzada -->
              <section class="mt-auto pt-4 border-t border-white/5">
                <button
                  (click)="openSettings(); showMobileSettings.set(false)"
                  class="w-full flex items-center gap-3 px-4 py-3 bg-surface-subtle hover:bg-surface-subtle-hover rounded-xl text-text-muted hover:text-text-main transition-all"
                >
                  <span>🛠️</span>
                  <span class="text-sm font-medium"
                    >Configuración Avanzada</span
                  >
                </button>

                <button
                  (click)="
                    sidebarService.toggle(); showMobileSettings.set(false)
                  "
                  class="w-full flex items-center gap-3 px-4 py-3 bg-surface-subtle hover:bg-surface-subtle-hover rounded-xl text-text-muted hover:text-text-main transition-all mt-2"
                >
                  <span>☰</span>
                  <span class="text-sm font-medium">Menú Principal</span>
                </button>
              </section>
            </div>
          </div>
        </div>
      }

      <!-- Floating Action Button (FAB) para Nuevo Turno -->
      <button
        (click)="
          onAddAppointment({
            professional: activeProfessionals()[0],
            time: '09:00',
          })
        "
        class="fixed bottom-6 right-6 w-14 h-14 sm:w-12 sm:h-12 bg-primary hover:bg-primary/90 text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 transition-all hover:scale-110 active:scale-95 z-[1000] group"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-5 h-5 sm:w-4 h-4"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  `,
  styles: [
    `
      .bg-stripe-pattern {
        background-image: linear-gradient(
          45deg,
          var(--color-stripe) 25%,
          transparent 25%,
          transparent 50%,
          var(--color-stripe) 50%,
          var(--color-stripe) 75%,
          transparent 75%,
          transparent
        );
        background-size: 15px 15px;
      }

      .bg-stripe-pattern-heavy {
        background-image: linear-gradient(
          45deg,
          var(--color-stripe) 25%,
          transparent 25%,
          transparent 50%,
          var(--color-stripe) 50%,
          var(--color-stripe) 75%,
          transparent 75%,
          transparent
        );
        background-size: 8px 8px;
      }

      /* CURSORES Y EFECTOS BÁSICOS */
      .cursor-grab {
        cursor: grab;
      }
      .cursor-grabbing {
        cursor: grabbing;
      }

      .cdk-drag-preview {
        box-shadow: var(--shadow-premium, 0 10px 40px rgba(0, 0, 0, 0.4));
        border: 1px solid var(--color-glass-border);
        background-color: var(--color-glass-bg);
        backdrop-blur: blur(8px);
        cursor: grabbing;
      }

      .cdk-drag-placeholder {
        opacity: 0 !important;
      }

      /* CERO ANIMACIÓN AL SOLTAR (Para evitar rebotes) */
      .cdk-drag-animating {
        transition: none !important;
      }

      .group\\/appt:hover {
        filter: brightness(1.2);
        z-index: 30;
      }

      /* TRANSICIONES SELECTIVAS (Ahora incluimos top/left para el retorno suave) */
      .group\\/appt {
        transition:
          top 0.2s cubic-bezier(0, 0, 0.2, 1),
          left 0.2s cubic-bezier(0, 0, 0.2, 1),
          filter 0.2s ease,
          box-shadow 0.2s ease,
          background-color 0.2s ease !important;
      }

      .cdk-drag-dragging {
        transition: none !important;
        z-index: 1000 !important;
        opacity: 0.9;
      }

      /* Animaciones para el dropdown */
      .animate-in {
        animation-duration: 200ms;
        animation-fill-mode: both;
      }

      .fade-in {
        animation-name: fadeIn;
      }

      .zoom-in-95 {
        animation-name: zoomIn95;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes zoomIn95 {
        from {
          transform: scale(0.95);
        }
        to {
          transform: scale(1);
        }
      }

      /* Animaciones de cambio de vista/fecha */
      .slide-next {
        animation: slideNext 0.4s cubic-bezier(0.23, 1, 0.32, 1) both;
      }

      .slide-prev {
        animation: slidePrev 0.4s cubic-bezier(0.23, 1, 0.32, 1) both;
      }

      @keyframes slideNext {
        from {
          transform: translateX(60px);
          opacity: 0;
          filter: blur(12px);
        }
        to {
          transform: translateX(0);
          opacity: 1;
          filter: blur(0);
        }
      }

      @keyframes slidePrev {
        from {
          transform: translateX(-60px);
          opacity: 0;
          filter: blur(12px);
        }
        to {
          transform: translateX(0);
          opacity: 1;
          filter: blur(0);
        }
      }

      /* Estilo para los botones dentro del dropdown */
      .group\\/item:hover div:first-child {
        border-color: rgba(99, 102, 241, 0.4);
      }

      /* Animaciones para el Drawer Mobile */
      .slide-in-from-right {
        animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
    `,
  ],
})
export class AgendaComponent implements OnInit {
  private professionalsService = inject(ProfessionalsService);
  private branchesService = inject(BranchesService);
  public modal = inject(ModalService);
  private userConfig = inject(UserConfigurationService);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);
  private appointmentsService = inject(AppointmentsService);

  @ViewChild(AgendaDayViewComponent) dayView?: AgendaDayViewComponent;
  @ViewChild(AgendaWeekViewComponent) weekView?: AgendaWeekViewComponent;

  constructor() {
    // Sincronizar cambios de vuelta a la configuración de usuario para persistencia
    effect(() => {
      this.userConfig.updateAgendaBranchId(this.selectedBranchId());
    });
    effect(() => {
      this.userConfig.updateAgendaProfessionalIds(
        this.selectedProfessionalIds(),
      );
    });
    effect(() => {
      this.userConfig.updateAgendaView(this.selectedView());
    });
    effect(() => {
      this.userConfig.updateAgendaStatuses(this.selectedStatuses());
    });

    // Efecto para pre-consultar períodos adyacentes y mejorar performance
    effect(() => {
      const date = this.selectedDate();
      const view = this.selectedView();
      const branchId = this.selectedBranchId();
      const statuses = this.selectedStatuses();

      if (branchId) {
        this.prefetchAdjacentPeriods(date, view, branchId, statuses);
      }
    });
  }

  // Estado Global de la Agenda (Inicializado desde la configuración persistida)
  selectedDate = signal<Date>(startOfDay(new Date()));
  selectedBranchId = signal<string | null>(
    this.userConfig.agendaSelectedBranchId(),
  );
  selectedView = signal<AgendaViewType>(this.userConfig.agendaView());
  selectedProfessionalIds = signal<string[]>(
    this.userConfig.agendaSelectedProfessionalIds(),
  );
  selectedStatuses = signal<string[]>(this.userConfig.agendaSelectedStatuses()); // Ahora cargado desde config

  statusFilterOptions = [
    { value: 'PENDING', label: 'Reservado', color: '#fbbf24' },
    { value: 'CONFIRMED', label: 'Confirmado', color: '#60a5fa' },
    { value: 'COMPLETED', label: 'Finalizado', color: '#c084fc' },
    { value: 'NO_SHOW', label: 'No asistió', color: '#f87171' },
    { value: 'CANCELLED', label: 'Cancelado', color: '#475569' },
  ];

  professionals = signal<Professional[]>([]);
  branches = signal<Branch[]>([]);
  isLoading = signal(true);
  showFilters = signal(false);
  showViewSelector = signal(false);
  showMobileSettings = signal(false);
  viewTransitionClass = signal<string>('');

  @HostListener('document:keydown', ['$event'])
  handleGlobalKeyDown(event: KeyboardEvent) {
    if (
      this.showFilters() ||
      this.showViewSelector() ||
      this.modal.hasOpenDialogs
    ) {
      if (event.key === 'Escape') {
        this.showFilters.set(false);
        this.showViewSelector.set(false);
      }
      return;
    }

    const target = event.target as HTMLElement;
    if (target?.closest('.cdk-overlay-container')) return;

    // Navegación con Flechas
    const activeElement = document.activeElement;
    const isInput =
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.hasAttribute('contenteditable');

    if (isInput) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      this.changeDate(-1);
      this.agendaService.triggerNavigationFeedback();
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      this.changeDate(1);
      this.agendaService.triggerNavigationFeedback();
      event.preventDefault();
    }

    // Atajos de Vista
    const key = event.key.toLowerCase();
    if (key === 'd') {
      this.setView('day');
    } else if (key === 'w') {
      this.setView('week');
    } else if (key === 'm') {
      this.setView('month');
    }
  }

  private lastWheelNavTime = 0;
  private readonly wheelNavThrottle = 300;

  @HostListener('window:wheel', ['$event'])
  handleGlobalWheel(event: WheelEvent) {
    if (
      this.showFilters() ||
      this.showViewSelector() ||
      this.modal.hasOpenDialogs
    )
      return;

    const target = event.target as HTMLElement;
    if (target?.closest('.cdk-overlay-container')) return;

    // Solo permitimos navegación por rueda en vista mes o si estamos arrastrando
    if (this.selectedView() !== 'month' && !this.agendaService.isDragging())
      return;

    const activeElement = document.activeElement;
    const isInput =
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.hasAttribute('contenteditable');

    if (isInput) return;

    const now = Date.now();
    if (now - this.lastWheelNavTime < this.wheelNavThrottle) return;

    if (Math.abs(event.deltaY) > 50) {
      this.lastWheelNavTime = now;
      this.changeDate(event.deltaY < 0 ? -1 : 1);
      this.agendaService.triggerNavigationFeedback();
    }
  }

  @HostListener('document:dragover', ['$event'])
  handleGlobalDragOver(event: DragEvent) {
    if (this.agendaService.isDragging()) {
      this.agendaService.updateMousePosition(event.clientX, event.clientY);
      // We don't preventDefault here to allow actual drop targets to handle it
    }
  }

  @HostListener('document:mouseup', ['$event'])
  handleGlobalMouseUp(event: MouseEvent) {
    if (this.agendaService.isDragging()) {
      // Si estamos navegando (cambio de mes), ignoramos el mouseup global por completo
      // porque el navegador suele disparar eventos falsos al reconstruir el DOM.
      if (this.agendaService.isNavigating()) {
        return;
      }

      // Para otros casos, damos un pequeño margen
      setTimeout(() => {
        if (this.agendaService.isDragging()) {
          this.agendaService.stopDragging();
        }
      }, 300);
    }
  }

  selectedProfessionalName = computed(() => {
    const ids = this.selectedProfessionalIds();
    const all = this.professionals();
    if (ids.length === 0 || ids.length === all.length)
      return 'Todos los Profesionales';
    if (ids.length === 1) {
      const prof = all.find((p) => p.id === ids[0]);
      return prof ? `${prof.firstName} ${prof.lastName}` : '1 Profesional';
    }
    return `${ids.length} Profesionales`;
  });

  selectedBranchName = computed(() => {
    const id = this.selectedBranchId();
    const branch = this.branches().find((b) => b.id === id);
    return branch ? branch.name : 'Seleccionar Sucursal';
  });

  activeProfessionals = computed(() => {
    const ids = this.selectedProfessionalIds();
    const all = this.professionals();
    if (ids.length === 0) return all;
    return all.filter((p) => ids.includes(p.id));
  });

  isAllProfessionalsSelected = computed(() => {
    return (
      this.selectedProfessionalIds().length === 0 ||
      this.selectedProfessionalIds().length === this.professionals().length
    );
  });

  weekRange = computed(() => {
    const date = this.selectedDate();
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return { start, end };
  });

  weekDays = computed(() => {
    const { start } = this.weekRange();
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });

  currentDateLabel = computed(() => {
    const date = this.selectedDate();
    const view = this.selectedView();

    if (view === 'day') {
      return format(date, "EEEE, d 'de' MMMM", { locale: es });
    }

    if (view === 'week') {
      const { start, end } = this.weekRange();
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'd')} - ${format(end, "d 'de' MMMM 'de' yyyy")}`;
      }
      return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
    }

    // Month view
    return format(date, "MMMM 'de' yyyy", { locale: es });
  });

  navLabels = computed(() => {
    const view = this.selectedView();
    const isMobile = this.sidebarService.isMobile();
    const timeColWidth = isMobile ? '45px' : '60px';

    if (view === 'day')
      return {
        prev: 'Día Anterior',
        next: 'Día Siguiente',
        offset: timeColWidth,
      };
    if (view === 'week')
      return {
        prev: 'Semana Anterior',
        next: 'Semana Siguiente',
        offset: timeColWidth,
      };
    return { prev: 'Mes Anterior', next: 'Mes Siguiente', offset: '0px' };
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.branchesService.findAll().subscribe({
      next: (branches) => {
        const activeBranches = branches.filter((b) => b.active);
        this.branches.set(activeBranches);

        if (activeBranches.length > 0) {
          const currentId = this.selectedBranchId();
          const exists = activeBranches.some((b) => b.id === currentId);
          if (!exists) {
            this.selectedBranchId.set(activeBranches[0].id);
          }
        }

        this.loadProfessionals();
      },
      error: () => this.isLoading.set(false),
    });
  }

  loadProfessionals(): void {
    const branchId = this.selectedBranchId();
    if (!branchId) {
      this.isLoading.set(false);
      return;
    }

    this.professionalsService.findAll(branchId).subscribe({
      next: (profs) => {
        const activeProfs = profs.filter((p) => p.active);
        this.professionals.set(activeProfs);

        // Validar profesionales seleccionados (eliminar los que no pertenecen a este tenant/sucursal)
        const currentIds = this.selectedProfessionalIds();
        if (currentIds.length > 0) {
          const validIds = currentIds.filter((id) =>
            activeProfs.some((p) => p.id === id),
          );
          if (validIds.length !== currentIds.length) {
            this.selectedProfessionalIds.set(validIds);
          }
        }

        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  changeDate(days: number): void {
    const view = this.selectedView();
    const oldDate = this.selectedDate();

    const direction = days > 0 ? 'slide-next' : 'slide-prev';
    this.viewTransitionClass.set(direction);

    if (view === 'month') {
      const newDate = addMonths(startOfMonth(oldDate), days);
      // Usamos setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
      // y dar tiempo al sistema de Drag&Drop a estabilizarse
      setTimeout(() => {
        this.selectedDate.set(newDate);
        setTimeout(() => this.viewTransitionClass.set(''), 450);
      }, 0);
    } else {
      const step = view === 'week' ? days * 7 : days;
      const newDate = addDays(oldDate, step);
      setTimeout(() => {
        this.selectedDate.set(newDate);
        setTimeout(() => this.viewTransitionClass.set(''), 450);
      }, 0);
    }
  }

  today(): void {
    this.selectedDate.set(startOfDay(new Date()));
  }

  onBranchChange(id: string): void {
    this.selectedBranchId.set(id);
    this.selectedProfessionalIds.set([]); // Al cambiar de sucursal, reseteamos los filtros de profesionales
    this.loadProfessionals();
  }

  setView(view: AgendaViewType): void {
    this.selectedView.set(view);
  }

  toggleProfessional(id: string): void {
    const current = this.selectedProfessionalIds();
    if (current.includes(id)) {
      this.selectedProfessionalIds.set(current.filter((i) => i !== id));
    } else {
      this.selectedProfessionalIds.set([...current, id]);
    }
  }

  toggleAllProfessionals(): void {
    if (this.isAllProfessionalsSelected()) {
      // If all are selected (or none explicitly, which means all), we clear to "none" but in our logic none = all.
      // Wait, if I want to "deselect all", I should probably have a state where nothing is visible?
      // Usually "Todos" means showing all.
      this.selectedProfessionalIds.set(this.professionals().map((p) => p.id));
    } else {
      this.selectedProfessionalIds.set([]); // Logic: empty = all
    }
  }

  // Re-evaluating the logic:
  // Empty array = show all.
  // Full array = show all.
  // This might be confusing. Let's make it explicit:
  // selectedProfessionalIds should always contain what is checked.
  // On init, it should be empty (all).

  selectOnlyProfessional(id: string): void {
    this.selectedProfessionalIds.set([id]);
  }

  selectAllProfessionals(): void {
    this.selectedProfessionalIds.set([]);
  }

  toggleStatus(status: string): void {
    const current = this.selectedStatuses();
    if (current.includes(status)) {
      if (current.length > 1) {
        this.selectedStatuses.set(current.filter((s) => s !== status));
      } else {
        // Si es el último, activamos todos
        this.selectedStatuses.set([
          'PENDING',
          'CONFIRMED',
          'COMPLETED',
          'NO_SHOW',
          'CANCELLED',
        ]);
      }
    } else {
      this.selectedStatuses.set([...current, status]);
    }
  }

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status);
  }

  // ─── Diálogos ──────────────────────────────────────────────────────────────

  onAddAppointment(event: {
    professional: Professional;
    time: string;
    date?: Date;
    endTime?: string;
    x?: number;
    y?: number;
    type?: 'APPOINTMENT' | 'EXCEPTION';
  }): void {
    const isMobile = this.sidebarService.isMobile();

    // Si ya viene con el tipo (desde vista semanal con varios profs), vamos directo
    if (event.type) {
      if (event.type === 'APPOINTMENT') {
        this.openAppointmentForm(event);
      } else {
        this.openExceptionForm(event);
      }
      return;
    }

    if (isMobile) {
      this.openAppointmentForm(event);
      return;
    }

    const dialogRef = this.modal.open(AgendaActionSelectorComponent, {
      width: '200px',
      data: { x: event.x, y: event.y },
      hasBackdrop: false,
      panelClass: 'modal-panel-dropdown',
    });

    dialogRef.closed.subscribe((action) => {
      // Limpiar selecciones en las vistas al cerrar el selector
      this.dayView?.clearSelection();
      this.weekView?.clearSelection();

      if (!action) return;

      if (action === 'APPOINTMENT') {
        this.openAppointmentForm(event);
      } else if (action === 'EXCEPTION') {
        this.openExceptionForm(event);
      }
    });
  }

  onEditException(exception: AvailabilityException): void {
    // Buscar a qué profesional pertenece esta excepción
    const prof = this.professionals().find((p) =>
      p.exceptions?.some((e) => e.id === exception.id),
    );
    if (!prof) return;

    const dialogRef = this.modal.open(ProfessionalExceptionFormComponent, {
      data: {
        id: exception.id,
        professionalId: prof.id,
        date: exception.date,
        startTime: exception.startTime,
        endTime: exception.endTime,
        type: exception.type,
        reason: exception.reason,
      },
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.refreshView();
      }
    });
  }

  private openAppointmentForm(event: {
    professional: Professional;
    time: string;
    date?: Date;
    endTime?: string;
  }): void {
    const appointmentDate = event.date || this.selectedDate();
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        professionalId: event.professional.id,
        startTime: event.time,
        endTime: event.endTime,
        date: format(appointmentDate, 'yyyy-MM-dd'),
        branchId: this.selectedBranchId(),
      },
      width: '500px',
    });

    dialogRef.closed.subscribe((result) => {
      if (result) this.refreshView();
    });
  }

  private openExceptionForm(event: {
    professional: Professional;
    time: string;
    date?: Date;
    endTime?: string;
  }): void {
    const exceptionDate = event.date || this.selectedDate();
    let endTime = event.endTime;
    if (!endTime && event.time) {
      const [h, m] = event.time.split(':').map(Number);
      const totalMins = h * 60 + m + 15;
      const endH = Math.floor(totalMins / 60);
      const endM = totalMins % 60;
      endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    const dialogRef = this.modal.open(ProfessionalExceptionFormComponent, {
      data: {
        professionalId: event.professional.id,
        startTime: event.time,
        endTime: endTime || '',
        date: format(exceptionDate, 'yyyy-MM-dd'),
      },
      width: '450px',
    });

    dialogRef.closed.subscribe((result) => {
      if (result) this.refreshView();
    });
  }

  onEditAppointment(appointment: Appointment, newDate?: Date): void {
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        appointmentId: appointment.id,
        professionalId: appointment.professional?.id,
        branchId: appointment.branch?.id,
        date: newDate
          ? format(newDate, 'yyyy-MM-dd')
          : format(new Date(appointment.startTime), 'yyyy-MM-dd'),
        startTime: format(new Date(appointment.startTime), 'HH:mm'),
        endTime: format(new Date(appointment.endTime), 'HH:mm'),
        clientId: appointment.client?.id,
        serviceId: appointment.service?.id,
        status: appointment.status,
        notes: appointment.notes,
      },
      width: '500px',
    });

    dialogRef.closed.subscribe((result) => {
      if (result) this.refreshView();
    });
  }

  private refreshView(): void {
    this.loadProfessionals();
    this.selectedDate.set(new Date(this.selectedDate())); // Trigger re-render in views
  }

  openSettings(): void {
    this.modal.open(AgendaSettingsComponent, {
      width: '450px',
    });
  }

  private prefetchAdjacentPeriods(
    date: Date,
    view: AgendaViewType,
    branchId: string,
    statuses: string[],
  ) {
    const adjacentDates: Date[] = [];

    if (view === 'day') {
      adjacentDates.push(addDays(date, -1));
      adjacentDates.push(addDays(date, 1));
    } else if (view === 'week') {
      adjacentDates.push(addDays(date, -7));
      adjacentDates.push(addDays(date, 7));
    } else if (view === 'month' || view === 'list') {
      adjacentDates.push(addMonths(date, -1));
      adjacentDates.push(addMonths(date, 1));
    }

    adjacentDates.forEach((d) => {
      let startDate: string;
      let endDate: string;

      if (view === 'day') {
        startDate = startOfLocalDate(d).toISOString();
        endDate = endOfLocalDate(d).toISOString();
      } else if (view === 'week') {
        const start = startOfWeek(d, { weekStartsOn: 1 });
        const end = addDays(start, 6);
        startDate = startOfLocalDate(start).toISOString();
        endDate = endOfLocalDate(end).toISOString();
      } else {
        // month
        const start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(d), { weekStartsOn: 1 });
        startDate = startOfLocalDate(start).toISOString();
        endDate = endOfLocalDate(end).toISOString();
      }

      // Realizar la consulta para poblar el caché
      this.appointmentsService.prefetch({
        startDate,
        endDate,
        branchId,
        statuses,
      });
    });
  }
}
