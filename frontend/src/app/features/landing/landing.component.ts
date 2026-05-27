import { Component, OnInit, OnDestroy, AfterViewInit, signal, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, IconComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit, OnDestroy, AfterViewInit {
  windowWidth = signal(window.innerWidth);

  constructor(private ngZone: NgZone) {}

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
  }
  features = [
    {
      icon: 'calendar_month',
      title: 'Agenda Interactiva',
      description: 'Gestioná tus turnos en una interfaz de alto rendimiento, diseñada para la velocidad y la facilidad de uso.'
    },
    {
      icon: 'chat',
      title: 'WhatsApp Automation',
      description: 'Reducí el ausentismo hasta un 80% con recordatorios automáticos. El sistema trabaja por vos 24/7.'
    },
    {
      icon: 'payments',
      title: 'Mercado Pago Connect',
      description: 'Asegurá tus ingresos cobrando señas o el total por adelantado. Integración nativa y sin intermediarios.'
    },
    {
      icon: 'star',
      title: 'Reseñas en Google',
      description: 'Mejorá tu reputación online solicitando reseñas automáticamente tras cada servicio exitoso.'
    },
    {
      icon: 'public',
      title: 'Reservas Online 24/7',
      description: 'Tu negocio nunca cierra. Permití que tus clientes agenden su próximo turno en cualquier momento y lugar.'
    },
    {
      icon: 'lan',
      title: 'Multi-Sede y Equipo',
      description: 'Escalá tu negocio administrando múltiples sucursales y controlando el desempeño de todo tu staff.'
    }
  ];

  testimonials = [
    {
      quote: "Axenda cambió la forma en que manejamos nuestra agenda. Los clientes valoran muchísimo la comodidad de reservar online.",
      author: "Marcos Ruiz",
      role: "Director de Ruiz Barbería",
      avatar: "MR"
    },
    {
      quote: "El recordatorio de WhatsApp redujo las inasistencias a casi cero. Es una herramienta indispensable para organizar mi día.",
      author: "Lucía Fernández",
      role: "Fundadora de LF Estética & Spa",
      avatar: "LF"
    },
    {
      quote: "Cobrar señas por adelantado nos dio la estabilidad financiera que necesitábamos. El sistema es impecable.",
      author: "Dr. Carlos Gómez",
      role: "Director de Gómez Kinesiología",
      avatar: "CG"
    },
    {
      quote: "Simple, rápido y con un diseño increíble. Llevo la gestión de mis clases de forma totalmente automatizada.",
      author: "Sonia Paz",
      role: "Co-fundadora de Paz Fitness Studio",
      avatar: "SP"
    },
    {
      quote: "Mis pacientes agendan en segundos. Nos ahorra horas de atención telefónica y mejora la experiencia general.",
      author: "Dr. Roberto Sosa",
      role: "Director de Clínica Dental DentalSosa",
      avatar: "RS"
    },
    {
      quote: "Una interfaz sofisticada y un soporte de primer nivel. Axenda superó todas nuestras expectativas.",
      author: "Elena Martínez",
      role: "Creadora de Sentir Wellness & Spa",
      avatar: "EM"
    },
    {
      quote: "Automatizar mis turnos me devolvió el tiempo para concentrarme en mis diseños y no en responder mensajes.",
      author: "Julián Vaca",
      role: "Artista Principal en Vaca Tattoo Studio",
      avatar: "JV"
    },
    {
      quote: "Administrar múltiples sucursales y profesionales ahora es sumamente sencillo. Las métricas son excepcionales.",
      author: "Mariana Silva",
      role: "Directora de Silva Coiffeur",
      avatar: "MS"
    },
    {
      quote: "Las reservas aumentaron de inmediato gracias al link de reserva en nuestro perfil. Altamente recomendado.",
      author: "Pablo Torales",
      role: "Fundador de Torales Pet Spa",
      avatar: "PT"
    },
    {
      quote: "Un sistema profesional y respetuoso con el tiempo del paciente. La mejor inversión tecnológica para mi consultorio.",
      author: "Lic. Ana Clara Rossi",
      role: "Psicóloga y Terapeuta",
      avatar: "AR"
    }
  ];

  faqs = [
    {
      question: '¿Puedo gestionar varias sucursales?',
      answer: 'Sí, Axenda está diseñado para negocios multi-sede. Podés administrar diferentes sucursales y ver la agenda de cada una desde un mismo panel centralizado.'
    },
    {
      question: '¿Cómo reservan mis clientes?',
      answer: 'Te proporcionamos un link único de reserva que podés poner en tu bio de Instagram o WhatsApp. Tus clientes verán tu disponibilidad real y agendarán en segundos.'
    },
    {
      question: '¿Necesito instalar algo?',
      answer: 'No. Axenda es una plataforma en la nube (SaaS). Podés acceder desde cualquier dispositivo con internet, ya sea PC, tablet o móvil, sin descargar ninguna app.'
    },
    {
      question: '¿Es seguro el acceso con Google?',
      answer: 'Totalmente. Utilizamos el estándar de Google OAuth para que puedas registrarte e ingresar con un solo clic, manteniendo tus datos protegidos por la seguridad de Google.'
    }
  ];

  currentIndex = signal(0);
  isTransitioning = signal(true);
  private intervalId: any;

  // Duplicamos testimonios para el efecto infinito
  displayTestimonials: any[] = [];

  ngOnInit(): void {
    this.shuffleTestimonials();
    this.displayTestimonials = [...this.testimonials, ...this.testimonials, ...this.testimonials];
    this.currentIndex.set(this.testimonials.length); // Empezamos en el medio
  }

  ngAfterViewInit(): void {
    // Pequeño delay para asegurar estabilidad inicial
    setTimeout(() => {
      this.startAutoPlay();
    }, 1000);
  }

  private shuffleTestimonials(): void {
    for (let i = this.testimonials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.testimonials[i], this.testimonials[j]] = [this.testimonials[j], this.testimonials[i]];
    }
  }

  next(): void {
    if (!this.isTransitioning()) return;
    
    this.currentIndex.update(idx => idx + 1);
    this.resetAutoPlay();

    if (this.currentIndex() >= this.testimonials.length * 2) {
      setTimeout(() => {
        this.isTransitioning.set(false);
        this.currentIndex.set(this.testimonials.length);
        setTimeout(() => this.isTransitioning.set(true), 50);
      }, 700); 
    }
  }

  prev(): void {
    if (!this.isTransitioning()) return;

    this.currentIndex.update(idx => idx - 1);
    this.resetAutoPlay();

    if (this.currentIndex() < this.testimonials.length) {
      setTimeout(() => {
        this.isTransitioning.set(false);
        this.currentIndex.set(this.testimonials.length * 2 - 1);
        setTimeout(() => this.isTransitioning.set(true), 50);
      }, 700);
    }
  }

  getSliderTransform(): string {
    const slidesVisible = this.windowWidth() < 768 ? 1 : (this.windowWidth() < 1024 ? 2 : 3);
    const offset = this.currentIndex() * (100 / slidesVisible);
    const transform = `translateX(-${offset}%)`;
    return transform;
  }

  goTo(index: number): void {
    this.currentIndex.set(this.testimonials.length + index);
    this.resetAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  private startAutoPlay(): void {
    this.stopAutoPlay(); 
    this.ngZone.runOutsideAngular(() => {
      this.intervalId = setTimeout(() => {
        this.ngZone.run(() => {
          this.next();
          this.startAutoPlay(); 
        });
      }, 4000);
    });
  }

  private stopAutoPlay(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  private resetAutoPlay(): void {
    this.stopAutoPlay();
    this.startAutoPlay();
  }
}
