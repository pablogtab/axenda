import { Professional } from '@services/professionals.service';

export type AgendaViewType = 'day' | 'week' | 'month';

export interface AgendaViewData {
  date: Date;
  branchId: string | null;
  professionals: Professional[];
}
