import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  Stripe,
  StripeElements,
  StripePaymentElement,
  loadStripe,
} from '@stripe/stripe-js';
import { ParticlesComponent } from '../../../shared/particles/particles.component';
import { CommonModule } from '@angular/common';
import { CardService } from '../../../services/tarot/card.service';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-cards',
  imports: [ CommonModule],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css',
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      transition(':enter', [animate('1s ease-in', style({ opacity: 1 }))]),
    ]),
  ],
})

export class CardsComponent implements OnInit, OnDestroy {
  cards: any[] = [];
  selectedCards: { src: string; name: string; descriptions: string[] }[] = [];
  private theme: string = '';

  // Stripe and Payment Modal Properties
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;

  // IMPORTANT: Replace with your actual Stripe publishable key and backend URL
  private stripePublishableKey =
    'pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC'; // <--- REPLACE THIS
  private backendUrl = 'http://localhost:3010';

  constructor(
    private cardService: CardService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    // Obtener el tema de la ruta
    this.route.params.subscribe((params) => {
      this.theme = params['theme'];
      this.initializeCards();
    });
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError =
        'Could not load payment system. Please refresh the page.';
    }
  }

  ngOnDestroy(): void {
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log(
          'El elemento de pago ya fue destruido o no está disponible'
        );
      } finally {
        this.paymentElement = undefined;
      }
    }
  }

  initializeCards(): void {
    this.cardService.clearSelectedCards();
    this.selectedCards = []; // Ensure selectedCards is also reset
    const cardContainer = document.getElementById('cardContainer');
    if (cardContainer) {
      cardContainer.innerHTML = ''; // Clear previous cards from the DOM
    }
    this.cards = this.cardService.getCardsByTheme(this.theme);
    this.displayCards();
  }

  displayCards(): void {
    const cardContainer = document.getElementById('cardContainer');
    if (!cardContainer) {
      console.error(
        '❌ No se encontró el contenedor de cartas (#cardContainer)'
      );
      return;
    }

    if (this.cards.length === 0) {
      console.warn('⚠️ No hay cartas para mostrar.');
      return;
    }

    const numberOfCards = 12; // Or this.cards.length if you want to display all fetched cards
    const startAngle = -40;
    const angleStep = 90 / (numberOfCards - 1);
    const isMobile = window.innerWidth <= 768;
    const radius = isMobile ? 140 : 240;
    const centerX = window.innerWidth / 2.0;
    const centerY = window.innerHeight / (isMobile ? 2.2 : 1.45) + 20;

    for (let i = 0; i < Math.min(numberOfCards, this.cards.length); i++) {
      const cardData = this.cards[i];

      if (cardData && cardData.src) {
        const angle = startAngle + i * angleStep;
        const radian = angle * (Math.PI / 180);

        const card = document.createElement('div');
        card.classList.add('card');
        card.style.position = 'absolute';
        card.style.width = isMobile ? '120px' : '150px'; // Tamaño adaptable
        card.style.height = isMobile ? '200px' : '245px'; // Ajusta la altura aquí
        card.style.border = '1px solid #ccc';
        card.style.borderRadius = '10px';
        card.style.left = `${
          centerX + radius * Math.sin(radian) - (isMobile ? 40 : 95)
        }px`;
        card.style.top = `${
          centerY - radius * Math.cos(radian) - (isMobile ? 100 : 125)
        }px`; // Ajusta la posición vertical aquí
        card.style.opacity = '0';
        card.style.zIndex = `${i}`;
        card.style.transform = `rotate(${angle}deg)`;
        card.style.backgroundImage = "url('/card-back.webp')";
        card.style.backgroundSize = 'cover';
        card.style.transition = 'all 0.5s ease-in-out';

        card.dataset['src'] = cardData.src;
        card.dataset['name'] = cardData.name;
        card.dataset['descriptions'] = cardData.descriptions.join('.,');
        card.addEventListener('mouseenter', () => {
          card.style.boxShadow =
            '0 0 8px rgba(255, 215, 0, 0.8), 0 0 15px rgba(255, 215, 0, 0.6)';
        });

        card.addEventListener('mouseleave', () => {
          card.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        });

        card.addEventListener('click', this.selectCard.bind(this));
        cardContainer.appendChild(card);

        setTimeout(() => {
          card.style.opacity = '1';
        }, i * 100);
      } else {
        console.error(`⚠️ La carta en el índice ${i} no tiene datos válidos.`);
      }
    }
  }

  selectCard(event: Event): void {
    const target = event.currentTarget as HTMLElement; // Use currentTarget for dynamically added listeners
    if (
      this.selectedCards.length >= 3 ||
      target.classList.contains('selected')
    ) {
      return;
    }

    const currentZIndex = 1500 + this.selectedCards.length;
    target.style.zIndex = currentZIndex.toString();

    target.classList.add('selected');
    target.style.transition = 'all 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

    const isMobile = window.innerWidth <= 768;
    const centerX = window.innerWidth / 1.6;
    const centerY = window.innerHeight / 4.25 + (isMobile ? 125 : 150);
    const cardSpacing = isMobile ? 40 : 100; // Menor espacio entre cartas en móvil

    // Calcular nueva posición basada en cantidad de seleccionadas
    const offsetX = (this.selectedCards.length - 1) * cardSpacing - cardSpacing;

    target.style.left = `${centerX - (isMobile ? 40 : 125) + offsetX}px`;
    target.style.top = `${centerY - (isMobile ? 40 : 125)}px`;
    target.style.transform = `scale(${isMobile ? 1.1 : 1.2}) rotateY(180deg)`; // Enhanced shadow for selected

    this.selectedCards.push({
      src: target.dataset['src'] || '',
      name: target.dataset['name'] || '',
      descriptions: target.dataset['descriptions']?.split('.,') || [],
    });

    setTimeout(() => {
      target.style.backgroundImage = `url('${target.dataset['src']}')`;
      target.style.pointerEvents = 'none'; // Disable further clicks on this card
    }, 850); // Corresponds to half of the 1.5s rotation

    if (this.selectedCards.length === 3) {
      this.cardService.setSelectedCards(this.selectedCards);
      // Añade un elemento visual que indique que se está preparando la lectura
      setTimeout(() => {
        this.promptForPayment();
      }, 3000); // 3 segundos de espera
    }
  }

  async promptForPayment(): Promise<void> {
    this.showPaymentModal = true;
    this.paymentError = null;
    this.isProcessingPayment = true;

    this.paymentElement?.destroy();

    try {
      const items = [{ id: 'tarot_reading_description', amount: 500 }]; // Example: 5.00 EUR

      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}/create-payment-intent`,
          { items }
        )
        .toPromise();

      if (!response || !response.clientSecret) {
        throw new Error(
          'Error al obtener la información de pago del servidor.'
        );
      }
      this.clientSecret = response.clientSecret;

      if (this.stripe && this.clientSecret) {
        this.elements = this.stripe.elements({
          clientSecret: this.clientSecret,
          appearance: { theme: 'stripe' },
        });
        this.paymentElement = this.elements.create('payment');

        setTimeout(() => {
          // Ensure modal is rendered before mounting
          const paymentElementContainer = document.getElementById(
            'payment-element-container'
          );
          if (paymentElementContainer && this.paymentElement) {
            this.paymentElement.mount(paymentElementContainer);
            this.isProcessingPayment = false;
          } else {
            console.error('Contenedor del elemento de pago no encontrado.');
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
            this.isProcessingPayment = false;
          }
        }, 100);
      } else {
        throw new Error(
          'Stripe.js o la clave secreta del cliente no están disponibles.'
        );
      }
    } catch (error: any) {
      console.error('Error al preparar el pago:', error);
      this.paymentError =
        error.message ||
        'Error al inicializar el pago. Por favor, inténtalo de nuevo.';
      this.isProcessingPayment = false;
    }
  }

async handlePaymentSubmit(): Promise<void> {
  if (
    !this.stripe ||
    !this.elements ||
    !this.clientSecret ||
    !this.paymentElement
  ) {
    this.paymentError =
      'El sistema de pago no está inicializado correctamente.';
    this.isProcessingPayment = false;
    return;
  }

  this.isProcessingPayment = true;
  this.paymentError = null;

  // Usa confirmParams con return_url para métodos de pago que requieren redirección
  const { error, paymentIntent } = await this.stripe.confirmPayment({
    elements: this.elements,
    confirmParams: {
      // Asegúrate de usar una URL absoluta y actualiza esta URL según corresponda a tu entorno
      return_url: window.location.origin + '/descripcion-cartas',
    },
    redirect: 'if_required',
  });

  // Si hay un error durante la confirmación
  if (error) {
    this.paymentError =
      error.message || 'Ocurrió un error inesperado durante el pago.';
    this.isProcessingPayment = false;
  } else if (paymentIntent) {
    // Si obtenemos un paymentIntent, procesamos su estado
    switch (paymentIntent.status) {
      case 'succeeded':
        console.log('¡Pago exitoso!');
        this.showPaymentModal = false;
        this.paymentElement?.destroy();
        this.fadeOutAndNavigate();
        break;
      case 'processing':
        this.paymentError =
          'El pago se está procesando. Te notificaremos cuando se complete.';
        // Mantener isProcessingPayment como true o manejar según preferencia de UX
        break;
      case 'requires_payment_method':
        this.paymentError =
          'Pago fallido. Por favor, intenta con otro método de pago.';
        this.isProcessingPayment = false;
        break;
      case 'requires_action':
        // Para métodos que requieren acción adicional, el usuario podría ser redirigido
        this.paymentError =
          'Se requiere una acción adicional para completar el pago.';
        this.isProcessingPayment = false;
        break;
      default:
        this.paymentError = `Estado del pago: ${paymentIntent.status}. Inténtalo de nuevo.`;
        this.isProcessingPayment = false;
        break;
    }
  } else {
    // Si no hay error ni paymentIntent (caso raro)
    this.paymentError = 'No se pudo determinar el estado del pago.';
    this.isProcessingPayment = false;
  }
}

  cancelPayment(): void {
    this.showPaymentModal = false;
    this.clientSecret = null;

    // Manejo seguro de la destrucción del elemento
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }

    this.isProcessingPayment = false;
    this.paymentError = null;
  }

  private ajustarPosicionFinal(isMobile: boolean): void {
    // This method might still be useful if you want a final "tidy up" animation
    // after selection but before the payment modal, or if selectCard's positioning
    // isn't final. For now, selectCard handles the final selected positions.
    const selectedElements = document.getElementsByClassName('selected');
    const cardWidth = isMobile ? 80 : 120;
    const spacing = isMobile ? 10 : 20;
    const totalWidth = cardWidth * 3 + spacing * 2;
    const startX = (window.innerWidth - totalWidth) / 2;
    const centerY = window.innerHeight * (isMobile ? 0.65 : 0.6); // Consistent with selectCard

    Array.from(selectedElements).forEach((card: Element, index: number) => {
      const htmlCard = card as HTMLElement;
      htmlCard.style.transition = 'all 0.8s ease-out'; // Faster final adjustment
      htmlCard.style.left = `${startX + index * (cardWidth + spacing)}px`;
      htmlCard.style.top = `${centerY}px`;
      // Transform might already be set by selectCard, confirm if it needs to be reapplied
      // htmlCard.style.transform = `scale(${isMobile ? 1.1 : 1.2}) rotateY(180deg)`;
    });
  }

  private fadeOutAndNavigate(): void {
    const cardContainer = document.getElementById('cardContainer');
    const paymentModalOverlay = document.querySelector(
      '.payment-modal-overlay'
    ) as HTMLElement;

    // Fade out modal if it's visible
    if (paymentModalOverlay) {
      paymentModalOverlay.style.opacity = '0';
      paymentModalOverlay.style.transition = 'opacity 0.5s ease-out';
    }

    // Destruye el elemento de pago de forma segura
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago:', error);
      } finally {
        this.paymentElement = undefined; // Importante: marca como undefined después de destruirlo
      }
    }

    // Continúa con la navegación
    if (cardContainer) {
      cardContainer.classList.add('fade-out');
      cardContainer.addEventListener(
        'animationend',
        () => {
          this.router.navigate(['/descripcion-cartas']);
        },
        { once: true }
      );
    } else {
      setTimeout(() => {
        this.router.navigate(['/descripcion-cartas']);
      }, 500);
    }
  }
}
