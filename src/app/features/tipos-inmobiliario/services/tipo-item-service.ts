import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { TipoItem } from '../models/tipo-item.model';
@Injectable({ providedIn: 'root' })
export class TipoItemService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  tiposItem() {
    return this.http.get<TipoItem[]>(`${this.base}/tipos-item`);
  }

  guardarTipoItem(id: number | null, nombreItem: string) {
    return id === null
      ? this.http.post<TipoItem>(`${this.base}/tipos-item`, { nombreItem })
      : this.http.put<TipoItem>(`${this.base}/tipos-item/${id}`, {
          nombreItem,
        });
  }
}
