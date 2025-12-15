import { Component, OnInit, signal, output, input, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import L from 'leaflet';
import { WindyWeatherService } from '../../services/windy-weather.service';

export interface Waypoint {
  lat: number;
  lon: number;
}

export interface RoutingData {
  resultCode: number;
  resultText: string;
  totalDistance: number;
  secaDistance: number;
  waypoints: Waypoint[];
  metadata: string | null;
  arrived_flag: boolean;
}

export interface GridCell {
  id: number;
  lat: number;
  lon: number;
  row: number;
  col: number;
}

export interface SelectedCoordinates {
  source: GridCell | null;
  destination: GridCell | null;
}

export interface WindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  brightness: number;
}

export type WeatherLayer = 'wind' | 'temperature' | 'pressure' | 'humidity' | 'cape';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  providers: [WindyWeatherService]
})
export class MapComponent implements OnInit, AfterViewInit {
  /**
   * Map mode: 'windy' for weather visualization, 'world' for standard map
   */
  mapMode = input<'windy' | 'world'>('windy');
  currentWeatherLayer = signal<WeatherLayer>('wind');
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  map: L.Map | null = null;
  routeLayerGroup: L.FeatureGroup | null = null;
  gridLayerGroup: L.FeatureGroup | null = null;
  weatherLayerGroup: L.FeatureGroup | null = null;
  gridCells = signal<GridCell[]>([]);
  selectedCoordinates = signal<SelectedCoordinates>({
    source: null,
    destination: null
  });
  selectionMode = signal<'source' | 'destination'>('source');
  coordinatesSelected = output<SelectedCoordinates>();
  showingRoute = signal(false);

  private gridRows = 18;
  private gridCols = 36;
  private latStep = 10;
  private lonStep = 10;
  private gridMarkers: Map<number, L.Layer> = new Map();
  private currentMapMode: 'windy' | 'world' = 'windy';
  private animationFrameId: number | null = null;
  private particleSystem: WindParticle[] = [];
  private weatherCache: Map<string, any> = new Map();
  private currentWeatherData: any = null;

  constructor(private weatherService: WindyWeatherService) {
    effect(() => {
      const mode = this.mapMode();
      if (this.map && mode !== this.currentMapMode) {
        this.currentMapMode = mode;
        this.updateMapVisualization(mode);
      }
    });
  }

  ngOnInit() {
    this.generateGrid();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }

  private generateGrid() {
    const cells: GridCell[] = [];
    let id = 1;

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const lat = 90 - (row * this.latStep + this.latStep / 2);
        const lon = -180 + (col * this.lonStep + this.lonStep / 2);

        cells.push({
          id,
          lat: Math.round(lat * 100) / 100,
          lon: Math.round(lon * 100) / 100,
          row,
          col
        });
        id++;
      }
    }

    this.gridCells.set(cells);
  }

  private initializeMap() {
    // Initialize map centered on world view
    this.map = L.map('map', { 
      zoomControl: true,
      attributionControl: true 
    }).setView([20, 0], 3);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Create feature groups
    this.routeLayerGroup = L.featureGroup().addTo(this.map);
    this.gridLayerGroup = L.featureGroup().addTo(this.map);
    this.weatherLayerGroup = L.featureGroup().addTo(this.map);

    // Add grid to map
    this.addGridToMap();
    this.updateMapVisualization(this.mapMode());
  }

  private addGridToMap() {
    if (!this.map || !this.gridLayerGroup) return;

    const cells = this.gridCells();
    const gridLayer = this.gridLayerGroup;
    const self = this;

    cells.forEach((cell) => {
      // Create rectangle for each grid cell
      const latMin = cell.lat - this.latStep / 2;
      const latMax = cell.lat + this.latStep / 2;
      const lonMin = cell.lon - this.lonStep / 2;
      const lonMax = cell.lon + this.lonStep / 2;

      const bounds: L.LatLngBoundsExpression = [
        [latMin, lonMin],
        [latMax, lonMax]
      ];

      const rectangle = L.rectangle(bounds, {
        color: '#667eea',
        weight: 1,
        opacity: 0.5,
        fillColor: '#667eea',
        fillOpacity: 0.1
      });

      // Make rectangle clickable
      rectangle.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        self.selectCell(cell);
      });

      rectangle.on('mouseover', () => {
        rectangle.setStyle({
          fillOpacity: 0.2,
          weight: 2
        });
      });

      rectangle.on('mouseout', () => {
        rectangle.setStyle({
          fillOpacity: 0.1,
          weight: 1
        });
      });

      rectangle.bindPopup(
        `<b>Grid Cell ${cell.id}</b><br>` +
        `Lat: ${cell.lat}, Lon: ${cell.lon}<br>` +
        `<small>Click to select</small>`
      );

      rectangle.addTo(gridLayer);

      // Create a custom marker with label
      const marker = L.marker([cell.lat, cell.lon], {
        icon: L.divIcon({
          html: `<div class="grid-number" style="
            background: white;
            border: 2px solid #667eea;
            border-radius: 4px;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 11px;
            color: #667eea;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          ">${cell.id}</div>`,
          className: 'grid-label-marker',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        })
      });

      marker.on('click', () => {
        self.selectCell(cell);
      });

      marker.addTo(gridLayer);
      this.gridMarkers.set(cell.id, marker);
    });
  }

  selectCell(cell: GridCell) {
    const mode = this.selectionMode();
    const current = this.selectedCoordinates();

    if (mode === 'source') {
      this.selectedCoordinates.set({
        source: cell,
        destination: current.destination
      });
      this.selectionMode.set('destination');
    } else {
      this.selectedCoordinates.set({
        source: current.source,
        destination: cell
      });
      // Emit the coordinates when both are selected
      this.coordinatesSelected.emit(this.selectedCoordinates());
      this.showingRoute.set(true);
    }

    // Update visualization to highlight selected cells
    this.updateMapVisualization(this.mapMode());
  }

  resetSelection() {
    this.selectedCoordinates.set({ source: null, destination: null });
    this.selectionMode.set('source');
    this.showingRoute.set(false);

    // Clear route
    if (this.routeLayerGroup) {
      this.routeLayerGroup.clearLayers();
    }
  }

  displayRoute(routingDataArray: RoutingData[]) {
    if (!this.map || !this.routeLayerGroup) return;

    const layerGroup = this.routeLayerGroup;
    const map = this.map;

    // Clear previous route
    layerGroup.clearLayers();

    if (!routingDataArray || routingDataArray.length === 0) return;

    // Process each route segment
    routingDataArray.forEach((routingData, segmentIndex) => {
      const waypoints = routingData.waypoints;

      if (!waypoints || waypoints.length === 0) return;

      // Convert waypoints to leaflet coordinates [lat, lng]
      const coordinates: [number, number][] = waypoints.map(wp => [wp.lat, wp.lon]);

      // Add markers for start and end of this segment
      if (segmentIndex === 0) {
        // First segment - add source marker
        const sourceCoord = coordinates[0];
        L.circleMarker(sourceCoord, {
          radius: 10,
          fillColor: '#667eea',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9
        }).bindPopup(`<b>Source Port</b><br>Start of Route`)
          .addTo(layerGroup);
      }

      if (segmentIndex === routingDataArray.length - 1) {
        // Last segment - add destination marker
        const destCoord = coordinates[coordinates.length - 1];
        L.circleMarker(destCoord, {
          radius: 10,
          fillColor: '#764ba2',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9
        }).bindPopup(`<b>Destination Port</b><br>End of Route`)
          .addTo(layerGroup);
      }

      // Draw route polyline
      const polyline = L.polyline(coordinates, {
        color: '#667eea',
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).bindPopup(
        `<b>Route Segment ${segmentIndex + 1}</b><br>` +
        `Distance: ${routingData.totalDistance.toFixed(2)} km<br>` +
        `SECA Distance: ${routingData.secaDistance.toFixed(2)} km`
      ).addTo(layerGroup);

      // Add intermediate waypoint markers (every 5th point to avoid clutter)
      for (let i = 1; i < coordinates.length - 1; i += 5) {
        L.circleMarker(coordinates[i], {
          radius: 4,
          fillColor: '#FFD700',
          color: '#fff',
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.7
        }).addTo(layerGroup);
      }
    });

    // Fit map to all routes
    const bounds = (layerGroup as any).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  /**
   * Update map visualization based on selected mode
   */
  private updateMapVisualization(mode: 'windy' | 'world') {
    if (!this.map || !this.weatherLayerGroup) return;

    if (mode === 'windy') {
      this.showWeatherVisualization();
    } else {
      this.showWorldMap();
    }
  }

  /**
   * Show Windy.com style weather visualization with particle effects
   */
  private showWeatherVisualization() {
    if (!this.map || !this.weatherLayerGroup) return;

    // Clear existing layers
    this.weatherLayerGroup.clearLayers();

    // Stop any existing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Create canvas layer for weather visualization
    const canvas = document.createElement('canvas');
    canvas.id = 'weather-canvas';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create Leaflet custom layer
    const WeatherLayer = L.Layer.extend({
      onAdd: (map: L.Map) => {
        const container = document.querySelector('.leaflet-overlay-pane');
        if (!container) return;

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        canvas.style.position = 'absolute';
        canvas.style.zIndex = '200';
        container.appendChild(canvas);

        // Initialize particle system for wind visualization
        this.initializeParticleSystem();
        this.animateWeatherVisualization(map, canvas, ctx);
      },
      onRemove: () => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
      }
    });

    const weatherLayer = new WeatherLayer();
    this.weatherLayerGroup.addLayer(weatherLayer);

    // Add temperature heatmap underneath
    this.addTemperatureHeatmap();
  }

  /**
   * Initialize particle system for wind visualization with real wind data
   */
  private initializeParticleSystem() {
    this.particleSystem = [];

    // Get center of map for wind data
    if (!this.map) return;

    const center = this.map.getCenter();
    const particleCount = 2500; // Increased for denser visualization

    // Fetch real wind data from Windy service
    this.weatherService.getWeatherData(center.lat, center.lng).subscribe(weatherData => {
      this.currentWeatherData = weatherData;
      const windSpeedMs = weatherData.wind.speed;
      const windDirectionDeg = weatherData.wind.direction;
      const windAngleRad = windDirectionDeg * Math.PI / 180;

      // Create particles aligned with real wind direction with varied speeds
      for (let i = 0; i < particleCount; i++) {
        // Add variation in particle speeds for more organic flow
        const speedVariation = 0.8 + Math.random() * 0.4;
        const vx = Math.cos(windAngleRad) * (windSpeedMs / 4) * speedVariation + (Math.random() - 0.5) * 1;
        const vy = Math.sin(windAngleRad) * (windSpeedMs / 4) * speedVariation + (Math.random() - 0.5) * 1;

        this.particleSystem.push({
          x: Math.random() * 1000,
          y: Math.random() * 600,
          vx,
          vy,
          age: 0,
          life: Math.random() * 150 + 100,
          brightness: Math.random() * 0.5 + 0.5
        });
      }
    });
  }

  /**
   * Animate weather particles with real wind data
   */
  private animateWeatherVisualization(map: L.Map, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    // Fetch real weather data for proper coloring
    const center = map.getCenter();
    let realWeatherData: any = null;

    this.weatherService.getWeatherData(center.lat, center.lng).subscribe(data => {
      realWeatherData = data;
      this.currentWeatherData = data;
    });

    const animate = () => {
      // Advanced motion blur with multiple layers
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply decay to existing pixels for motion blur
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * 0.88);     // Red
        data[i + 1] = Math.round(data[i + 1] * 0.88); // Green
        data[i + 2] = Math.round(data[i + 2] * 0.88); // Blue
        // Alpha stays same
      }
      ctx.putImageData(imageData, 0, 0);

      // Update and draw particles with enhanced wind visualization
      this.particleSystem.forEach((particle) => {
        // Update particle position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.age += 1;

        // Add turbulence with gusts
        const gustFactor = Math.sin(particle.age * 0.02) * 0.5;
        particle.vx += (Math.random() - 0.5) * 0.4 + gustFactor * 0.2;
        particle.vy += (Math.random() - 0.5) * 0.4 + gustFactor * 0.2;

        // Smooth wrapping at edges instead of bouncing
        if (particle.x < -50) particle.x = canvas.width + 50;
        if (particle.x > canvas.width + 50) particle.x = -50;
        if (particle.y < -50) particle.y = canvas.height + 50;
        if (particle.y > canvas.height + 50) particle.y = -50;

        // Calculate opacity with smooth fade
        const ageRatio = particle.age / particle.life;
        const opacity = particle.brightness * (1 - ageRatio * ageRatio) * 0.9;
        const speed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);

        // Use real wind data for color if available
        let color = '#00BFFF';
        if (realWeatherData) {
          color = this.getLayerColor(this.currentWeatherLayer(), realWeatherData, speed);
        } else {
          color = this.getSpeedBasedColor(speed);
        }

        // Draw particle with line trail
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 0.8 + speed * 0.25;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(particle.x - particle.vx * 0.8, particle.y - particle.vy * 0.8);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();

        // Reset dead particles with new life
        if (particle.age > particle.life) {
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
          particle.age = 0;
          particle.life = Math.random() * 150 + 100;
          particle.brightness = Math.random() * 0.5 + 0.5;
        }
      });

      ctx.globalAlpha = 1;

      // Draw enhanced wind streamlines with real data
      this.drawEnhancedWindStreamlines(ctx, canvas, realWeatherData);

      // Draw additional layer effects
      this.drawLayerOverlay(ctx, canvas, realWeatherData);

      // Draw route highlighting if selected
      const selectedCoords = this.selectedCoordinates();
      if (selectedCoords.source && selectedCoords.destination) {
        this.drawRouteHighlight(ctx, canvas);
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Draw wind flow streamlines for visual effect
   */
  private drawWindStreamlines(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, weatherData?: any) {
    const gridSpacing = 80;
    const time = Date.now() * 0.001;

    for (let x = 0; x < canvas.width; x += gridSpacing) {
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        let windAngle: number;
        let windSpeed: number;

        // Use real weather data if available
        if (weatherData) {
          const direction = weatherData.wind.direction * Math.PI / 180;
          windAngle = direction;
          windSpeed = Math.max(2, weatherData.wind.speed / 3);
        } else {
          // Fallback simulation
          windAngle = Math.sin(x * 0.01 + time) * Math.PI + Math.cos(y * 0.01 + time) * Math.PI;
          windSpeed = Math.sin(time) * 3 + 4;
        }

        const endX = x + Math.cos(windAngle) * windSpeed * 20;
        const endY = y + Math.sin(windAngle) * windSpeed * 20;

        // Use real wind color if available
        const color = weatherData ?
          this.weatherService.getWindSpeedColor(weatherData.wind.speed) :
          'rgba(100, 150, 255, 0.15)';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrowhead
        const arrowSize = 8;
        const angle = Math.atan2(endY - y, endX - x);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
      }
    }
  }

  /**
   * Draw enhanced wind streamlines with better visual effects
   */
  private drawEnhancedWindStreamlines(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, weatherData?: any) {
    const gridSpacing = 60;
    const time = Date.now() * 0.0008;

    for (let x = 20; x < canvas.width; x += gridSpacing) {
      for (let y = 20; y < canvas.height; y += gridSpacing) {
        let windAngle: number;
        let windSpeed: number;

        if (weatherData) {
          const direction = weatherData.wind.direction * Math.PI / 180;
          windAngle = direction;
          windSpeed = Math.max(1, weatherData.wind.speed / 2.5);
        } else {
          windAngle = Math.sin(x * 0.015 + time) * Math.PI + Math.cos(y * 0.015 + time) * Math.PI;
          windSpeed = Math.sin(time) * 4 + 5;
        }

        const lineLength = Math.max(20, windSpeed * 18);
        const endX = x + Math.cos(windAngle) * lineLength;
        const endY = y + Math.sin(windAngle) * lineLength;

        // Draw main streamline with gradient effect
        const color = weatherData ?
          this.getLayerColor(this.currentWeatherLayer(), weatherData, windSpeed) :
          'rgba(150, 180, 255, 0.4)';

        // Main line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead with better styling
        const arrowSize = 6;
        const angle = Math.atan2(endY - y, endX - x);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 5), endY - arrowSize * Math.sin(angle - Math.PI / 5));
        ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 5), endY - arrowSize * Math.sin(angle + Math.PI / 5));
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
      }
    }
  }

  /**
   * Draw layer-specific overlay effects (temperature, pressure, humidity, etc.)
   */
  private drawLayerOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, weatherData?: any) {
    const layer = this.currentWeatherLayer();

    if (!weatherData) return;

    switch (layer) {
      case 'temperature':
        this.drawTemperatureOverlay(ctx, canvas, weatherData);
        break;
      case 'pressure':
        this.drawPressureOverlay(ctx, canvas, weatherData);
        break;
      case 'humidity':
        this.drawHumidityOverlay(ctx, canvas, weatherData);
        break;
      case 'cape':
        this.drawCapeOverlay(ctx, canvas, weatherData);
        break;
    }
  }

  /**
   * Draw temperature gradient overlay
   */
  private drawTemperatureOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, weatherData: any) {
    const temp = weatherData.temp || 15;
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    // Create subtle temperature gradient overlay
    const tempNormalized = Math.max(-40, Math.min(50, temp)) / 90 + 0.5;

    for (let i = 0; i < data.length; i += 4) {
      if (temp < 0) {
        data[i] = Math.floor(200 * (1 - tempNormalized));      // Red
        data[i + 1] = Math.floor(220 * (1 - tempNormalized));  // Green
        data[i + 2] = 255;                                      // Blue
      } else {
        data[i] = Math.floor(255 * tempNormalized);      // Red
        data[i + 1] = Math.floor(150 * (1 - tempNormalized)); // Green
        data[i + 2] = Math.floor(50 * (1 - tempNormalized));  // Blue
      }
      data[i + 3] = 8; // Very transparent
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Draw pressure-based overlay
   */
  private drawPressureOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, weatherData: any) {
    const pressure = weatherData.pressure || 101325;
    const pressureNormalized = (pressure - 99000) / 4000; // Normalize to 0-1

    // Draw subtle pressure contours
    ctx.strokeStyle = `rgba(200, 150, 100, ${0.1 * (1 - Math.abs(pressureNormalized - 0.5))})`;
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += 40) {
      for (let y = 0; y < canvas.height; y += 40) {
        const radius = 20 + pressureNormalized * 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /**
   * Draw humidity-based overlay
   */
  private drawHumidityOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, weatherData: any) {
    const humidity = weatherData.rh || 60;
    const humidityNormalized = humidity / 100;

    // Draw humidity fog effect
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;     // Red
      data[i + 1] = 220; // Green
      data[i + 2] = 255; // Blue
      data[i + 3] = Math.floor(humidityNormalized * 15); // Alpha based on humidity
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Draw CAPE (convective energy) overlay
   */
  private drawCapeOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, weatherData: any) {
    const cape = weatherData.cape || 0;
    const capeNormalized = Math.min(cape / 3000, 1);

    // Draw storm potential visualization
    ctx.fillStyle = `rgba(255, 100, 100, ${capeNormalized * 0.2})`;
    for (let x = 0; x < canvas.width; x += 50) {
      for (let y = 0; y < canvas.height; y += 50) {
        if (Math.random() < capeNormalized) {
          ctx.fillRect(x, y, 40, 40);
        }
      }
    }
  }

  /**
   * Get color based on weather layer type
   */
  private getLayerColor(layer: WeatherLayer, weatherData: any, speed?: number): string {
    switch (layer) {
      case 'wind':
        return this.weatherService.getWindSpeedColor(weatherData.wind.speed);
      case 'temperature':
        return this.weatherService.getTemperatureColor(weatherData.temp);
      case 'pressure':
        return this.weatherService.getPressureColor(weatherData.pressure);
      case 'humidity':
        return this.getHumidityColor(weatherData.rh);
      case 'cape':
        return this.getCapeColor(weatherData.cape || 0);
      default:
        return '#00BFFF';
    }
  }

  /**
   * Get speed-based color for particles
   */
  private getSpeedBasedColor(speed: number): string {
    if (speed < 1) return '#0000FF';      // Deep blue - calm
    if (speed < 3) return '#00BFFF';     // Light blue
    if (speed < 5) return '#00FF00';     // Green
    if (speed < 7) return '#FFFF00';     // Yellow
    if (speed < 10) return '#FF8C00';    // Orange
    return '#FF0000';                    // Red - strong wind
  }

  /**
   * Get humidity-based color
   */
  private getHumidityColor(humidity: number): string {
    if (humidity < 30) return '#FF6B6B';   // Dry - red
    if (humidity < 50) return '#FFA500';   // Moderate - orange
    if (humidity < 70) return '#90EE90';   // Humid - light green
    return '#0047AB';                      // Very humid - blue
  }

  /**
   * Get CAPE-based color (storm potential)
   */
  private getCapeColor(cape: number): string {
    if (cape < 500) return '#00FF00';    // Weak - green
    if (cape < 1500) return '#FFD700';   // Moderate - yellow
    if (cape < 2500) return '#FF8C00';   // Strong - orange
    return '#FF0000';                    // Severe - red
  }

  /**
   * Draw route highlighting on weather canvas
   */
  private drawRouteHighlight(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, canvas.width * 0.7, canvas.height);
  }

  /**
   * Add temperature heatmap as grid cells with color gradient
   */
  private addTemperatureHeatmap() {
    if (!this.weatherLayerGroup) return;

    const cells = this.gridCells();
    const selectedCoords = this.selectedCoordinates();
    const routeSource = selectedCoords.source;
    const routeDest = selectedCoords.destination;

    cells.forEach((cell) => {
      const latMin = cell.lat - this.latStep / 2;
      const latMax = cell.lat + this.latStep / 2;
      const lonMin = cell.lon - this.lonStep / 2;
      const lonMax = cell.lon + this.lonStep / 2;

      const bounds: L.LatLngBoundsExpression = [
        [latMin, lonMin],
        [latMax, lonMax]
      ];

      // Generate temperature-based color
      const temperature = 15 + Math.cos(cell.lat * Math.PI / 180) * 20 + Math.random() * 10;
      const color = this.getTemperatureColor(temperature);

      const isOnRoute = this.isCellOnRoute(cell, routeSource, routeDest);

      const rectangle = L.rectangle(bounds, {
        color: isOnRoute ? '#FFD700' : color,
        weight: isOnRoute ? 2 : 0.5,
        opacity: isOnRoute ? 0.8 : 0.3,
        fillColor: color,
        fillOpacity: isOnRoute ? 0.5 : 0.15
      });

      rectangle.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.selectCell(cell);
      });

      this.weatherLayerGroup!.addLayer(rectangle);
    });
  }

  /**
   * Get color based on temperature
   */
  private getTemperatureColor(temp: number): string {
    if (temp < 0) return '#0000FF';      // Deep blue - very cold
    if (temp < 10) return '#00BFFF';     // Sky blue - cold
    if (temp < 20) return '#00FF00';     // Green - cool
    if (temp < 25) return '#FFFF00';     // Yellow - warm
    if (temp < 30) return '#FF8C00';     // Orange - hot
    return '#FF0000';                    // Red - very hot
  }

  /**
   * Show standard world map view
   */
  private showWorldMap() {
    if (!this.gridLayerGroup || !this.weatherLayerGroup) return;

    // Clear weather layer
    this.weatherLayerGroup.clearLayers();

    const cells = this.gridCells();
    const selectedCoords = this.selectedCoordinates();
    const routeSource = selectedCoords.source;
    const routeDest = selectedCoords.destination;

    cells.forEach((cell) => {
      const latMin = cell.lat - this.latStep / 2;
      const latMax = cell.lat + this.latStep / 2;
      const lonMin = cell.lon - this.lonStep / 2;
      const lonMax = cell.lon + this.lonStep / 2;

      const bounds: L.LatLngBoundsExpression = [
        [latMin, lonMin],
        [latMax, lonMax]
      ];

      // Check if cell is on route
      const isOnRoute = this.isCellOnRoute(cell, routeSource, routeDest);

      const rectangle = L.rectangle(bounds, {
        color: isOnRoute ? '#FF6B6B' : '#4169E1',
        weight: isOnRoute ? 3 : 1,
        opacity: isOnRoute ? 1 : 0.5,
        fillColor: isOnRoute ? '#FF6B6B' : '#4169E1',
        fillOpacity: isOnRoute ? 0.5 : 0.1
      });

      rectangle.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.selectCell(cell);
      });

      this.weatherLayerGroup!.addLayer(rectangle);
    });
  }

  /**
   * Get weather color based on intensity (0-1)
   */
  private getWeatherColor(intensity: number): string {
    if (intensity < 0.2) return '#1E90FF'; // Deep blue - calm
    if (intensity < 0.4) return '#00BFFF'; // Sky blue - light
    if (intensity < 0.6) return '#32CD32'; // Lime green - moderate
    if (intensity < 0.75) return '#FFD700'; // Gold - intense
    if (intensity < 0.9) return '#FF8C00'; // Dark orange - very intense
    return '#FF4500'; // Orange red - extreme
  }

  /**
   * Check if a cell is on the selected route
   */
  private isCellOnRoute(cell: GridCell, source: GridCell | null, destination: GridCell | null): boolean {
    if (!source || !destination) return false;

    // Simple check: cells between source and destination
    const minLat = Math.min(source.lat, destination.lat);
    const maxLat = Math.max(source.lat, destination.lat);
    const minLon = Math.min(source.lon, destination.lon);
    const maxLon = Math.max(source.lon, destination.lon);

    return cell.lat >= minLat && cell.lat <= maxLat && cell.lon >= minLon && cell.lon <= maxLon;
  }
}
