import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-process-carplate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './process-carplate.html'
})
export class ProcessCarplate {
  imagePreview = signal<string | null>(null);
  flowType = signal<'incoming' | 'outgoing'>('incoming');
  isProcessing = signal(false);
  errorMsg = signal<string | null>(null);
  
  rawResponse = signal<string | null>(null);
  statusResult = signal<{ status: string, message: string } | null>(null);

  constructor(private apiService: ApiService) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMsg.set('File exceeds 10MB limit.');
      this.imagePreview.set(null);
      return;
    }

    // Validate type
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      this.errorMsg.set('Only JPEG or PNG images are allowed.');
      this.imagePreview.set(null);
      return;
    }

    this.errorMsg.set(null);
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview.set(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  processImage() {
    const image = this.imagePreview();
    if (!image) {
      this.errorMsg.set('Please select an image first.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMsg.set(null);
    this.rawResponse.set(null);
    this.statusResult.set(null);

    this.apiService.processImage(image, this.flowType())
      .pipe(finalize(() => this.isProcessing.set(false)))
      .subscribe({
        next: (result) => {
          this.rawResponse.set(result.rawJson);

          let message = `Successfully updated with status: ${result.status}`;
          if (result.status === 'DENIED_UNREGISTERED') {
            message = 'Alert: Unregistered Vehicle Detected!';
          } else if (result.status === 'ENTERED') {
             message = 'Success: Vehicle Entered';
          } else if (result.status === 'EXITED') {
             message = 'Success: Vehicle Exited';
          } else if (result.status === 'ERROR_NO_ENTRY_FOUND') {
             message = 'Error: No entry log found for this outgoing vehicle.';
          }

          this.statusResult.set({ status: result.status, message });
        },
        error: (err) => {
          this.errorMsg.set(err.error?.error || 'Failed to process image via LLM plugin.');
          if (err.error?.rawJson) {
              this.rawResponse.set(err.error.rawJson);
          }
        }
      });
  }
}
