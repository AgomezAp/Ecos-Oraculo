import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { CardService } from '../../../services/tarot/card.service';
import { ParticlesComponent } from '../../../shared/particles/particles.component';

gsap.registerPlugin(Draggable, MotionPathPlugin, TextPlugin);
@Component({
  selector: 'app-cards',
  imports: [CommonModule, ParticlesComponent],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css',
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      transition(':enter', [animate('1s ease-in', style({ opacity: 1 }))]),
    ]),
  ],
})
/**
 * Maneja la selección de una carta cuando se hace clic en ella.
 *
 * Este método realiza las siguientes acciones:
 * 1. Verifica si ya se han seleccionado 3 cartas o si la carta ya está seleccionada.
 * 2. Actualiza el z-index de la carta seleccionada para mostrarla encima.
 * 3. Añade la clase "selected" a la carta y aplica una transición de estilo.
 * 4. Calcula y ajusta la posición de la carta seleccionada de manera responsive.
 * 5. Añade la carta seleccionada al array `selectedCards`.
 * 6. Cambia la imagen de fondo de la carta seleccionada después de un breve retraso.
 * 7. Si se han seleccionado 3 cartas, ajusta la posición final de las cartas seleccionadas,
 *    guarda las cartas seleccionadas en el servicio y navega a la página de descripción.
 *
 * @param {Event} event - El evento de clic que desencadena la selección de la carta.
 */
export class CardsComponent implements OnInit, AfterViewInit, OnDestroy {
  cards: any[] = [];
  selectedCards: { src: string; name: string; descriptions: string[] }[] = [];
  private theme: string = '';
  private isAnimating: boolean = false;
  private isInitialAnimationComplete: boolean = false;
  private cardElements: HTMLElement[] = [];
  private timeline: gsap.core.Timeline | null = null;

  // Dimensiones responsive de las cartas
  private getCardDimensions() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Escala basada en el viewport
    let cardWidth, cardHeight;

    if (viewportWidth <= 480) {
      // Móviles pequeños
      cardWidth = Math.min(90, viewportWidth * 0.22);
      cardHeight = cardWidth * 1.55;
    } else if (viewportWidth <= 768) {
      // Tablets y móviles grandes
      cardWidth = Math.min(110, viewportWidth * 0.14);
      cardHeight = cardWidth * 1.55;
    } else if (viewportWidth <= 1366) {
      // Laptops pequeñas
      cardWidth = Math.min(140, viewportWidth * 0.1);
      cardHeight = cardWidth * 1.55;
    } else {
      // Pantallas grandes
      cardWidth = Math.min(150, viewportWidth * 0.08);
      cardHeight = cardWidth * 1.55;
    }

    return { width: cardWidth, height: cardHeight };
  }
  volverAlInicio() {
    // Si usas Angular Router:
    this.router.navigate(['/']);
  }
  // Dimensiones para los slots (más pequeñas que las cartas del abanico)
  private getSlotDimensions() {
    const cardDims = this.getCardDimensions();
    return {
      width: cardDims.width * 0.83,
      height: cardDims.height * 0.88,
    };
  }

  // Dimensiones de las cartas cuando están EN los slots
  private getCardInSlotDimensions() {
    const slotDims = this.getSlotDimensions();
    return {
      width: slotDims.width * 1.13,
      height: slotDims.height * 1.13,
    };
  }

  constructor(
    private cardService: CardService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.theme = params['theme'];
      this.initializeCards();
    });
  }

  private animateHeader(): void {
    const title = document.querySelector('.main-title');
    const subtitle = document.querySelector('.subtitle');
    const counter = document.querySelector('.card-counter');

    if (title) {
      gsap.from(title, {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });
    }

    if (subtitle) {
      gsap.from(subtitle, {
        y: -30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      });
    }

    if (counter) {
      gsap.from(counter, {
        scale: 0,
        opacity: 0,
        duration: 0.8,
        delay: 0.4,
        ease: 'back.out(1.7)',
      });
    }
  }

  initializeCards(): void {
    this.cardService.clearSelectedCards();
    this.cards = this.cardService.getCardsByTheme(this.theme);
  }

  displayCards(): void {
    const cardContainer = document.getElementById('cardContainer');
    if (!cardContainer || this.cards.length === 0) return;

    const numberOfCards = Math.min(12, this.cards.length);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calcular el centro dinámicamente basado en el viewport
    const centerX = viewportWidth / 2;
    // El centro Y se ajusta según el tamaño de la pantalla
    const centerY = viewportHeight * 0.38; // 50% desde arriba funciona bien para la mayoría

    // Radio adaptativo
    let radius;
    if (viewportWidth <= 480) {
      radius = Math.min(viewportWidth * 0.35, 140);
    } else if (viewportWidth <= 768) {
      radius = Math.min(viewportWidth * 0.32, 180);
    } else if (viewportWidth <= 1366) {
      radius = Math.min(viewportWidth * 0.18, 220);
    } else {
      radius = Math.min(viewportWidth * 0.15, 250);
    }

    const startAngle = -45;
    const angleStep = 90 / (numberOfCards - 1);
    const cardDims = this.getCardDimensions();

    this.timeline = gsap.timeline({
      onComplete: () => {
        // HABILITAR EVENTOS CUANDO TERMINE LA ANIMACIÓN
        this.isInitialAnimationComplete = true;
        this.cardElements.forEach((card) => {
          card.style.pointerEvents = 'auto';
        });
      },
    });

    for (let i = 0; i < numberOfCards; i++) {
      const cardData = this.cards[i];
      if (!cardData || !cardData.src) continue;

      const card = this.createCard(cardData, i);
      cardContainer.appendChild(card);
      this.cardElements.push(card);

      const angle = startAngle + i * angleStep;
      const radian = angle * (Math.PI / 180);
      const finalX = centerX + radius * Math.sin(radian) - cardDims.width / 2;
      const finalY = centerY - radius * Math.cos(radian) - cardDims.height / 2;

      gsap.set(card, {
        left: centerX - cardDims.width / 2,
        top: -200,
        rotation: 0,
        scale: 0,
        opacity: 0,
      });

      this.timeline.to(
        card,
        {
          left: finalX,
          top: finalY,
          rotation: angle,
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: 'back.out(1.2)',
          delay: i * 0.03,
        },
        `-=${i === 0 ? 0 : 0.25}`
      );

      card.style.zIndex = String(i + 10);
    }

    // Actualizar los tamaños de los slots dinámicamente
    this.updateSlotSizes();
  }

  private updateSlotSizes(): void {
    const slotDims = this.getSlotDimensions();
    const slots = document.querySelectorAll('.card-slot');

    slots.forEach((slot: Element) => {
      const htmlSlot = slot as HTMLElement;
      htmlSlot.style.width = `${slotDims.width}px`;
      htmlSlot.style.height = `${slotDims.height}px`;
    });
  }

  private createCard(cardData: any, index: number): HTMLElement {
    const card = document.createElement('div');
    const cardDims = this.getCardDimensions();

    card.classList.add('card');
    card.style.position = 'absolute';
    card.style.width = `${cardDims.width}px`;
    card.style.height = `${cardDims.height}px`;
    card.style.borderRadius = '10px';
    card.style.backgroundImage = "url('/card-back.webp')";
    card.style.backgroundSize = 'cover';
    card.style.backgroundPosition = 'center';

    // DESHABILITAR EVENTOS INICIALMENTE
    card.style.pointerEvents = 'none';

    card.dataset['src'] = cardData.src;
    card.dataset['name'] = cardData.name;
    card.dataset['descriptions'] = cardData.descriptions.join('.,');
    card.dataset['index'] = String(index);
    card.dataset['originalIndex'] = String(index);

    card.addEventListener('click', () => this.selectCard(card));

    return card;
  }

  private selectCard(card: HTMLElement): void {
    if (
      this.selectedCards.length >= 3 ||
      card.classList.contains('selected') ||
      this.isAnimating
    ) {
      return;
    }

    this.isAnimating = true;
    card.classList.add('selected');

    const selectedIndex = this.selectedCards.length;
    const slot = document.getElementById(`slot-${selectedIndex}`);

    if (!slot) {
      this.isAnimating = false;
      return;
    }

    slot.classList.add('filled');

    // Obtener las dimensiones actuales
    const cardInSlotDims = this.getCardInSlotDimensions();
    const slotRect = slot.getBoundingClientRect();
    const containerRect = document
      .getElementById('cardContainer')
      ?.getBoundingClientRect();

    if (!containerRect) {
      this.isAnimating = false;
      return;
    }

    // Calcular la posición final relativa al contenedor
    const targetX =
      slotRect.left +
      slotRect.width / 2 -
      containerRect.left -
      cardInSlotDims.width / 2;
    const targetY =
      slotRect.top +
      slotRect.height / 2 -
      containerRect.top -
      cardInSlotDims.height / 2 +
      10;

    const selectTimeline = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        this.checkCompletion();
      },
    });

    // Guardar la posición actual para calcular el scale correcto
    const currentWidth = parseFloat(card.style.width);
    const scaleRatio = cardInSlotDims.width / currentWidth;

    selectTimeline
      .to(card, {
        scale: 1.3,
        zIndex: 1000 + selectedIndex,
        duration: 0.3,
        ease: 'power2.out',
      })
      .to(card, {
        rotationY: 90,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          card.style.backgroundImage = `url('${card.dataset['src']}')`;
        },
      })
      .to(card, {
        rotationY: 180,
        duration: 0.25,
        ease: 'power2.out',
      })
      .to(card, {
        left: targetX,
        top: targetY,
        scale: scaleRatio,
        rotation: 0,
        width: cardInSlotDims.width,
        height: cardInSlotDims.height,
        duration: 0.5,
        ease: 'power3.inOut',
      });

    this.addSlotGlow(slot);

    this.selectedCards.push({
      src: card.dataset['src'] || '',
      name: card.dataset['name'] || '',
      descriptions: card.dataset['descriptions']?.split('.,') || [],
    });

    this.updateCounter();

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  private addSlotGlow(slot: HTMLElement): void {
    const glow = document.createElement('div');
    glow.style.position = 'absolute';
    glow.style.width = '100%';
    glow.style.height = '100%';
    glow.style.top = '0';
    glow.style.left = '0';
    glow.style.borderRadius = '10px';
    glow.style.background =
      'radial-gradient(circle, rgba(255, 215, 0, 0.5), transparent)';
    glow.style.pointerEvents = 'none';
    slot.appendChild(glow);

    gsap.from(glow, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    });

    gsap.to(glow, {
      opacity: 0,
      duration: 0.5,
      delay: 1,
      onComplete: () => glow.remove(),
    });
  }

  private updateCounter(): void {
    const counter = document.querySelector('.counter');
    if (!counter) return;

    gsap.to(counter, {
      scale: 1.2,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => {
        counter.textContent = `${this.selectedCards.length}/3`;
        gsap.to(counter, {
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
      },
    });
  }

  private checkCompletion(): void {
    if (this.selectedCards.length === 3) {
      setTimeout(() => {
        this.completeSelection();
      }, 1500);
    }
  }

  private completeSelection(): void {
    this.cardService.setSelectedCards(this.selectedCards);

    const overlay = document.getElementById('transitionOverlay');
    if (!overlay) {
      this.router.navigate(['/descripcion-cartas']);
      return;
    }

    const finalTimeline = gsap.timeline();

    // Primero desvanecer las cartas no seleccionadas
    const unselectedCards = document.querySelectorAll('.card:not(.selected)');
    finalTimeline.to(unselectedCards, {
      opacity: 0,
      scale: 0.8,
      y: 50,
      stagger: 0.02,
      duration: 0.5,
      ease: 'power2.in',
    });

    // NUEVA ANIMACIÓN MEJORADA PARA CARTAS SELECCIONADAS
    const selectedCards = document.querySelectorAll('.card.selected');
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Calcular dimensiones finales más grandes para el centro
    const finalCardWidth = Math.min(120, window.innerWidth * 0.08);
    const finalCardHeight = finalCardWidth * 1.4;
    const cardSpacing = finalCardWidth + 20; // Espacio entre cartas

    // Mover cartas al centro de la pantalla en línea horizontal
    selectedCards.forEach((card, index) => {
      const htmlCard = card as HTMLElement;

      finalTimeline.to(
        htmlCard,
        {
          left:
            centerX - cardSpacing + index * cardSpacing - finalCardWidth / 2,
          top: centerY - finalCardHeight / 2 - 50, // Un poco más arriba del centro
          width: finalCardWidth,
          height: finalCardHeight,
          scale: 1,
          rotation: 0, // Sin rotación para mejor visibilidad
          zIndex: 2000 + index,
          duration: 1.2,
          ease: 'power3.inOut',
        },
        index === 0 ? '-=0.2' : '-=0.8'
      );
    });

    // Añadir brillo dorado
    finalTimeline.to('.card.selected', {
      boxShadow:
        '0 0 50px rgba(255, 215, 0, 0.9), 0 0 100px rgba(255, 215, 0, 0.5)',
      duration: 1.5,
    });

    // Pausa para que el usuario vea las cartas
    finalTimeline.to({}, { duration: 1.5 });

    // Activar overlay de transición
    finalTimeline.to(overlay, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.inOut',
    });

    // Animación final de salida hacia arriba
    finalTimeline.to('.card.selected', {
      y: '-=200', // Mover hacia arriba
      scale: 0.8,
      opacity: 0.8,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power2.in',
    });

    // Desvanecimiento final
    finalTimeline.to('.card.selected', {
      opacity: 0,
      scale: 0,
      stagger: 0.05,
      duration: 0.4,
      ease: 'power2.in',
    });

    finalTimeline.call(() => {
      this.router.navigate(['/descripcion-cartas']);
    });
  }
  private resetSelection(): void {
    if (this.isAnimating) return;

    this.selectedCards = [];
    this.updateCounter();

    const slots = document.querySelectorAll('.card-slot');
    slots.forEach((slot) => {
      slot.classList.remove('filled');
    });

    const selectedCards = document.querySelectorAll('.card.selected');
    selectedCards.forEach((card: Element) => {
      const htmlCard = card as HTMLElement;
      const originalIndex = parseInt(htmlCard.dataset['originalIndex'] || '0');

      htmlCard.classList.remove('selected');
      htmlCard.style.backgroundImage = "url('/card-back.webp')";

      this.returnCardToOriginalPosition(htmlCard, originalIndex);
    });

    this.isAnimating = false;
  }

  private returnCardToOriginalPosition(card: HTMLElement, index: number): void {
    const numberOfCards = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight * 0.38;
    const cardDims = this.getCardDimensions();

    let radius;
    if (viewportWidth <= 480) {
      radius = Math.min(viewportWidth * 0.35, 140);
    } else if (viewportWidth <= 768) {
      radius = Math.min(viewportWidth * 0.32, 180);
    } else if (viewportWidth <= 1366) {
      radius = Math.min(viewportWidth * 0.18, 220);
    } else {
      radius = Math.min(viewportWidth * 0.15, 250);
    }

    const startAngle = -45;
    const angleStep = 90 / (numberOfCards - 1);
    const angle = startAngle + index * angleStep;
    const radian = angle * (Math.PI / 180);
    const finalX = centerX + radius * Math.sin(radian) - cardDims.width / 2;
    const finalY = centerY - radius * Math.cos(radian) - cardDims.height / 2;

    gsap.to(card, {
      left: finalX,
      top: finalY,
      width: cardDims.width,
      height: cardDims.height,
      rotation: angle,
      rotationY: 0,
      scale: 1,
      zIndex: index + 10,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => {
        card.style.pointerEvents = 'auto';
      },
    });
  }

  private handleResize = (): void => {
    // Actualizar dimensiones de slots
    this.updateSlotSizes();

    if (this.cardElements.length > 0 && !this.isAnimating) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight * 0.38;
      const cardDims = this.getCardDimensions();

      let radius;
      if (viewportWidth <= 480) {
        radius = Math.min(viewportWidth * 0.35, 140);
      } else if (viewportWidth <= 768) {
        radius = Math.min(viewportWidth * 0.32, 180);
      } else if (viewportWidth <= 1366) {
        radius = Math.min(viewportWidth * 0.18, 220);
      } else {
        radius = Math.min(viewportWidth * 0.15, 250);
      }

      const startAngle = -45;
      const angleStep = 90 / (this.cardElements.length - 1);

      this.cardElements.forEach((card, i) => {
        if (!card.classList.contains('selected')) {
          const angle = startAngle + i * angleStep;
          const radian = angle * (Math.PI / 180);
          const finalX =
            centerX + radius * Math.sin(radian) - cardDims.width / 2;
          const finalY =
            centerY - radius * Math.cos(radian) - cardDims.height / 2;

          gsap.to(card, {
            left: finalX,
            top: finalY,
            width: cardDims.width,
            height: cardDims.height,
            rotation: angle,
            duration: 0.3,
            ease: 'power2.inOut',
          });
        }
      });

      // Actualizar posiciones de cartas seleccionadas
      const selectedCards = document.querySelectorAll('.card.selected');
      selectedCards.forEach((card: Element, index) => {
        const htmlCard = card as HTMLElement;
        const slot = document.getElementById(`slot-${index}`);
        if (slot) {
          const slotRect = slot.getBoundingClientRect();
          const containerRect = document
            .getElementById('cardContainer')
            ?.getBoundingClientRect();
          const cardInSlotDims = this.getCardInSlotDimensions();

          if (containerRect) {
            const targetX =
              slotRect.left +
              slotRect.width / 2 -
              containerRect.left -
              cardInSlotDims.width / 2;
            const targetY =
              slotRect.top +
              slotRect.height / 2 -
              containerRect.top -
              cardInSlotDims.height / 2 +
              10;

            gsap.to(htmlCard, {
              left: targetX,
              top: targetY,
              width: cardInSlotDims.width,
              height: cardInSlotDims.height,
              duration: 0.3,
            });
          }
        }
      });
    }
  };

  private setupHoverEffects(): void {
    this.cardElements.forEach((card) => {
      let hoverAnimation: gsap.core.Tween | null = null;

      card.addEventListener('mouseenter', () => {
        if (!card.classList.contains('selected') && !this.isAnimating) {
          if (hoverAnimation) {
            hoverAnimation.kill();
          }

          const originalZ = card.style.zIndex;
          card.dataset['originalZ'] = originalZ;

          hoverAnimation = gsap.to(card, {
            scale: 1.05,
            y: '-=10',
            zIndex: 500,
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        if (!card.classList.contains('selected') && !this.isAnimating) {
          if (hoverAnimation) {
            hoverAnimation.kill();
          }

          const originalZ = card.dataset['originalZ'] || '10';

          hoverAnimation = gsap.to(card, {
            scale: 1,
            y: '+=10',
            zIndex: parseInt(originalZ),
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      });
    });
  }

  private setupTouchSupport(): void {
    if ('ontouchstart' in window) {
      this.cardElements.forEach((card) => {
        card.addEventListener('touchstart', (e) => {
          e.preventDefault();
          if (!card.classList.contains('selected') && !this.isAnimating) {
            gsap.to(card, {
              scale: 1.05,
              duration: 0.2,
            });
          }
        });

        card.addEventListener('touchend', (e) => {
          e.preventDefault();
          if (!card.classList.contains('selected') && !this.isAnimating) {
            gsap.to(card, {
              scale: 1,
              duration: 0.2,
            });
            this.selectCard(card);
          }
        });
      });
    }
  }

  ngAfterViewInit(): void {
    this.animateHeader();

    setTimeout(() => {
      this.displayCards();

      setTimeout(() => {
        this.setupHoverEffects();
        this.setupTouchSupport();
      }, 800);
    }, 400);

    window.addEventListener('resize', this.handleResize);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.resetSelection();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timeline) {
      this.timeline.kill();
    }

    this.cardElements.forEach((card) => {
      gsap.killTweensOf(card);
    });

    window.removeEventListener('resize', this.handleResize);

    const cardContainer = document.getElementById('cardContainer');
    if (cardContainer) {
      cardContainer.innerHTML = '';
    }
  }

  public initialize(): void {
    this.initializeCards();
    this.setupTouchSupport();
    document.body.classList.add('cards-page');
  }
}
