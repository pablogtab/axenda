import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';

export interface CustomFieldListOption {
  id: string;
  label: string;
  order: number;
}

export interface CustomFieldList {
  id: string;
  name: string;
  options: CustomFieldListOption[];
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  entityType?: 'CLIENT' | 'APPOINTMENT';
  required: boolean;
  showInPublicView?: boolean;
  order: number;
  defaultValue?: string | null;
  listId?: string | null;
  list?: CustomFieldList | null;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  clientId?: string | null;
  appointmentId?: string | null;
  value?: string | null;
}

@Injectable({
  providedIn: 'root',
  })
export class CustomFieldsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/custom-fields`;
  private clientsApiUrl = `${environment.apiUrl}/clients`;
  private appointmentsApiUrl = `${environment.apiUrl}/appointments`;

  getDefinitions(entityType: 'CLIENT' | 'APPOINTMENT' = 'CLIENT'): Observable<CustomFieldDefinition[]> {
    return this.http.get<CustomFieldDefinition[]>(`${this.apiUrl}/definitions`, {
      params: { entityType },
    });
  }

  createDefinition(dto: {
    name: string;
    type: CustomFieldType;
    entityType?: 'CLIENT' | 'APPOINTMENT';
    listId?: string;
    required?: boolean;
    showInPublicView?: boolean;
    defaultValue?: string;
  }): Observable<CustomFieldDefinition> {
    return this.http.post<CustomFieldDefinition>(`${this.apiUrl}/definitions`, dto);
  }

  updateDefinition(
    id: string,
    dto: {
      name?: string;
      type?: CustomFieldType;
      entityType?: 'CLIENT' | 'APPOINTMENT';
      listId?: string;
      required?: boolean;
      showInPublicView?: boolean;
      order?: number;
      defaultValue?: string;
    },
  ): Observable<CustomFieldDefinition> {
    return this.http.patch<CustomFieldDefinition>(`${this.apiUrl}/definitions/${id}`, dto);
  }

  deleteDefinition(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/definitions/${id}`);
  }

  getLists(): Observable<CustomFieldList[]> {
    return this.http.get<CustomFieldList[]>(`${this.apiUrl}/lists`);
  }

  createList(dto: { name: string }): Observable<CustomFieldList> {
    return this.http.post<CustomFieldList>(`${this.apiUrl}/lists`, dto);
  }

  updateList(id: string, dto: { name: string }): Observable<CustomFieldList> {
    return this.http.patch<CustomFieldList>(`${this.apiUrl}/lists/${id}`, dto);
  }

  deleteList(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/lists/${id}`);
  }

  addOption(listId: string, dto: { label: string }): Observable<CustomFieldListOption> {
    return this.http.post<CustomFieldListOption>(`${this.apiUrl}/lists/${listId}/options`, dto);
  }

  updateOption(listId: string, optionId: string, dto: { label: string }): Observable<CustomFieldListOption> {
    return this.http.patch<CustomFieldListOption>(`${this.apiUrl}/lists/${listId}/options/${optionId}`, dto);
  }

  removeOption(listId: string, optionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/lists/${listId}/options/${optionId}`);
  }

  getClientValues(clientId: string): Observable<{ definitions: CustomFieldDefinition[]; values: CustomFieldValue[] }> {
    return this.http.get<{ definitions: CustomFieldDefinition[]; values: CustomFieldValue[] }>(
      `${this.clientsApiUrl}/${clientId}/custom-fields`,
    );
  }

  saveClientValues(clientId: string, values: Array<{ fieldId: string; value?: string }>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.clientsApiUrl}/${clientId}/custom-fields`, { values });
  }

  getAppointmentValues(appointmentId: string): Observable<{ definitions: CustomFieldDefinition[]; values: CustomFieldValue[] }> {
    return this.http.get<{ definitions: CustomFieldDefinition[]; values: CustomFieldValue[] }>(
      `${this.appointmentsApiUrl}/${appointmentId}/custom-fields`,
    );
  }

  saveAppointmentValues(appointmentId: string, values: Array<{ fieldId: string; value?: string }>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.appointmentsApiUrl}/${appointmentId}/custom-fields`, { values });
  }
}
