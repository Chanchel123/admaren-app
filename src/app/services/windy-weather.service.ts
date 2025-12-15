import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Weather data from Windy.com API
 */
export interface WindyWeatherData {
  wind: {
    speed: number;      // m/s
    direction: number;  // degrees
    u: number;         // u component
    v: number;         // v component
  };
  temp: number;        // Celsius
  rh: number;          // Relative humidity %
  pressure: number;    // Pa or hPa
  gust?: number;       // Wind gust m/s
  cape?: number;       // Convective available potential energy
  visibility?: number; // meters
}

/**
 * Windy.com Point Forecast API response
 */
export interface WindyApiResponse {
  ts: number;
  wind: number[][];
  temp: number[][];
  rh: number[][];
  pressure: number[][];
  gust?: number[][];
}

@Injectable({
  providedIn: 'root'
})
export class WindyWeatherService {
  // Windy.com API key (replace with your own from https://api.windy.com/)
  private apiKey = 'YOUR_WINDY_API_KEY';
  private apiBaseUrl = 'https://api.windy.com/api/point-forecast/v2';

  constructor(private http: HttpClient) {}

  /**
   * Fetch weather data for a specific location from Windy.com API
   * Falls back to simulated data if API fails
   */
  getWeatherData(lat: number, lon: number): Observable<WindyWeatherData> {
    // Try to fetch from Windy API, fallback to simulated data
    if (this.apiKey === 'YOUR_WINDY_API_KEY') {
      // If no API key, use simulated realistic data
      return of(this.generateSimulatedWeatherData(lat, lon));
    }

    return this.http.get<WindyApiResponse>(`${this.apiBaseUrl}?lat=${lat}&lon=${lon}&key=${this.apiKey}`)
      .pipe(
        map(response => this.parseWindyResponse(response, lat, lon)),
        catchError(error => {
          console.warn('Failed to fetch from Windy API, using simulated data:', error);
          return of(this.generateSimulatedWeatherData(lat, lon));
        })
      );
  }

  /**
   * Parse Windy API response to extract weather data
   */
  private parseWindyResponse(response: WindyApiResponse, lat: number, lon: number): WindyWeatherData {
    // Get the first data point from the response (2D arrays are returned)
    const windData = response.wind?.[0] || [0, 0];
    const tempValue = (response.temp?.[0] as any)?.[0] || 15;
    const rhValue = (response.rh?.[0] as any)?.[0] || 50;
    const pressureValue = (response.pressure?.[0] as any)?.[0] || 101325;
    const gustValue = (response.gust?.[0] as any)?.[0] || 0;

    // Calculate wind speed and direction from u,v components
    const u = windData[0] || 0;
    const v = windData[1] || 0;
    const speed = Math.sqrt(u * u + v * v);
    const direction = (Math.atan2(u, v) * 180 / Math.PI + 180) % 360;

    return {
      wind: {
        speed,
        direction,
        u,
        v
      },
      temp: tempValue as number,
      rh: rhValue as number,
      pressure: pressureValue as number,
      gust: gustValue as number
    };
  }

  /**
   * Generate realistic simulated weather data based on coordinates
   * This provides fallback data when API is unavailable
   */
  private generateSimulatedWeatherData(lat: number, lon: number): WindyWeatherData {
    // Temperature based on latitude and random variation
    const baseTemp = 20 - Math.abs(lat) * 0.5;
    const temp = baseTemp + (Math.sin(lon * 0.1) * 8) + (Math.random() - 0.5) * 5;

    // Wind speed based on latitude (stronger at poles)
    const baseWindSpeed = Math.abs(Math.sin(lat * Math.PI / 180)) * 15 + 3;
    const windSpeed = baseWindSpeed + (Math.random() - 0.5) * 5;

    // Wind direction based on Coriolis effect simulation
    const windDirection = (lon * 2 + lat + Math.random() * 360) % 360;

    // Calculate u,v components from speed and direction
    const angleRad = windDirection * Math.PI / 180;
    const u = windSpeed * Math.sin(angleRad);
    const v = windSpeed * Math.cos(angleRad);

    // Relative humidity based on latitude
    const baseRH = 60 - Math.abs(lat) * 0.3;
    const rh = Math.max(30, Math.min(95, baseRH + (Math.random() - 0.5) * 20));

    // Pressure based on latitude
    const basePressure = 101325 + (Math.sin(lat * Math.PI / 180) * 1000);
    const pressure = basePressure + (Math.random() - 0.5) * 500;

    // Gust speed (typically 1.5-2x average wind)
    const gust = windSpeed * (1.5 + Math.random() * 0.5);

    return {
      wind: {
        speed: windSpeed,
        direction: windDirection,
        u,
        v
      },
      temp: Math.round(temp * 10) / 10,
      rh: Math.round(rh),
      pressure: Math.round(pressure),
      gust: Math.round(gust * 10) / 10
    };
  }

  /**
   * Convert wind speed to Beaufort scale
   */
  getBeaufortScale(windSpeed: number): { scale: number; name: string; description: string } {
    const scales = [
      { scale: 0, name: 'Calm', description: 'Smoke rises vertically' },
      { scale: 1, name: 'Light Air', description: 'Smoke drifts slightly' },
      { scale: 2, name: 'Light Breeze', description: 'Leaves rustle' },
      { scale: 3, name: 'Gentle Breeze', description: 'Leaves and twigs move' },
      { scale: 4, name: 'Moderate Breeze', description: 'Small branches move' },
      { scale: 5, name: 'Fresh Breeze', description: 'Small trees sway' },
      { scale: 6, name: 'Strong Breeze', description: 'Large branches move' },
      { scale: 7, name: 'Gale', description: 'Whole trees sway' },
      { scale: 8, name: 'Strong Gale', description: 'Twigs break from trees' },
      { scale: 9, name: 'Storm', description: 'Slight structural damage' },
      { scale: 10, name: 'Violent Storm', description: 'Trees uprooted' },
      { scale: 11, name: 'Hurricane Force', description: 'Widespread damage' },
      { scale: 12, name: 'Hurricane Force', description: 'Devastating damage' }
    ];

    // Wind speed thresholds for Beaufort scale (m/s)
    const thresholds = [0, 1, 2, 3, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.4, 28.5, 32.7];

    for (let i = scales.length - 1; i >= 0; i--) {
      if (windSpeed >= (thresholds[i] || 0)) {
        return scales[i];
      }
    }

    return scales[0];
  }

  /**
   * Convert wind speed from m/s to knots
   */
  msToKnots(ms: number): number {
    return ms * 1.94384;
  }

  /**
   * Convert wind speed from m/s to km/h
   */
  msToKmh(ms: number): number {
    return ms * 3.6;
  }

  /**
   * Get wind color based on speed for visualization
   */
  getWindSpeedColor(speedMs: number): string {
    // Color gradient based on wind speed (m/s)
    if (speedMs < 2) return '#0066CC';      // Deep blue - calm
    if (speedMs < 5) return '#00CCFF';      // Cyan - light breeze
    if (speedMs < 10) return '#00FF00';     // Green - moderate
    if (speedMs < 15) return '#FFFF00';     // Yellow - fresh
    if (speedMs < 20) return '#FF8800';     // Orange - strong
    if (speedMs < 25) return '#FF4400';     // Red-orange - gale
    return '#FF0000';                       // Red - storm
  }

  /**
   * Get temperature color based on celsius
   */
  getTemperatureColor(tempC: number): string {
    if (tempC < -10) return '#0000FF';      // Blue - very cold
    if (tempC < 0) return '#00BFFF';        // Sky blue - cold
    if (tempC < 10) return '#00FF00';       // Green - cool
    if (tempC < 20) return '#FFFF00';       // Yellow - mild
    if (tempC < 30) return '#FF8C00';       // Orange - warm
    return '#FF0000';                       // Red - hot
  }

  /**
   * Get pressure color
   */
  getPressureColor(pressurePa: number): string {
    const pressureHpa = pressurePa / 100;

    if (pressureHpa < 980) return '#FF0000';   // Red - low pressure/storm
    if (pressureHpa < 1000) return '#FF8800';  // Orange - low
    if (pressureHpa < 1013) return '#FFFF00';  // Yellow - below normal
    if (pressureHpa < 1027) return '#00FF00';  // Green - normal
    return '#00BFFF';                          // Cyan - high pressure
  }
}
