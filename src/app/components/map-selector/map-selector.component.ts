import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { type LocationData } from '../weather-table/weather-table.component';

export interface MapMode {
	value: 'windy' | 'world';
	label: string;
}

@Component({
	selector: 'app-map-selector',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './map-selector.component.html',
	styleUrl: './map-selector.component.scss'
})
export class MapSelectorComponent {
	/**
	 * Selected locations (source and destination)
	 */
	selectedLocations = input<LocationData[]>([]);

	/**
	 * Current map mode selection
	 */
	selectedMapMode = signal<'windy' | 'world'>('windy');

	/**
	 * Available map modes
	 */
	mapModes: MapMode[] = [
		{ value: 'windy', label: 'Windy.com Map (Weather Layers)' },
		{ value: 'world', label: 'World Map' }
	];

	/**
	 * Output when map mode changes
	 */
	mapModeChanged = output<'windy' | 'world'>();

	/**
	 * Compute display text for selected locations
	 */
	locationCount = computed(() => this.selectedLocations().length);
	hasLocations = computed(() => this.selectedLocations().length > 0);

	/**
	 * Compute source and destination location info
	 */
	sourceLocation = computed(() => {
		const locations = this.selectedLocations();
		return locations.length > 0 ? locations[0] : null;
	});

	destinationLocation = computed(() => {
		const locations = this.selectedLocations();
		return locations.length > 1 ? locations[1] : null;
	});

	onMapModeChange(mode: 'windy' | 'world') {
		this.selectedMapMode.set(mode);
		this.mapModeChanged.emit(mode);
	}

	/**
	 * Format coordinates for display
	 */
	formatCoordinates(location: LocationData | null): string {
		if (!location) return '-';
		return `${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°`;
	}

	/**
	 * Get location name or fallback to coordinates
	 */
	getLocationName(location: LocationData | null): string {
		if (!location) return 'Not Selected';
		return location.name || this.formatCoordinates(location);
	}
}
