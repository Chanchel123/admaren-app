import { Component, OnInit, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-grid-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-map.component.html',
  styleUrl: './grid-map.component.scss'
})
export class GridMapComponent implements OnInit {
  gridCells = signal<GridCell[]>([]);
  selectedCoordinates = signal<SelectedCoordinates>({
    source: null,
    destination: null
  });
  selectionMode = signal<'source' | 'destination'>('source');
  coordinatesSelected = output<SelectedCoordinates>();

  private gridRows = 18;
  private gridCols = 36;
  private latStep = 10;
  private lonStep = 10;

  ngOnInit() {
    this.generateGrid();
  }

  private generateGrid() {
    const cells: GridCell[] = [];
    let id = 1;

    // Create grid from -90 to 90 latitude and -180 to 180 longitude
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

  selectCell(cell: GridCell) {
    const mode = this.selectionMode();
    const current = this.selectedCoordinates();

    if (mode === 'source') {
      this.selectedCoordinates.set({
        ...current,
        source: cell
      });
      this.selectionMode.set('destination');
    } else {
      this.selectedCoordinates.set({
        source: current.source,
        destination: cell
      });
      // Emit the coordinates when both are selected
      this.coordinatesSelected.emit(this.selectedCoordinates());
      // Reset for next selection
      this.selectionMode.set('source');
      this.selectedCoordinates.set({ source: null, destination: null });
    }
  }

  resetSelection() {
    this.selectedCoordinates.set({ source: null, destination: null });
    this.selectionMode.set('source');
  }

  isCellSelected(cell: GridCell): boolean {
    const selected = this.selectedCoordinates();
    return (
      (selected.source?.id === cell.id && this.selectionMode() === 'destination') ||
      (selected.destination?.id === cell.id && this.selectionMode() === 'source')
    );
  }

  isCellHighlighted(cell: GridCell): boolean {
    const selected = this.selectedCoordinates();
    return (
      (selected.source?.id === cell.id) ||
      (selected.destination?.id === cell.id)
    );
  }

  getCurrentInstruction(): string {
    const selected = this.selectedCoordinates();
    if (!selected.source) {
      return 'Click on source location';
    } else if (!selected.destination) {
      return `Source: (${selected.source.lat}, ${selected.source.lon}) - Click on destination location`;
    }
    return '';
  }
}
