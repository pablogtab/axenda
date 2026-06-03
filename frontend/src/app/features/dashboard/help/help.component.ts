import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';

interface TutorialSection {
  id: string;
  title: string;
  description: string;
  items?: string[];
  tip?: string;
}

interface Tutorial {
  id: string;
  category: string;
  title: string;
  shortDescription: string;
  icon: string;
  sections: TutorialSection[];
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
<div class="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
    <div>
      <h1 class="text-3xl font-black tracking-tight text-gradient mb-1 select-none">Centro de Ayuda</h1>
      <p class="text-sm text-text-muted">Aprende a dominar Axenda con guías rápidas y explicaciones paso a paso.</p>
    </div>
    
    <!-- Search Bar -->
    <div class="relative w-full md:w-80 group">
      <app-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"></app-icon>
      <input 
        type="text" 
        [(ngModel)]="searchQuery"
        placeholder="Buscar un tutorial..." 
        class="w-full pl-11 pr-10 py-3 bg-white/5 border border-border hover:border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-2xl text-sm text-text-main placeholder-text-muted outline-none transition-all duration-300 backdrop-blur-md"
      />
      <button 
        *ngIf="searchQuery()" 
        (click)="clearSearch()"
        class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-text-muted hover:text-text-main transition-colors cursor-pointer"
      >
        <app-icon name="close" class="text-xs"></app-icon>
      </button>
    </div>
  </div>

  <!-- Categories Horizontal Scrolling / Tabs -->
  <div class="flex items-center gap-2 overflow-x-auto pb-2 -mx-6 px-6 custom-scrollbar shrink-0 select-none">
    <button 
      *ngFor="let cat of categories" 
      (click)="selectCategory(cat.id)"
      [class.active-cat]="selectedCategory() === cat.id"
      class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap bg-white/5 hover:bg-white/10 border border-border/40 hover:border-border text-text-muted hover:text-text-main transition-all duration-300 cursor-pointer active:scale-95"
    >
      <app-icon [name]="cat.icon" class="text-sm"></app-icon>
      {{ cat.label }}
    </button>
  </div>

  <!-- Tutorials Container -->
  <div class="grid grid-cols-1 gap-4" *ngIf="filteredTutorials().length > 0; else emptyState">
    <div 
      *ngFor="let tutorial of filteredTutorials()" 
      class="rounded-3xl border border-border/30 bg-surface/40 hover:bg-surface/60 transition-all duration-500 overflow-hidden relative group"
      [class.ring-1]="activeTutorialId() === tutorial.id"
      [class.ring-primary/40]="activeTutorialId() === tutorial.id"
      [class.border-primary/20]="activeTutorialId() === tutorial.id"
    >
      <!-- Card Header / Toggle -->
      <div 
        (click)="toggleTutorial(tutorial.id)"
        class="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <!-- Circle outline indicator like the image -->
          <div class="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center shrink-0 transition-all duration-500"
               [class.border-primary]="activeTutorialId() === tutorial.id"
               [class.text-primary]="activeTutorialId() === tutorial.id"
               [class.bg-primary/10]="activeTutorialId() === tutorial.id">
            <app-icon [name]="tutorial.icon" class="text-xs"></app-icon>
          </div>
          
          <div class="flex-1 min-w-0">
            <h3 class="text-sm md:text-base font-bold text-text-main group-hover:text-primary transition-colors duration-300">
              {{ tutorial.title }}
            </h3>
            <p class="text-xs text-text-muted leading-relaxed mt-0.5" *ngIf="activeTutorialId() !== tutorial.id">
              {{ tutorial.shortDescription }}
            </p>
          </div>
        </div>
        
        <button class="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 text-text-muted group-hover:text-text-main transition-all shrink-0">
          <app-icon 
            name="expand_more" 
            class="transition-transform duration-500"
            [class.rotate-180]="activeTutorialId() === tutorial.id"
          ></app-icon>
        </button>
      </div>

      <!-- Expanded Content (Split Sub-navigation and Content) -->
      <div 
        *ngIf="activeTutorialId() === tutorial.id" 
        class="border-t border-border/20 bg-black/20 animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-12"
      >
        <!-- Left Sub-Navigation Column -->
        <div class="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r border-border/10 p-5 space-y-4 select-none">
          <div class="text-[10px] font-black tracking-widest text-text-muted/60 uppercase px-1">Pasos de la guía</div>
          
          <!-- Stepper vertical path -->
          <div class="relative border-l border-border/30 pl-0 ml-1.5 space-y-1">
            <button 
              *ngFor="let sec of tutorial.sections" 
              (click)="selectSection(sec.id)"
              [class.active-sec]="activeSectionId() === sec.id"
              class="w-full text-left pl-4 pr-2 py-2 text-xs font-bold text-text-muted hover:text-text-main hover:bg-white/5 rounded-r-lg border-l-2 border-transparent -ml-[1.5px] transition-all duration-300 flex items-center justify-between group cursor-pointer"
            >
              <span>{{ sec.title }}</span>
              <app-icon name="chevron_right" class="text-xs opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary"></app-icon>
            </button>
          </div>
        </div>

        <!-- Right Content Column -->
        <div class="col-span-12 md:col-span-8 p-6 space-y-6" *ngIf="getActiveSection(tutorial) as section">
          <div>
            <h4 class="text-lg font-black text-text-main mb-2 tracking-tight">{{ section.title }}</h4>
            <p class="text-xs md:text-sm text-text-muted leading-relaxed" [innerHTML]="formatText(section.description)"></p>
          </div>

          <!-- Numbered Steps -->
          <div class="space-y-4" *ngIf="section.items && section.items.length > 0">
            <div 
              *ngFor="let item of section.items; let i = index" 
              class="flex gap-3 relative animate-in fade-in slide-in-from-left-2"
              [style.animation-delay]="(i * 50) + 'ms'"
            >
              <!-- Number badge (clean, styled like the image) -->
              <span class="text-sm md:text-base font-black text-primary shrink-0 select-none mt-0.5">{{ i + 1 }}.</span>
              
              <div class="flex-1">
                <p class="text-xs md:text-sm text-text-muted leading-relaxed mt-0.5" [innerHTML]="formatText(item)"></p>
              </div>
            </div>
          </div>

          <!-- Highlighted Tip inside active section -->
          <div 
            *ngIf="section.tip" 
            class="p-4 rounded-2xl bg-primary-glow border border-primary/20 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-500"
          >
            <app-icon name="lightbulb" class="text-primary text-base shrink-0 mt-0.5"></app-icon>
            <div class="text-xs md:text-sm leading-relaxed text-text-muted">
              <span class="font-bold text-primary mr-1">Tip:</span>
              <span [innerHTML]="formatText(section.tip)"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Empty Search State -->
  <ng-template #emptyState>
    <div class="flex flex-col items-center justify-center p-12 rounded-3xl border border-border/30 bg-surface/20 text-center animate-in fade-in duration-500">
      <div class="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 text-text-muted mb-4">
        <app-icon name="search_off" class="text-3xl"></app-icon>
      </div>
      <h3 class="text-base font-bold text-text-main mb-1">No se encontraron guías</h3>
      <p class="text-xs text-text-muted max-w-sm">Intenta buscar con otros términos o cambia la categoría seleccionada.</p>
    </div>
  </ng-template>
</div>
  `,
  styles: `
    .active-cat {
      background: var(--color-primary) !important;
      border-color: var(--color-primary) !important;
      color: #ffffff !important;
      box-shadow: 0 8px 16px -8px var(--color-primary);
    }

    .active-sec {
      border-left-color: var(--color-primary) !important;
      color: var(--color-primary) !important;
      background-color: var(--color-primary-glow) !important;
    }

    .custom-scrollbar::-webkit-scrollbar {
      height: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 99px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `
})
export class HelpComponent {
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  activeTutorialId = signal<string | null>(null);
  activeSectionId = signal<string | null>(null);

  categories = [
    { id: 'all', label: 'Todos', icon: 'grid_view' },
    { id: 'getting-started', label: 'Primeros Pasos', icon: 'auto_awesome' },
    { id: 'agenda', label: 'Agenda y Turnos', icon: 'calendar_month' },
    { id: 'services-staff', label: 'Servicios y Profesionales', icon: 'storefront' },
    { id: 'crm', label: 'Clientes (CRM)', icon: 'group' },
    { id: 'public-site', label: 'Sitio Público', icon: 'language' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' }
  ];

  tutorials = signal<Tutorial[]>([
    {
      id: 'configure-business',
      category: 'getting-started',
      title: 'Cómo configurar tu negocio y apariencia',
      shortDescription: 'Aprende a configurar los datos principales y la marca comercial de tu negocio.',
      icon: 'palette',
      sections: [
        {
          id: 'datos-negocio',
          title: 'Datos del Negocio',
          description: 'Completa la **información comercial básica** de tu establecimiento para que tus clientes puedan identificarte fácilmente.',
          items: [
            'Dirígete a **Configuración** y selecciona la pestaña **General** en la barra lateral.',
            'Completa los campos de **Nombre Comercial**, **Teléfono**, **Dirección** y **Descripción**.',
            'Presiona el botón `Guardar` para aplicar los cambios en todo el sistema.'
          ],
          tip: 'Esta información aparecerá al pie de página de tu _sitio de reservas público_ y en las confirmaciones por email y WhatsApp.'
        },
        {
          id: 'apariencia',
          title: 'Colores y Marca',
          description: 'Personaliza la **identidad visual** de tu negocio y sube tu logotipo para que el sitio público combine perfectamente con tu marca.',
          items: [
            'Ve a **Configuración > Apariencia**.',
            'Elige tu _color principal_, _color secundario_, _color de fondo_ y _color de texto_.',
            'Sube tu logotipo y el banner principal utilizando el selector de archivos.'
          ],
          tip: 'Sugerimos usar imágenes en formato `PNG` con fondo transparente para que se integre mejor con el diseño general.'
        }
      ]
    },
    {
      id: 'create-appointment',
      category: 'agenda',
      title: 'Cómo crear un nuevo turno manualmente',
      shortDescription: 'Aprende a agendar citas manualmente para tus clientes desde la agenda interna.',
      icon: 'add_task',
      sections: [
        {
          id: 'agenda-view',
          title: 'Acceder al Calendario',
          description: 'Visualiza la **agenda interactiva** en vista diaria, semanal o por profesionales.',
          items: [
            'Haz clic en **Agenda** en el menú de navegación izquierdo.',
            'Selecciona la **Sucursal** y la **Vista** (diaria, semanal, o por profesionales) en el panel de filtros.'
          ]
        },
        {
          id: 'agenda-booking',
          title: 'Formulario de Reserva',
          description: 'Completa los datos de la cita en el modal de **reserva rápida**.',
          items: [
            'Haz clic en cualquier celda de **horario disponible** en la columna del profesional deseado.',
            'Busca un cliente existente por **Nombre** o **Teléfono**, o créalo en el acto presionado `Nuevo Cliente`.',
            'Selecciona el **Servicio** a realizar (el sistema calculará el _precio y la duración_ automáticamente).',
            'Presiona el botón `Crear Turno`.'
          ],
          tip: 'Puedes reprogramar cualquier turno haciendo clic sobre la tarjeta y arrastrándola (_drag & drop_) a otro horario o profesional.'
        }
      ]
    },
    {
      id: 'block-time',
      category: 'agenda',
      title: 'Cómo bloquear horarios (vacaciones o feriados)',
      shortDescription: 'Configura licencias o bloqueos parciales para que no se puedan reservar ciertas horas.',
      icon: 'event_busy',
      sections: [
        {
          id: 'excepciones',
          title: 'Crear Excepción',
          description: 'Configura **bloques de tiempo** (excepciones de agenda) en los que no se ofrecerán turnos a tus clientes.',
          items: [
            'Dirínete a **Configuración > Profesionales**.',
            'Selecciona al profesional correspondiente haciendo clic en el botón de **Editar**.',
            'Ingresa a la pestaña **Excepciones** y presiona el botón `Agregar Excepción`.'
          ]
        },
        {
          id: 'definir-bloqueo',
          title: 'Tipos de Bloqueo',
          description: 'Elige el **tipo de bloqueo** y si aplica al día completo o solo a franjas horarias específicas.',
          items: [
            'Selecciona `Licencia` o `Feriado` para bloquear el día completo (vacaciones o días no laborables).',
            'Selecciona `Bloqueo Parcial` e indica la franja horaria (ej: de `13:00` a `14:00` por almuerzo).',
            'Guarda los cambios presionando el botón `Guardar`.'
          ],
          tip: 'Agrega un motivo aclaratorio al bloqueo para que todo tu equipo sepa por qué está inhabilitado el profesional en ese horario.'
        }
      ]
    },
    {
      id: 'configure-services',
      category: 'services-staff',
      title: 'Cómo configurar servicios y vincularlos a profesionales',
      shortDescription: 'Crea tu catálogo de servicios y define qué miembros del personal están habilitados para realizarlos.',
      icon: 'storefront',
      sections: [
        {
          id: 'categorias',
          title: 'Categorías y Catálogo',
          description: 'Crea y organiza tus **servicios** en la base de datos para mostrarlos ordenadamente.',
          items: [
            'Ve a **Configuración > Servicios**.',
            'Crea **Categorías** para clasificar tu oferta (ej: `Cortes`, `Estética`, `Coloración`).',
            'Presiona `Nuevo Servicio` y define el **Nombre**, **Duración** y **Precio** del mismo.'
          ]
        },
        {
          id: 'asignacion-profesional',
          title: 'Vincular Personal',
          description: 'Asigna qué profesionales de tu equipo están habilitados para realizar este servicio.',
          items: [
            'En el formulario del servicio, tilda las casillas de los **Profesionales correspondientes**.',
            'Presiona `Guardar`.'
          ]
        },
        {
          id: 'avanzado-servicios',
          title: 'Imágenes y Ajustes Avanzados',
          description: 'Personaliza la ficha del servicio subiendo fotos de tu trabajo y ajustando las políticas de reserva.',
          items: [
            'Sube hasta **5 imágenes** para crear una galería de fotos. La imagen seleccionada con una estrella actuará como la **Foto de Portada**.',
            'Define si deseas mostrar u ocultar la **Duración** y el **Precio** en el sitio de reservas público utilizando los interruptores correspondientes.',
            'Completa el campo **Etiqueta de Precio Personalizada** si quieres mostrar textos alternativos como `A consultar` o `Desde $1500` en lugar de una tarifa fija.',
            'Redacta las **Indicaciones para el Cliente** que se le mostrarán en pantalla antes de confirmar su turno (ej: `Asistir sin maquillaje`).',
            'Completa la lista de **Servicio Incluye** para detallar detalladamente qué insumos o etapas abarca la tarifa establecida.'
          ],
          tip: 'Puedes cambiar el orden de las fotos de tu galería arrastrándolas libremente (_drag & drop_).'
        }
      ]
    },
    {
      id: 'all-services-toggle',
      category: 'services-staff',
      title: 'Entendiendo la auto-asignación (allServices)',
      shortDescription: 'Sincroniza automáticamente a un profesional con todo tu catálogo de servicios.',
      icon: 'engineering',
      sections: [
        {
          id: 'activar-all-services',
          title: 'Activar allServices',
          description: 'Habilita la **auto-asignación** para que un profesional esté siempre vinculado a todos los servicios actuales y futuros.',
          items: [
            'Ve a **Configuración > Profesionales** y edita el perfil del profesional.',
            'Enciende el switch que dice `Realiza todos los servicios de la organización`.',
            'Presiona `Guardar` para aplicar el cambio.'
          ],
          tip: 'Cuando crees nuevos servicios en el futuro, este profesional quedará vinculado automáticamente sin tener que editar su ficha.'
        }
      ]
    },
    {
      id: 'custom-fields',
      category: 'crm',
      title: 'Cómo crear campos personalizados para clientes',
      shortDescription: 'Configura información técnica especial de tus clientes (alergias, obra social, tipo de cabello).',
      icon: 'edit_note',
      sections: [
        {
          id: 'definicion-campos',
          title: 'Definir Campos',
          description: 'Configura **campos personalizados** para guardar información relevante de tus clientes (alergias, historial, etc.).',
          items: [
            'Ve a **Configuración > Campos de Clientes**.',
            'Presiona el botón `Agregar Campo`.',
            'Elige un **Nombre** y selecciona el **Tipo de Dato** (ej: `Texto`, `Número`, `Desplegable`, `Booleano`).'
          ]
        },
        {
          id: 'ordenar-campos',
          title: 'Ordenar y Persistir',
          description: 'Define la prioridad y el orden de visualización de tus campos personalizados.',
          items: [
            'Usa el arrastre (_drag & drop_) para reordenar los campos según su importancia.',
            'Completa los valores de estos campos editando la ficha de cualquier cliente en el **CRM**.'
          ],
          tip: 'Puedes crear un máximo de `10 campos personalizados` para mantener la interfaz de carga limpia y ágil.'
        }
      ]
    },
    {
      id: 'client-tags',
      category: 'crm',
      title: 'Cómo etiquetar y categorizar clientes',
      shortDescription: 'Clasifica visualmente tu cartera de clientes mediante etiquetas de colores.',
      icon: 'label',
      sections: [
        {
          id: 'gestionar-etiquetas',
          title: 'Crear Etiquetas',
          description: 'Crea **Etiquetas de Clientes** con nombres y colores distintivos para segmentar tu base de datos.',
          items: [
            'Dirígete a la sección **Clientes** en el menú de navegación izquierdo.',
            'Presiona el botón `Etiquetas` en la parte superior y haz clic en `Nueva Etiqueta`.',
            'Asigna un **Nombre** (ej: `VIP`, `Deudor`, `Frecuente`) y elige un color de la paleta.'
          ]
        },
        {
          id: 'aplicar-filtros',
          title: 'Etiquetar y Filtrar',
          description: 'Aplica etiquetas a tus clientes y utiliza filtros para encontrarlos rápidamente.',
          items: [
            'Edita la ficha de cualquier cliente y tilda las etiquetas correspondientes.',
            'Usa el filtro de **Etiquetas** en la parte superior de la tabla del CRM para buscar grupos específicos.'
          ]
        }
      ]
    },
    {
      id: 'public-link',
      category: 'public-site',
      title: 'Cómo configurar y compartir tu link público de reserva',
      shortDescription: 'Permite que tus clientes reserven online de manera 100% automatizada.',
      icon: 'qr_code_2',
      sections: [
        {
          id: 'configurar-sitio',
          title: 'Configurar Sitio',
          description: 'Define el enlace personalizado y las políticas de reserva de tu **Sitio Público**.',
          items: [
            'Ve a **Configuración > Sitio Público**.',
            'Define tu **Slug Único** de reservas en el campo correspondiente (ej: `mi-salon`).',
            'Activa la casilla `Sitio Público Activo` para abrir la reserva online.',
            'Configura las políticas de reserva (ej: anticipación mínima de `2 horas`, cancelación de hasta `24 horas` antes).'
          ]
        },
        {
          id: 'compartir-qr',
          title: 'Código QR y Compartir',
          description: 'Difunde tu enlace de reservas a través de las redes sociales o en tu local físico.',
          items: [
            'Copia el **Enlace Directo** generado para agregarlo a tu biografía de _Instagram_ o enviarlo por WhatsApp.',
            'Presiona el botón `Descargar QR` para obtener el código listo para imprimir.'
          ],
          tip: 'Colocar el _código QR en un portarretratos_ en tu recepción incentiva a que los clientes reserven su próxima cita antes de retirarse del establecimiento.'
        }
      ]
    },
    {
      id: 'booking-invitations',
      category: 'public-site',
      title: 'Cómo generar links de invitación personalizados',
      shortDescription: 'Crea accesos temporales o con reglas y horarios específicos para ciertos clientes.',
      icon: 'send',
      sections: [
        {
          id: 'crear-invitacion',
          title: 'Generar Acceso',
          description: 'Crea un **Enlace de Invitación** privado con reglas personalizadas de reserva para clientes especiales.',
          items: [
            'Haz clic en **Invitaciones** en la barra lateral.',
            'Presiona el botón `Crear Link de Invitación` en la esquina superior derecha.',
            'Opcionalmente, restringe el enlace para un **Profesional**, **Sucursal** o **Cliente** específico.'
          ],
          tip: 'También puedes generar links de invitación personalizados directamente desde el **Listado de Clientes** en tu CRM, seleccionando a un cliente y haciendo clic en `Crear Invitación`.'
        },
        {
          id: 'restringir-horarios',
          title: 'Limitar Horarios y Usos',
          description: 'Configura la validez temporal y los límites de uso del enlace generado.',
          items: [
            'Configura la **franja horaria habilitada** (ej: `Solo Lunes de 14:00 a 18:00`).',
            'Define un _límite de usos_ o una _fecha de vencimiento_ y presiona `Guardar`.',
            'Copia el link resultante y compártelo de forma privada.'
          ]
        }
      ]
    },
    {
      id: 'whatsapp-setup',
      category: 'whatsapp',
      title: 'Cómo activar notificaciones de WhatsApp automáticas',
      shortDescription: 'Configura recordatorios y confirmaciones automáticas de turnos.',
      icon: 'notification_add',
      sections: [
        {
          id: 'notificaciones-base',
          title: 'Recordatorios Automáticos',
          description: 'Configura los **recordatorios automáticos** y notificaciones que se enviarán a tus clientes.',
          items: [
            'Dirígete a **Configuración > Sitio Público** y selecciona la pestaña **Notificaciones**.',
            'Enciende el switch de **Recordatorios de WhatsApp**.',
            'El sistema despachará los mensajes de forma automática _24 horas_ antes del inicio del turno.'
          ]
        }
      ]
    }
  ]);

  filteredTutorials = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();
    let list = this.tutorials();

    if (category !== 'all') {
      list = list.filter(t => t.category === category);
    }

    if (query) {
      list = list.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.shortDescription.toLowerCase().includes(query) ||
        t.sections.some(s => 
          s.title.toLowerCase().includes(query) || 
          s.description.toLowerCase().includes(query) ||
          s.items?.some(i => i.toLowerCase().includes(query))
        )
      );
    }

    return list;
  });

  formatText(text: string): string {
    if (!text) return '';
    return text
      // Replace links: [Text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="border-b border-primary/40 text-primary font-bold hover:border-primary pb-0.5 transition-colors">$1</a>')
      // Replace code blocks: `code`
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 mx-0.5 rounded bg-black/20 dark:bg-white/10 border border-border dark:border-white/5 text-primary dark:text-primary-dark font-mono text-[10px] md:text-[11px] font-bold">$1</code>')
      // Replace bold: **text**
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-text-main">$1</strong>')
      // Replace underlined / highlights: _text_
      .replace(/_([^_]+)_/g, '<span class="border-b border-primary/40 text-primary font-bold pb-0.5">$1</span>');
  }

  selectCategory(categoryId: string) {
    this.selectedCategory.set(categoryId);
    this.activeTutorialId.set(null);
    this.activeSectionId.set(null);
  }

  toggleTutorial(tutorialId: string) {
    if (this.activeTutorialId() === tutorialId) {
      this.activeTutorialId.set(null);
      this.activeSectionId.set(null);
    } else {
      this.activeTutorialId.set(tutorialId);
      const tut = this.tutorials().find(t => t.id === tutorialId);
      if (tut && tut.sections.length > 0) {
        this.activeSectionId.set(tut.sections[0].id);
      }
    }
  }

  selectSection(sectionId: string) {
    this.activeSectionId.set(sectionId);
  }

  getActiveSection(tutorial: Tutorial): TutorialSection | null {
    const activeSecId = this.activeSectionId();
    if (!activeSecId) return null;
    return tutorial.sections.find(s => s.id === activeSecId) || null;
  }

  clearSearch() {
    this.searchQuery.set('');
  }
}
