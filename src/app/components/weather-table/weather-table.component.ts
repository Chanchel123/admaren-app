import { Component, OnInit, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';

export interface WeatherData {
  id: number;
  location: string;
  latitude: number;
  longitude: number;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  temperature: number;
  humidity: number;
  pressure: number;
  beaufortScale: string;
}

export interface LocationData {
  name: string;
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-weather-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weather-table.component.html',
  styleUrl: './weather-table.component.scss'
})
export class WeatherTableComponent implements OnInit {
  weatherData = signal<WeatherData[]>([]);
  selectedLocations = input<LocationData[] | null>(null);
  hasCustomData = signal(false);

  constructor() {
    effect(() => {
      const locations = this.selectedLocations();
      if (locations && locations.length > 0) {
        this.generateWeatherDataForLocations(locations);
        this.hasCustomData.set(true);
      }
    });
  }

  ngOnInit() {
    this.loadWeatherData();
  }

  private loadWeatherData() {
    const data: WeatherData[] = [
      {
        id: 1,
        location: 'North Atlantic',
        latitude: 30,
        longitude: -40,
        windSpeed: 15,
        windDirection: 180,
        waveHeight: 2.5,
        temperature: 22,
        humidity: 75,
        pressure: 1013,
        beaufortScale: '3 - Gentle Breeze'
      },
      {
        id: 2,
        location: 'Mediterranean Sea',
        latitude: 38,
        longitude: 15,
        windSpeed: 12,
        windDirection: 270,
        waveHeight: 1.8,
        temperature: 25,
        humidity: 68,
        pressure: 1015,
        beaufortScale: '3 - Gentle Breeze'
      },
      {
        id: 3,
        location: 'Baltic Sea',
        latitude: 56,
        longitude: 18,
        windSpeed: 18,
        windDirection: 225,
        waveHeight: 3.1,
        temperature: 20,
        humidity: 80,
        pressure: 1011,
        beaufortScale: '4 - Moderate Breeze'
      },
      {
        id: 4,
        location: 'Bay of Biscay',
        latitude: 46,
        longitude: -5,
        windSpeed: 10,
        windDirection: 180,
        waveHeight: 1.5,
        temperature: 26,
        humidity: 65,
        pressure: 1016,
        beaufortScale: '3 - Gentle Breeze'
      },
      {
        id: 5,
        location: 'English Channel',
        latitude: 50,
        longitude: 2,
        windSpeed: 14,
        windDirection: 90,
        waveHeight: 2.2,
        temperature: 28,
        humidity: 85,
        pressure: 1012,
        beaufortScale: '3 - Gentle Breeze'
      },
      {
        id: 6,
        location: 'North Sea',
        latitude: 56,
        longitude: 3,
        windSpeed: 16,
        windDirection: 315,
        waveHeight: 2.8,
        temperature: 24,
        humidity: 78,
        pressure: 1014,
        beaufortScale: '4 - Moderate Breeze'
      }
    ];
    this.weatherData.set(data);
  }

  private generateWeatherDataForLocations(locations: LocationData[]) {
    const data: WeatherData[] = locations.map((loc, index) => {
      // Generate realistic weather data based on coordinates
      const windSpeed = Math.sin(loc.lat * Math.PI / 180) * 20 + Math.random() * 15;
      const windDirection = (loc.lon + loc.lat) % 360;
      const temperature = 15 + Math.cos(loc.lat * Math.PI / 180) * 20 + Math.random() * 10;
      const pressure = 1013 + Math.sin(loc.lon * Math.PI / 180) * 20 + Math.random() * 10;
      const humidity = 40 + Math.random() * 50;
      const waveHeight = Math.abs(Math.sin(loc.lat / 90 * Math.PI)) * 5 + 1;
      const beaufortScale = this.getBeaufortScale(windSpeed);

      return {
        id: index + 1,
        location: loc.name,
        latitude: loc.lat,
        longitude: loc.lon,
        windSpeed: Math.max(0, windSpeed),
        windDirection: Math.round(windDirection),
        waveHeight: Math.round(waveHeight * 10) / 10,
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity),
        pressure: Math.round(pressure),
        beaufortScale
      };
    });

    this.weatherData.set(data);
  }

  private getBeaufortScale(windSpeed: number): string {
    if (windSpeed < 1) return '0 - Calm';
    if (windSpeed < 4) return '1 - Light Air';
    if (windSpeed < 7) return '2 - Light Breeze';
    if (windSpeed < 11) return '3 - Gentle Breeze';
    if (windSpeed < 16) return '4 - Moderate Breeze';
    if (windSpeed < 21) return '5 - Fresh Breeze';
    if (windSpeed < 27) return '6 - Strong Breeze';
    if (windSpeed < 33) return '7 - Gale';
    if (windSpeed < 40) return '8 - Strong Gale';
    if (windSpeed < 47) return '9 - Storm';
    if (windSpeed < 55) return '10 - Violent Storm';
    if (windSpeed < 63) return '11 - Hurricane Force';
    return '12 - Hurricane Force';
  }

  /**
   * Calculate average wind speed from all weather data
   */
  getAverageWindSpeed(): number {
    const data = this.weatherData();
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, row) => acc + row.windSpeed, 0);
    return sum / data.length;
  }

  /**
   * Calculate average temperature from all weather data
   */
  getAverageTemperature(): number {
    const data = this.weatherData();
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, row) => acc + row.temperature, 0);
    return sum / data.length;
  }

  /**
   * Calculate average pressure from all weather data
   */
  getAveragePressure(): number {
    const data = this.weatherData();
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, row) => acc + row.pressure, 0);
    return sum / data.length;
  }

  exportToExcel() {
    if (this.weatherData().length === 0) {
      alert('No weather data to export. Please select locations first.');
      return;
    }

    // Prepare data for Excel with formatting
    const exportData = this.weatherData().map(row => ({
      'Location': row.location,
      'Latitude': row.latitude,
      'Longitude': row.longitude,
      'Wind Speed (knots)': row.windSpeed.toFixed(1),
      'Wind Direction (°)': row.windDirection,
      'Wave Height (m)': row.waveHeight,
      'Temperature (°C)': row.temperature.toFixed(1),
      'Humidity (%)': row.humidity,
      'Pressure (mb)': row.pressure,
      'Beaufort Scale': row.beaufortScale
    }));

    // Create workbook and worksheet
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 20 },  // Location
      { wch: 12 },  // Latitude
      { wch: 12 },  // Longitude
      { wch: 18 },  // Wind Speed
      { wch: 15 },  // Wind Direction
      { wch: 15 },  // Wave Height
      { wch: 15 },  // Temperature
      { wch: 12 },  // Humidity
      { wch: 14 },  // Pressure
      { wch: 20 }   // Beaufort Scale
    ];
    ws['!cols'] = colWidths;

    // Add summary sheet
    const summaryData = [
      ['Weather Report Summary'],
      [],
      ['Generated:', new Date().toLocaleString()],
      ['Total Locations:', this.weatherData().length],
      [],
      ['Location Statistics:'],
      ['Average Wind Speed (knots):', this.calculateAverage(row => row.windSpeed)],
      ['Average Temperature (°C):', this.calculateAverage(row => row.temperature)],
      ['Average Pressure (mb):', this.calculateAverage(row => row.pressure)],
      ['Average Humidity (%):', this.calculateAverage(row => row.humidity)],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 15 }];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, ws, 'Weather Data');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Weather-Report-${timestamp}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);
  }

  private calculateAverage(selector: (row: WeatherData) => number): string {
    const data = this.weatherData();
    if (data.length === 0) return '0';
    const sum = data.reduce((acc, row) => acc + selector(row), 0);
    return (sum / data.length).toFixed(2);
  }
}
