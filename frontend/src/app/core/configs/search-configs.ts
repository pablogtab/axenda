import { SearchableSelectConfig } from '@shared/components/searchable-select/searchable-select';
import { ClientsService, Client } from '@services/clients.service';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { map } from 'rxjs';

/**
 * Configuración por defecto para el buscador de Clientes
 */
export const getClientSearchConfig = (clientsService: ClientsService): SearchableSelectConfig<Client> => ({
  label: 'Cliente',
  placeholder: 'Buscar cliente por nombre o teléfono...',
  searchFn: (q) => clientsService.findAll(1, 10, q).pipe(map(res => res.items)),
  displayFn: (c) => `${c.firstName} ${c.lastName}`,
  descriptionFn: (c) => c.phone || 'Sin teléfono',
  valueFn: (c) => c.id,
  initItemFn: (id) => clientsService.findOne(id)
});

/**
 * Configuración por defecto para el buscador de Profesionales
 */
export const getProfessionalSearchConfig = (professionalsService: ProfessionalsService): SearchableSelectConfig<Professional> => ({
  label: '👨‍⚕️ Profesional',
  placeholder: 'Buscar profesional...',
  searchFn: (q) => professionalsService.search(q), // Asumiendo que implementaremos search en ProfessionalsService
  displayFn: (p) => `${p.firstName} ${p.lastName}`,
  descriptionFn: (p) => p.bio || 'Profesional',
  valueFn: (p) => p.id,
  initItemFn: (id) => professionalsService.findOne(id)
});
