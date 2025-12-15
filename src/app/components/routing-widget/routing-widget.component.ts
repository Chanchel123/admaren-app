import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RouteRequest {
  source: string;
  destination: string;
}

@Component({
  selector: 'app-routing-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './routing-widget.component.html',
  styleUrl: './routing-widget.component.scss'
})
export class RoutingWidgetComponent {
  routeRequested = output<RouteRequest>();

  source: string = '';
  destination: string = '';

  onRoute() {
    if (this.source.trim() && this.destination.trim()) {
      this.routeRequested.emit({
        source: this.source,
        destination: this.destination
      });
    }
  }
}
