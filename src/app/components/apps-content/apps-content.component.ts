import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent, type SelectedCoordinates } from '../map/map.component';
import { RouteInputComponent, type RouteInput } from '../route-input/route-input.component';
import { WeatherTableComponent, type LocationData } from '../weather-table/weather-table.component';
import { MapSelectorComponent } from '../map-selector/map-selector.component';

@Component({
  selector: 'app-apps-content',
  standalone: true,
  imports: [CommonModule, MapComponent, RouteInputComponent, WeatherTableComponent, MapSelectorComponent],
  templateUrl: './apps-content.component.html',
  styleUrl: './apps-content.component.scss'
})
export class AppsContentComponent {
  @ViewChild(MapComponent) mapComponent!: MapComponent;
  @ViewChild(RouteInputComponent) routeInputComponent!: RouteInputComponent;

  showWeatherTable = signal(false);
  selectedLocations = signal<LocationData[]>([]);
  mapMode = signal<'windy' | 'world'>('windy');

  onCoordinatesSelected(coords: SelectedCoordinates) {
    if (!coords.source || !coords.destination) return;

    this.showWeatherTable.set(true);

    // Store selected locations for weather report generation
    const locations: LocationData[] = [
      { name: `Cell ${coords.source.id}`, lat: coords.source.lat, lon: coords.source.lon },
      { name: `Cell ${coords.destination.id}`, lat: coords.destination.lat, lon: coords.destination.lon }
    ];
    this.selectedLocations.set(locations);

    // Auto-populate the input fields with selected coordinates
    if (this.routeInputComponent) {
      const sourceName = `Cell ${coords.source.id} (${coords.source.lat}, ${coords.source.lon})`;
      const destName = `Cell ${coords.destination.id} (${coords.destination.lat}, ${coords.destination.lon})`;
      this.routeInputComponent.populateFromCoordinates(sourceName, destName);
    }

    // Display the route on the map
    this.displayRoute(coords);
  }

  onRouteSubmitted(routeInput: RouteInput) {
    this.showWeatherTable.set(true);

    // Parse the input to extract coordinates if they're in the format provided
    // For now, we'll use demo coordinates
    const demoSourceCoords = { lat: -5, lon: -50 };
    const demoDestCoords = { lat: 52, lon: 4 };

    // Store selected locations for weather report generation
    const locations: LocationData[] = [
      { name: routeInput.source, lat: demoSourceCoords.lat, lon: demoSourceCoords.lon },
      { name: routeInput.destination, lat: demoDestCoords.lat, lon: demoDestCoords.lon }
    ];
    this.selectedLocations.set(locations);

    setTimeout(() => {
      if (this.mapComponent) {
        const routingDataArray = [
          {
            resultCode: 1,
            resultText: 'Success',
            totalDistance: 3437.611,
            secaDistance: 409.495,
            waypoints: [
              { lon: demoSourceCoords.lon, lat: demoSourceCoords.lat },
              { lon: -9.083805, lat: 4.960598 },
              { lon: -9.349902, lat: 4.983963 },
              { lon: -13.617811, lat: 7.637966 },
              { lon: -16.58219, lat: 10.075389 },
              { lon: -17.116978, lat: 10.530303 },
              { lon: -17.270271, lat: 10.788834 },
              { lon: -17.93297, lat: 14.760089 },
              { lon: -17.905676, lat: 21.839373 },
              { lon: -15.18922, lat: 27.694624 },
              { lon: -14.958293, lat: 28.254229 },
              { lon: -12.369281, lat: 35.719695 },
              { lon: -9.78027, lat: 43.185162 },
              { lon: -5.710487, lat: 48.644707 },
              { lon: -5.607274, lat: 48.773865 },
              { lon: -2.967768, lat: 49.861698 },
              { lon: 0.813471, lat: 50.564552 },
              { lon: 1.15082, lat: 50.730366 },
              { lon: 1.26832, lat: 50.875961 },
              { lon: 1.828752, lat: 51.118313 },
              { lon: 2.503295, lat: 51.373802 },
              { lon: 2.74375, lat: 51.369904 },
              { lon: 3.146918, lat: 51.38887 },
              { lon: 3.232663, lat: 51.412243 },
              { lon: 3.385849, lat: 51.408882 },
              { lon: 3.51702, lat: 51.417088 },
              { lon: 3.563883, lat: 51.406849 },
              { lon: 3.617764, lat: 51.43214 },
              { lon: 3.666794, lat: 51.443562 },
              { lon: 3.708766, lat: 51.415348 },
              { lon: 3.722498, lat: 51.372047 },
              { lon: 3.803158, lat: 51.348736 },
              { lon: 3.858948, lat: 51.343281 },
              { lon: 3.951613, lat: 51.381176 },
              { lon: 3.971, lat: 51.425972 },
              { lon: 3.980902, lat: 51.436588 },
              { lon: 3.997221, lat: 51.437878 },
              { lon: 4.011297, lat: 51.431892 },
              { lon: 4.034235, lat: 51.401314 },
              { lon: 4.043183, lat: 51.385376 },
              { lon: 4.058847, lat: 51.371914 },
              { lon: 4.105775, lat: 51.368511 },
              { lon: 4.142039, lat: 51.370174 },
              { lon: 4.189589, lat: 51.397694 },
              { lon: 4.205682, lat: 51.395592 },
              { lon: 4.222226, lat: 51.361317 },
              { lon: 4.268489, lat: 51.333038 },
              { lon: 4.280849, lat: 51.302448 },
              { lon: 4.320524, lat: 51.285164 },
              { lon: demoDestCoords.lon, lat: demoDestCoords.lat }
            ],
            metadata: '',
            arrived_flag: false
          }
        ];

        this.mapComponent.displayRoute(routingDataArray);
      }
    }, 100);
  }

  private displayRoute(coords: SelectedCoordinates) {
    if (!coords.source || !coords.destination) return;

    setTimeout(() => {
      if (this.mapComponent) {
        const routingDataArray = [
          {
            resultCode: 1,
            resultText: 'Success',
            totalDistance: 3437.611,
            secaDistance: 409.495,
            waypoints: [
              { lon: coords.source!.lon, lat: coords.source!.lat },
              { lon: -9.083805, lat: 4.960598 },
              { lon: -9.349902, lat: 4.983963 },
              { lon: -13.617811, lat: 7.637966 },
              { lon: -16.58219, lat: 10.075389 },
              { lon: -17.116978, lat: 10.530303 },
              { lon: -17.270271, lat: 10.788834 },
              { lon: -17.93297, lat: 14.760089 },
              { lon: -17.905676, lat: 21.839373 },
              { lon: -15.18922, lat: 27.694624 },
              { lon: -14.958293, lat: 28.254229 },
              { lon: -12.369281, lat: 35.719695 },
              { lon: -9.78027, lat: 43.185162 },
              { lon: -5.710487, lat: 48.644707 },
              { lon: -5.607274, lat: 48.773865 },
              { lon: -2.967768, lat: 49.861698 },
              { lon: 0.813471, lat: 50.564552 },
              { lon: 1.15082, lat: 50.730366 },
              { lon: 1.26832, lat: 50.875961 },
              { lon: 1.828752, lat: 51.118313 },
              { lon: 2.503295, lat: 51.373802 },
              { lon: 2.74375, lat: 51.369904 },
              { lon: 3.146918, lat: 51.38887 },
              { lon: 3.232663, lat: 51.412243 },
              { lon: 3.385849, lat: 51.408882 },
              { lon: 3.51702, lat: 51.417088 },
              { lon: 3.563883, lat: 51.406849 },
              { lon: 3.617764, lat: 51.43214 },
              { lon: 3.666794, lat: 51.443562 },
              { lon: 3.708766, lat: 51.415348 },
              { lon: 3.722498, lat: 51.372047 },
              { lon: 3.803158, lat: 51.348736 },
              { lon: 3.858948, lat: 51.343281 },
              { lon: 3.951613, lat: 51.381176 },
              { lon: 3.971, lat: 51.425972 },
              { lon: 3.980902, lat: 51.436588 },
              { lon: 3.997221, lat: 51.437878 },
              { lon: 4.011297, lat: 51.431892 },
              { lon: 4.034235, lat: 51.401314 },
              { lon: 4.043183, lat: 51.385376 },
              { lon: 4.058847, lat: 51.371914 },
              { lon: 4.105775, lat: 51.368511 },
              { lon: 4.142039, lat: 51.370174 },
              { lon: 4.189589, lat: 51.397694 },
              { lon: 4.205682, lat: 51.395592 },
              { lon: 4.222226, lat: 51.361317 },
              { lon: 4.268489, lat: 51.333038 },
              { lon: 4.280849, lat: 51.302448 },
              { lon: 4.320524, lat: 51.285164 },
              { lon: coords.destination!.lon, lat: coords.destination!.lat }
            ],
            metadata: '',
            arrived_flag: false
          }
        ];

        this.mapComponent.displayRoute(routingDataArray);
      }
    }, 100);
  }

  onMapModeChanged(mode: 'windy' | 'world') {
    this.mapMode.set(mode);
    // You can add logic here to switch between different map visualizations
    // For now, the map component will use this signal to determine what to display
  }
}
