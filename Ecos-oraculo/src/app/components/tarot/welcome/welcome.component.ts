import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CardService } from '../../../services/tarot/card.service';
import { cardData } from '../../../assets/data';
import { ParticlesComponent } from '../../../shared/particles/particles.component';

@Component({
  selector: 'app-welcome',
  imports: [],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      transition(':enter', [animate('1s ease-in', style({ opacity: 1 }))]),
    ]),
  ],
})
export class WelcomeComponent {
  cardData = cardData;
  constructor(private router: Router, private cardService: CardService) {}
  /* Empieza las cartas teniendo en cuenta el tema seleccionado
   * @param {string} theme - El tema seleccionado
   */
  startTarot(theme: string): void {
    localStorage.setItem('tema', theme);

    // Filtra las cartas que tienen descripciones para el tema seleccionado
    const selectedCardData = this.cardData
      .filter((card: any) => card.descriptions[theme]?.length > 0)
      .map((card: any) => ({
        ...card,
        descriptions: card.descriptions[theme],
      }));

    if (selectedCardData.length === 0) {
      console.error('No se encontraron cartas para el tema:', theme);
      return;
    }

    this.cardService.setSelectedCards(selectedCardData);
    this.router.navigate(['/cartas', theme]);
  }
  volverAlInicio() {
    // Si usas Angular Router:
    this.router.navigate(['/']);
  }
}
