import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:3000/api'; // Make sure this matches your backend!

  constructor(private http: HttpClient) { }

  processImage(imageStr: string, flowType: 'incoming' | 'outgoing'): Observable<any> {
    return this.http.post(`${this.baseUrl}/process-image`, {
      image: imageStr,
      flowType
    });
  }

  getLogs(filters?: { plateNumber?: string, date?: string }): Observable<any[]> {
    let queryParams: any = {};
    if (filters?.plateNumber) queryParams.plateNumber = filters.plateNumber;
    if (filters?.date) queryParams.date = filters.date;

    return this.http.get<any[]>(`${this.baseUrl}/logs`, { params: queryParams });
  }
}
