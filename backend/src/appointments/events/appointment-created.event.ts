import { Appointment, Client, Professional, Service } from '@prisma/client';

export class AppointmentCreatedEvent {
  appointment: Appointment;
  client: Client;
  professional: Professional;
  service: Service;
  isPublic: boolean;
}
