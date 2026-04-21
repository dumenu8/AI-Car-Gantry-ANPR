import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-view-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './view-report.html'
})
export class ViewReport implements OnInit {
  logs = signal<any[]>([]);
  isLoading = signal(false);
  errorMsg = signal<string | null>(null);

  searchPlateNumber = signal('');
  searchDate = signal('');

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.fetchLogs();
  }

  fetchLogs() {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    
    this.apiService.getLogs({
      plateNumber: this.searchPlateNumber(),
      date: this.searchDate()
    }).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Failed to load logs.');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    this.fetchLogs();
  }
}
