import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RouteInput {
  source: string;
  destination: string;
}

@Component({
  selector: 'app-route-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-input.component.html',
  styleUrl: './route-input.component.scss'
})
export class RouteInputComponent {
  routeSubmitted = output<RouteInput>();
  
  source = signal('');
  destination = signal('');
  
  submitRoute() {
    if (this.source().trim() && this.destination().trim()) {
      this.routeSubmitted.emit({
        source: this.source(),
        destination: this.destination()
      });
    }
  }

  populateFromCoordinates(sourceName: string, destName: string) {
    this.source.set(sourceName);
    this.destination.set(destName);
  }

  clear() {
    this.source.set('');
    this.destination.set('');
  }
}
