import { Component, OnInit, OnDestroy, AfterViewInit, signal, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
      description: 'Visualizá tus turnos en una vista semanal o diaria moderna y fluida.'
    },
    {
      icon: 'groups',
      title: 'Gestión de Clientes',
      description: 'Centralizá la información de tus clientes y su historial de visitas en un solo lugar.'
    },
    {
      icon: 'storefront',
      title: 'Múltiples Sucursales',
      description: 'Administrá diferentes sedes de tu negocio desde una misma cuenta maestra.'
    },
    {
      icon: 'badge',
      title: 'Staff y Profesionales',
      description: 'Asigná horarios específicos y gestioná el desempeño de cada miembro de tu equipo.'
    },
    {
      icon: 'format_list_bulleted',
      title: 'Catálogo de Servicios',
      description: 'Configurá tus servicios, duraciones y precios de manera flexible y personalizada.'
    },
    {
      icon: 'public',
      title: 'Link de Reservas',
      description: 'Tus clientes podrán agendar turnos 24/7 a través de tu propia página pública.'
    }
  ];

  testimonials = [
    {
      quote: "Axenda cambió la forma en que manejamos nuestra barbería. Los clientes aman reservar por WhatsApp.",
      author: "Marcos Ruiz",
      role: "Dueño de The Barber Shop",
      avatar: "MR"
    },
    {
      quote: "Como esteticista, el recordatorio automático me salvó de perder muchísimas horas por inasistencias.",
      author: "Lucía Fernández",
      role: "Especialista en Estética",
      avatar: "LF"
    },
    {
      quote: "El sistema de cobro de señas es fantástico. Mis ingresos son mucho más estables ahora.",
      author: "Carlos Gómez",
      role: "Fisioterapeuta",
      avatar: "CG"
    },
    {
      quote: "Llevo el control de mi gimnasio boutique con Axenda. Es simple, rápido y muy profesional.",
      author: "Sonia Paz",
      role: "Directora de FitStudio",
      avatar: "SP"
    },
    {
      quote: "La mejor inversión para mi consultorio. Los pacientes valoran la rapidez de la agenda online.",
      author: "Dr. Roberto Sosa",
      role: "Odontólogo",
      avatar: "RS"
    },
    {
      quote: "Excelente soporte y una interfaz que mis clientes entienden a la primera. ¡100% recomendado!",
      author: "Elena Martínez",
      role: "Propietaria de Spa Sentir",
      avatar: "EM"
    },
    {
      quote: "Automatizar los turnos me permitió dedicarme más a mi arte y menos al teléfono.",
      author: "Julián Vaca",
      role: "Tatuador Senior",
      avatar: "JV"
    },
    {
      quote: "Axenda es intuitivo y potente. La gestión de múltiples sucursales es ahora una tarea fácil.",
      author: "Mariana Silva",
      role: "Gerente de Cadena de Salones",
      avatar: "MS"
    },
    {
      quote: "Desde que usamos Axenda, las reservas aumentaron un 30% gracias a la facilidad de uso.",
      author: "Pablo Torales",
      role: "Dueño de PetShop & Grooming",
      avatar: "PT"
    },
    {
      quote: "Un sistema que realmente entiende las necesidades de los pequeños negocios. Muy completo.",
      author: "Ana Clara Rossi",
      role: "Psicóloga",
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
