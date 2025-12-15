import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AppsContentComponent } from './components/apps-content/apps-content.component';
import { SearchContentComponent } from './components/search-content/search-content.component';
import { ChatContentComponent } from './components/chat-content/chat-content.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    AppsContentComponent,
    SearchContentComponent,
    ChatContentComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('app-admaren');
  currentView = signal<string>('apps');

  onOptionSelected(option: string) {
    this.currentView.set(option);
  }
}
