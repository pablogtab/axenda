import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectComponent, SelectConfig } from '../../../shared/components/select/select';

import { ProfessionalsListComponent } from '../professionals/professionals-list/professionals-list.component';
import { BranchesListComponent } from '../branches/branches-list/branches-list.component';
import { ServicesListComponent } from '../services/services-list/services-list.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    SelectComponent,
    ProfessionalsListComponent,
    BranchesListComponent,
    ServicesListComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  settingsForm: FormGroup;

  sections = [
    { id: 'business-info', title: 'Información del Negocio', icon: '🏢', description: 'Nombre, contacto y ubicación' },
    { id: 'booking-settings', title: 'Configuración de Reservas', icon: '📅', description: 'Antelación, intervalos y cancelaciones' },
    { id: 'notifications', title: 'Notificaciones', icon: '🔔', description: 'Mensajes automáticos y recordatorios' },
    { id: 'professionals', title: 'Profesionales', icon: '👨‍⚕️', description: 'Gestiona tu equipo de trabajo' },
    { id: 'branches', title: 'Sucursales', icon: '📍', description: 'Ubicaciones de tu negocio' },
    { id: 'services', title: 'Servicios', icon: '✂️', description: 'Catálogo de servicios y precios' }
  ];

  activeSection = 'business-info';

  // Configs for Selects
  categoryConfig: SelectConfig = {
    label: 'Categoría',
    placeholder: 'Seleccionar rubro...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  anticipationMinConfig: SelectConfig = {
    label: 'Tiempo mínimo',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  anticipationMaxConfig: SelectConfig = {
    label: 'Tiempo máximo',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  cancellationConfig: SelectConfig = {
    label: 'Límite para cancelar',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  // Options
  categories = [
    { label: 'Belleza y Estética', value: 'beauty' },
    { label: 'Salud', value: 'health' },
    { label: 'Deporte', value: 'fitness' },
    { label: 'Otro', value: 'other' }
  ];

  anticipationMinOptions = [
    { label: '1 hora antes', value: '1h' },
    { label: '2 horas antes', value: '2h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' }
  ];

  anticipationMaxOptions = [
    { label: '1 semana', value: '1w' },
    { label: '1 mes', value: '1m' },
    { label: '2 meses', value: '2m' },
    { label: '6 meses', value: '6m' }
  ];

  cancellationOptions = [
    { label: '1 hora antes', value: '1h' },
    { label: '6 horas antes', value: '6h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' },
    { label: 'No permitir cancelación online', value: 'never' }
  ];

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.fb.group({
      name: [''],
      category: ['beauty'],
      phone: [''],
      email: [''],
      address: [''],
      anticipationMin: ['1h'],
      anticipationMax: ['1m'],
      cancellationLimit: ['24h'],
      allowReschedule: [true],
      confirmEmail: [true],
      whatsappReminder: [false]
    });
  }

  setActiveSection(sectionId: string) {
    this.activeSection = sectionId;
  }

  save() {
    console.log('Settings saved:', this.settingsForm.value);
  }
}
