import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';

export interface ClientFieldListOption {
  id: string;
  label: string;
  order: number;
}

export interface ClientFieldList {
  id: string;
  name: string;
  options: ClientFieldListOption[];
}

export interface ClientFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  order: number;
  defaultValue?: string | null;
  listId?: string | null;
  list?: ClientFieldList | null;
}

export interface ClientFieldValue {
  id: string;
  fieldId: string;
  clientId: string;
  value?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CustomFieldsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/custom-fields`;
  private clientsApiUrl = `${environment.apiUrl}/clients`;

  getDefinitions(): Observable<ClientFieldDefinition[]> {
    return this.http.get<ClientFieldDefinition[]>(`${this.apiUrl}/definitions`);
  }

  createDefinition(dto: {
    name: string;
    type: CustomFieldType;
    listId?: string;
    required?: boolean;
    defaultValue?: string;
  }): Observable<ClientFieldDefinition> {
    return this.http.post<ClientFieldDefinition>(`${this.apiUrl}/definitions`, dto);
  }

  updateDefinition(
    id: string,
    dto: {
      name?: string;
      type?: CustomFieldType;
      listId?: string;
      required?: boolean;
      order?: number;
      defaultValue?: string;
    },
  ): Observable<ClientFieldDefinition> {
    return this.http.patch<ClientFieldDefinition>(`${this.apiUrl}/definitions/${id}`, dto);
  }

  deleteDefinition(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/definitions/${id}`);
  }

  getLists(): Observable<ClientFieldList[]> {
    return this.http.get<ClientFieldList[]>(`${this.apiUrl}/lists`);
  }

  createList(dto: { name: string }): Observable<ClientFieldList> {
    return this.http.post<ClientFieldList>(`${this.apiUrl}/lists`, dto);
  }

  updateList(id: string, dto: { name: string }): Observable<ClientFieldList> {
    return this.http.patch<ClientFieldList>(`${this.apiUrl}/lists/${id}`, dto);
  }

  deleteList(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/lists/${id}`);
  }

  addOption(listId: string, dto: { label: string }): Observable<ClientFieldListOption> {
    return this.http.post<ClientFieldListOption>(`${this.apiUrl}/lists/${listId}/options`, dto);
  }

  updateOption(listId: string, optionId: string, dto: { label: string }): Observable<ClientFieldListOption> {
    return this.http.patch<ClientFieldListOption>(`${this.apiUrl}/lists/${listId}/options/${optionId}`, dto);
  }

  removeOption(listId: string, optionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/lists/${listId}/options/${optionId}`);
  }

  getClientValues(clientId: string): Observable<{ definitions: ClientFieldDefinition[]; values: ClientFieldValue[] }> {
    return this.http.get<{ definitions: ClientFieldDefinition[]; values: ClientFieldValue[] }>(
      `${this.clientsApiUrl}/${clientId}/custom-fields`,
    );
  }

  saveClientValues(clientId: string, values: Array<{ fieldId: string; value?: string }>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.clientsApiUrl}/${clientId}/custom-fields`, { values });
  }
}
