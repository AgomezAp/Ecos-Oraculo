import { Injectable } from '@angular/core';
import { cardData } from '../../assets/data';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  
  private storageKey = 'selectedCards';

  
  getCardsByTheme(theme: string): any[] {
    console.log(`Theme selected: ${theme}`); // Verificar si el tema llega correctamente
    return cardData
      .map((card: any) => {
        if (!card.descriptions[theme]) {
          console.error(`El tema "${theme}" no existe en las descripciones de la carta:`, card);
          return { ...card, descriptions: ["Descripción no disponible"] };
        }
        // Seleccionar una descripción aleatoria de las cuatro disponibles por tema
        const randomDescription = card.descriptions[theme][Math.floor(Math.random() * card.descriptions[theme].length)];
        return {
          ...card,
          name: card.name,
          descriptions: [randomDescription], // Usar solo la descripción aleatoria seleccionada
        };
      })
      .sort(() => 0.5 - Math.random()); // Barajar el orden de las cartas
  }


  setSelectedCards(cards: any[]): void {
    // Guardar en localStorage como string JSON
    localStorage.setItem(this.storageKey, JSON.stringify(cards));
  }

  getSelectedCards(): any[] {
    // Recuperar de localStorage
    const storedCards = localStorage.getItem(this.storageKey);
    return storedCards ? JSON.parse(storedCards) : [];
  }

  clearSelectedCards(): void {
    // Limpiar almacenamiento
    localStorage.removeItem(this.storageKey);
  }
}
