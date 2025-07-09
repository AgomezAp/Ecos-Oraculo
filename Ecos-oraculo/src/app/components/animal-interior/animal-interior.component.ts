import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AnimalChatRequest,
  AnimalGuideData,
  AnimalInteriorService,
} from '../../services/animal-interior.service';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
interface Message {
  role: 'user' | 'guide';
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}
@Component({
  selector: 'app-animal-interior',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './animal-interior.component.html',
  styleUrl: './animal-interior.component.css',
})
export class AnimalInteriorComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  chatMessages: ChatMessage[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;
  //Datos para enviar
  showDataModal: boolean = false;
  userData: any = null;
  // Propiedades para controlar el scroll
  private shouldScrollToBottom: boolean = true;
  private isUserScrolling: boolean = false;
  private lastMessageCount: number = 0;

  // Datos del guía
  private guideData: AnimalGuideData = {
    name: 'Xamán Olivia',
    specialty: 'Guía de Animales Interiores',
    experience: 'Especialista en conexión espiritual con el reino animal',
  };

  // Stripe/payment
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaid: boolean = false;
  firstQuestionAsked: boolean = false;
  blockedMessageId: string | null = null;

  private stripePublishableKey =
    'pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC';
  private backendUrl = environment.apiUrl;

  constructor(
    private animalService: AnimalInteriorService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.stripe = await loadStripe(this.stripePublishableKey);
    this.hasUserPaid =
      sessionStorage.getItem('hasUserPaidAnimalInterior') === 'true';
    const savedMessages = sessionStorage.getItem('animalInteriorMessages');
    const savedFirstQuestion = sessionStorage.getItem(
      'animalInteriorFirstQuestionAsked'
    );
    const savedBlockedMessageId = sessionStorage.getItem(
      'animalInteriorBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.chatMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.lastMessageCount = this.chatMessages.length;
      } catch (error) {}
    }

    if (this.chatMessages.length === 0) {
      this.addMessage({
        sender: 'Xamán Olivia',
        content: `🦉 ¡Saludos, buscador! Soy Olivia, tu guía espiritual del reino animal. Estoy aquí para ayudarte a descubrir y conectar con tu animal interior. 

¿Qué te gustaría explorar sobre tu espíritu animal?`,
        timestamp: new Date(),
        isUser: false,
      });
    }

    this.checkPaymentStatus();
  }

  ngAfterViewChecked(): void {
    // Solo hacer scroll automático si hay nuevos mensajes y el usuario no está haciendo scroll manual
    if (
      this.shouldScrollToBottom &&
      !this.isUserScrolling &&
      this.chatMessages.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.chatMessages.length;
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch {}
      this.paymentElement = undefined;
    }
  }

  private checkPaymentStatus(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get(
      'payment_intent_client_secret'
    );

    if (paymentIntent && paymentIntentClientSecret && this.stripe) {
      this.stripe
        .retrievePaymentIntent(paymentIntentClientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent && paymentIntent.status === 'succeeded') {
            console.log('✅ Pago animal interior confirmado desde URL');
            this.hasUserPaid = true;
            sessionStorage.setItem('hasUserPaidAnimalInterior', 'true');
            this.blockedMessageId = null;
            sessionStorage.removeItem('animalInteriorBlockedMessageId');

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );

            // Agregar mensaje de confirmación
            const lastMessage = this.chatMessages[this.chatMessages.length - 1];
            if (
              !lastMessage ||
              !lastMessage.content.includes('¡Pago confirmado!')
            ) {
              this.shouldScrollToBottom = true;
              this.addMessage({
                sender: 'Xamán Olivia',
                content:
                  '🦉 ✨ ¡Pago confirmado! Los espíritus animales han bendecido nuestra conexión. Ahora puedes acceder a toda la sabiduría del reino animal sin límites. ¡Que la magia ancestral te acompañe!',
                timestamp: new Date(),
                isUser: false,
              });
              this.saveMessagesToSession();
            }
          }
        })
        .catch((error) => {
          console.error('Error verificando el pago animal interior:', error);
        });
    }
  }
  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;
    const userMessage = this.currentMessage.trim();

    if (!this.hasUserPaid && this.firstQuestionAsked) {
      this.saveStateBeforePayment();
      this.showDataModal = true;
      return;
    }

    // Indicar que se debe hacer scroll porque hay un mensaje nuevo
    this.shouldScrollToBottom = true;

    this.addMessage({
      sender: 'Tú',
      content: userMessage,
      timestamp: new Date(),
      isUser: true,
    });

    this.currentMessage = '';
    this.isLoading = true;

    // Preparar conversationHistory para tu servicio
    const conversationHistory = this.chatMessages.slice(-10).map((msg) => ({
      role: msg.isUser ? ('user' as const) : ('guide' as const),
      message: msg.content,
    }));

    // Preparar el request según tu interfaz
    const chatRequest: AnimalChatRequest = {
      guideData: this.guideData,
      userMessage: userMessage,
      conversationHistory: conversationHistory,
    };

    this.animalService.chatWithGuide(chatRequest).subscribe({
      next: (response) => {
        // Indicar que se debe hacer scroll porque hay un mensaje nuevo
        this.shouldScrollToBottom = true;

        if (response.success && response.response) {
          const messageId = Date.now().toString();
          this.addMessage({
            sender: 'Xamán Olivia',
            content: response.response,
            timestamp: new Date(),
            isUser: false,
            id: messageId,
          });

          if (this.firstQuestionAsked && !this.hasUserPaid) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('animalInteriorBlockedMessageId', messageId);
            setTimeout(() => {
              this.saveStateBeforePayment();
              this.promptForPayment();
            }, 2000);
          } else if (!this.firstQuestionAsked) {
            this.firstQuestionAsked = true;
            sessionStorage.setItem('animalInteriorFirstQuestionAsked', 'true');
          }
        } else {
          this.addMessage({
            sender: 'Xamán Olivia',
            content:
              '🦉 Disculpa, no pude conectar con la sabiduría animal en este momento. Intenta de nuevo.',
            timestamp: new Date(),
            isUser: false,
          });
        }
        this.saveMessagesToSession();
        this.isLoading = false;
      },
      error: (error) => {
        this.shouldScrollToBottom = true;
        this.addMessage({
          sender: 'Xamán Olivia',
          content:
            '🦉 Ocurrió un error en la conexión espiritual. Intenta de nuevo.',
          timestamp: new Date(),
          isUser: false,
        });
        this.isLoading = false;
      },
    });
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'animalInteriorFirstQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'animalInteriorBlockedMessageId',
        this.blockedMessageId
      );
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.chatMessages.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem(
        'animalInteriorMessages',
        JSON.stringify(messagesToSave)
      );
    } catch {}
  }

  isMessageBlocked(message: ChatMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaid;
  }

  async promptForPayment(): Promise<void> {
    this.showPaymentModal = true;
    this.paymentError = null;
    this.isProcessingPayment = true;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch {}
      this.paymentElement = undefined;
    }

    try {
      const items = [{ id: 'animal_interior_unlimited', amount: 500 }];
      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          { items }
        )
        .toPromise();
      if (!response || !response.clientSecret)
        throw new Error('Error al obtener la información de pago.');
      this.clientSecret = response.clientSecret;

      if (this.stripe && this.clientSecret) {
        this.elements = this.stripe.elements({
          clientSecret: this.clientSecret,
          appearance: { theme: 'stripe' },
        });
        this.paymentElement = this.elements.create('payment');
        this.isProcessingPayment = false;
        setTimeout(() => {
          const paymentElementContainer = document.getElementById(
            'payment-element-container-animal'
          );
          if (paymentElementContainer && this.paymentElement) {
            this.paymentElement.mount(paymentElementContainer);
          } else {
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
          }
        }, 100);
      }
    } catch (error: any) {
      this.paymentError = error.message || 'Error al inicializar el pago.';
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
      return;
    }
    this.isProcessingPayment = true;
    this.paymentError = null;

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: window.location.origin + window.location.pathname,
      },
      redirect: 'if_required',
    });

    if (error) {
      this.paymentError = error.message || 'Ocurrió un error durante el pago.';
      this.isProcessingPayment = false;
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      this.hasUserPaid = true;
      sessionStorage.setItem('hasUserPaidAnimalInterior', 'true');
      this.showPaymentModal = false;
      this.paymentElement?.destroy();
      this.blockedMessageId = null;
      sessionStorage.removeItem('animalInteriorBlockedMessageId');
      this.shouldScrollToBottom = true;
      this.addMessage({
        sender: 'Xamán Olivia',
        content:
          '🦉 ✨ ¡Pago confirmado! Ahora puedes acceder a toda la sabiduría del reino animal sin límites.',
        timestamp: new Date(),
        isUser: false,
      });
    }
  }

  cancelPayment(): void {
    this.showPaymentModal = false;
    this.clientSecret = null;
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch {}
      this.paymentElement = undefined;
    }
    this.isProcessingPayment = false;
    this.paymentError = null;
  }

  addMessage(message: ChatMessage): void {
    this.chatMessages.push(message);
    this.shouldScrollToBottom = true;
  }

  formatMessage(content: string): string {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<em>$1</em>');
  }

  getTimeString(timestamp: Date | string): string {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  }

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const isAtBottom =
      element.scrollHeight - element.scrollTop === element.clientHeight;

    // Si el usuario no está en el fondo, está haciendo scroll manual
    this.isUserScrolling = !isAtBottom;

    // Si el usuario vuelve al fondo, permitir scroll automático nuevamente
    if (isAtBottom) {
      this.isUserScrolling = false;
    }
  }

  onUserStartScroll(): void {
    // Indicar que el usuario está haciendo scroll manual
    this.isUserScrolling = true;

    // Después de 3 segundos sin actividad, permitir scroll automático nuevamente
    setTimeout(() => {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        const isAtBottom =
          element.scrollHeight - element.scrollTop === element.clientHeight;
        if (isAtBottom) {
          this.isUserScrolling = false;
        }
      }
    }, 3000);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch {}
  }

  clearChat(): void {
    // Limpiar mensajes del chat
    this.chatMessages = [];
    this.currentMessage = '';
    this.lastMessageCount = 0;

    // Resetear estados
    this.firstQuestionAsked = false;
    this.blockedMessageId = null;
    this.isLoading = false;

    // Limpiar sessionStorage
    sessionStorage.removeItem('animalInteriorMessages');
    sessionStorage.removeItem('animalInteriorFirstQuestionAsked');
    sessionStorage.removeItem('animalInteriorBlockedMessageId');

    // Indicar que se debe hacer scroll porque hay un mensaje nuevo
    this.shouldScrollToBottom = true;

    // Agregar mensaje de bienvenida inicial
    this.addMessage({
      sender: 'Xamán Olivia',
      content: `🦉 ¡Saludos, buscador! Soy Olivia, tu guía espiritual del reino animal. Estoy aquí para ayudarte a descubrir y conectar con tu animal interior. 

¿Qué te gustaría explorar sobre tu espíritu animal?`,
      timestamp: new Date(),
      isUser: false,
    });
  }
  onUserDataSubmitted(userData: any): void {
    console.log('Datos del usuario recibidos:', userData);
    this.showDataModal = false;

    setTimeout(() => {
      this.promptForPayment();
    }, 300);
  }

  onDataModalClosed(): void {
    this.showDataModal = false;
  }
}
