import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  Optional,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { InformacionZodiacoService } from '../../services/informacion-zodiaco.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
interface ZodiacMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  sender: string;
}

// ✅ Definir AstrologerData según tu servicio
interface AstrologerData {
  name: string;
  title: string;
  specialty: string;
  experience: string;
}
interface ZodiacRequest {
  zodiacData: AstrologerData;
  userMessage: string;
  conversationHistory?: Array<{
    role: 'user' | 'astrologer';
    message: string;
  }>;
}

interface ZodiacResponse {
  success: boolean;
  response?: string;
  error?: string;
  timestamp: string;
}

interface AstrologerInfo {
  success: boolean;
  astrologer: {
    name: string;
    title: string;
    specialty: string;
    description: string;
  };
  timestamp: string;
}
@Component({
  selector: 'app-informacion-zodiaco',
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
  templateUrl: './informacion-zodiaco.component.html',
  styleUrl: './informacion-zodiaco.component.css',
})
export class InformacionZodiacoComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variables principales del chat
  currentMessage: string = '';
  messages: any[] = [];
  isLoading = false;
  hasStartedConversation = false;

  // Variables de control de scroll
  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  showDataModal: boolean = false;
  userData: any = null;

  // Variables para control de pagos
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForAstrology: boolean = false;
  firstQuestionAsked: boolean = false;

  // NUEVA PROPIEDAD para controlar mensajes bloqueados
  blockedMessageId: string | null = null;

  // Configuración de Stripe
  private stripePublishableKey =
    'pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC';
  private backendUrl = 'http://localhost:3010';

  astrologerInfo = {
    name: 'Maestra Carla',
    title: 'Guardiana de las Estrellas',
    specialty: 'Especialista en Astrología y Signos Zodiacales',
  };

  // Frases de bienvenida aleatorias
  welcomeMessages = [
    'Bienvenido, alma cósmica. Las estrellas me han susurrado tu llegada... ¿Qué misterios del zodíaco deseas desentrañar hoy?',
    'Los planetas se alinean para recibirte. Soy Maestra Carla, intérprete de los designios astrales. ¿Sobre qué signo o aspecto celestial deseas consultar?',
    'El cosmos vibra con tu presencia... Las constelaciones danzan esperando tus preguntas. Permíteme guiarte por los senderos del zodíaco.',
    'Ah, veo que los astros te han dirigido hacia mí. Los secretos de los signos zodiacales aguardan ser revelados. ¿Qué te inquieta del firmamento?',
  ];

  constructor(
    private http: HttpClient,
    private zodiacoService: InformacionZodiacoService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() public dialogRef: MatDialogRef<InformacionZodiacoComponent>
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError =
        'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    // ✅ Usar sessionStorage para astrología
    this.hasUserPaidForAstrology =
      sessionStorage.getItem('hasUserPaidForAstrology') === 'true';

    // ✅ Verificar si hay mensajes guardados en sessionStorage
    const savedMessages = sessionStorage.getItem('astrologyMessages');
    const savedFirstQuestion = sessionStorage.getItem(
      'firstAstrologyQuestionAsked'
    );
    const savedBlockedMessageId = sessionStorage.getItem(
      'blockedAstrologyMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
        console.log(
          '✅ Mensajes de astrología restaurados desde sessionStorage'
        );
      } catch (error) {
        console.error('Error al restaurar mensajes:', error);
        this.clearSessionData();
        this.startConversation();
      }
    } else {
      this.startConversation();
    }

    // ✅ Verificar URL para pagos exitosos
    this.checkPaymentStatus();
  }

  private checkPaymentStatus(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get(
      'payment_intent_client_secret'
    );

    if (paymentIntent && paymentIntentClientSecret && this.stripe) {
      console.log('🔍 Verificando estado del pago astral...');

      this.stripe
        .retrievePaymentIntent(paymentIntentClientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent) {
            switch (paymentIntent.status) {
              case 'succeeded':
                console.log('✅ Pago astral confirmado desde URL');
                this.hasUserPaidForAstrology = true;
                sessionStorage.setItem('hasUserPaidForAstrology', 'true');
                this.blockedMessageId = null;
                sessionStorage.removeItem('blockedAstrologyMessageId');

                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );

                const lastMessage = this.messages[this.messages.length - 1];
                if (
                  !lastMessage ||
                  !lastMessage.content.includes('¡Pago confirmado!')
                ) {
                  const confirmationMsg = {
                    isUser: false,
                    content:
                      '✨ ¡Pago confirmado! Ahora puedes consultar los astros ilimitadamente. Los misterios del zodíaco están a tu disposición. ¿Qué otro aspecto astral te gustaría explorar?',
                    timestamp: new Date(),
                  };
                  this.messages.push(confirmationMsg);
                  this.saveMessagesToSession();
                }
                break;

              case 'processing':
                console.log('⏳ Pago astral en procesamiento');
                break;

              case 'requires_payment_method':
                console.log('❌ Pago astral falló');
                this.clearSessionData();
                break;
            }
          }
        })
        .catch((error) => {
          console.error('Error verificando el pago astral:', error);
        });
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.messages.length > this.lastMessageCount) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages.length;
    }
  }

  ngOnDestroy(): void {
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const threshold = 50;
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      threshold;
    this.shouldAutoScroll = isNearBottom;
  }

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  startConversation(): void {
    if (this.messages.length === 0) {
      const randomWelcome =
        this.welcomeMessages[
          Math.floor(Math.random() * this.welcomeMessages.length)
        ];

      const welcomeMessage = {
        isUser: false,
        content: randomWelcome,
        timestamp: new Date(),
      };

      this.messages.push(welcomeMessage);
    }
    this.hasStartedConversation = true;
  }

  sendMessage(): void {
    if (this.currentMessage?.trim() && !this.isLoading) {
      const userMessage = this.currentMessage.trim();

      // Verificar si es la SEGUNDA pregunta y si no ha pagado
      if (!this.hasUserPaidForAstrology && this.firstQuestionAsked) {
        this.saveStateBeforePayment();
        this.showDataModal = true;
        return;
      }

      this.shouldAutoScroll = true;

      // Agregar mensaje del usuario
      const userMsg = {
        isUser: true,
        content: userMessage,
        timestamp: new Date(),
      };
      this.messages.push(userMsg);

      this.saveMessagesToSession();
      this.currentMessage = '';
      this.isLoading = true;

      // Usar el servicio real de astrología
      this.generateAstrologyResponse(userMessage).subscribe({
        next: (response: any) => {
          this.isLoading = false;

          const messageId = Date.now().toString();
          const astrologerMsg = {
            isUser: false,
            content: response,
            timestamp: new Date(),
            id: messageId,
          };
          this.messages.push(astrologerMsg);

          this.shouldAutoScroll = true;

          if (this.firstQuestionAsked && !this.hasUserPaidForAstrology) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('blockedAstrologyMessageId', messageId);

            setTimeout(() => {
              this.saveStateBeforePayment();
              this.promptForPayment();
            }, 2000);
          } else if (!this.firstQuestionAsked) {
            this.firstQuestionAsked = true;
            sessionStorage.setItem('firstAstrologyQuestionAsked', 'true');
          }

          this.saveMessagesToSession();
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Error al obtener respuesta astrológica:', error);

          const errorMsg = {
            isUser: false,
            content:
              '🌟 Disculpa, las energías cósmicas están temporalmente perturbadas. Por favor, intenta nuevamente en unos momentos.',
            timestamp: new Date(),
          };
          this.messages.push(errorMsg);
          this.saveMessagesToSession();
        },
      });
    }
  }
  private generateAstrologyResponse(userMessage: string): Observable<string> {
    // Crear el historial de conversación para el contexto
    const conversationHistory = this.messages
      .filter((msg) => msg.content && msg.content.trim() !== '')
      .map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('astrologer' as const),
        message: msg.content,
      }));

    // Datos del astrólogo
    const astrologerData: AstrologerData = {
      name: this.astrologerInfo.name,
      title: this.astrologerInfo.title,
      specialty: this.astrologerInfo.specialty,
      experience:
        'Siglos de experiencia interpretando los designios celestiales y la influencia de los astros',
    };

    // ✅ Crear la solicitud con 'zodiacData' en lugar de 'astrologerData'
    const request: ZodiacRequest = {
      zodiacData: astrologerData, // ✅ Cambiar aquí
      userMessage,
      conversationHistory,
    };

    // Llamar al servicio y transformar la respuesta
    return this.zodiacoService.chatWithAstrologer(request).pipe(
      map((response: ZodiacResponse) => {
        if (response.success && response.response) {
          return response.response;
        } else {
          throw new Error(response.error || 'Error desconocido del servicio');
        }
      }),
      catchError((error: any) => {
        console.error('Error en el servicio de astrología:', error);
        return of(
          '🌟 Las estrellas están temporalmente nubladas. Los astros me susurran que debo recargar mis energías cósmicas. Por favor, intenta nuevamente en unos momentos.'
        );
      })
    );
  }

  private saveStateBeforePayment(): void {
    console.log('💾 Guardando estado astral antes del pago...');
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'firstAstrologyQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'blockedAstrologyMessageId',
        this.blockedMessageId
      );
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.messages.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem(
        'astrologyMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
      console.error('Error guardando mensajes astrales:', error);
    }
  }

  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForAstrology');
    sessionStorage.removeItem('astrologyMessages');
    sessionStorage.removeItem('firstAstrologyQuestionAsked');
    sessionStorage.removeItem('blockedAstrologyMessageId');
  }

  isMessageBlocked(message: any): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForAstrology
    );
  }

  async promptForPayment(): Promise<void> {
    console.log('💳 EJECUTANDO promptForPayment() para astrología');

    this.showPaymentModal = true;
    this.paymentError = null;
    this.isProcessingPayment = true;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error destruyendo elemento anterior:', error);
      }
      this.paymentElement = undefined;
    }

    try {
      const items = [{ id: 'astrology_consultation_unlimited', amount: 500 }];

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
        this.isProcessingPayment = false;

        setTimeout(() => {
          const paymentElementContainer = document.getElementById(
            'payment-element-container'
          );

          if (paymentElementContainer && this.paymentElement) {
            console.log('✅ Montando payment element astral...');
            this.paymentElement.mount(paymentElementContainer);
          } else {
            console.error('❌ Contenedor del elemento de pago no encontrado.');
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
          }
        }, 100);
      } else {
        throw new Error(
          'Stripe.js o la clave secreta del cliente no están disponibles.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error al preparar el pago astral:', error);
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

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: window.location.origin + window.location.pathname,
      },
      redirect: 'if_required',
    });

    if (error) {
      this.paymentError =
        error.message || 'Ocurrió un error inesperado durante el pago.';
      this.isProcessingPayment = false;
    } else if (paymentIntent) {
      switch (paymentIntent.status) {
        case 'succeeded':
          console.log('¡Pago exitoso para consultas astrales!');
          this.hasUserPaidForAstrology = true;
          sessionStorage.setItem('hasUserPaidForAstrology', 'true');
          this.showPaymentModal = false;
          this.paymentElement?.destroy();

          this.blockedMessageId = null;
          sessionStorage.removeItem('blockedAstrologyMessageId');

          const confirmationMsg = {
            isUser: false,
            content:
              '✨ ¡Pago confirmado! Ahora puedes consultar los astros ilimitadamente. Los misterios del zodíaco están a tu disposición. ¿Qué otro aspecto astral te gustaría explorar?',
            timestamp: new Date(),
          };
          this.messages.push(confirmationMsg);

          this.shouldAutoScroll = true;
          this.saveMessagesToSession();
          break;
        case 'processing':
          this.paymentError =
            'El pago se está procesando. Te notificaremos cuando se complete.';
          break;
        case 'requires_payment_method':
          this.paymentError =
            'Pago fallido. Por favor, intenta con otro método de pago.';
          this.isProcessingPayment = false;
          break;
        default:
          this.paymentError = `Estado del pago: ${paymentIntent.status}. Inténtalo de nuevo.`;
          this.isProcessingPayment = false;
          break;
      }
    } else {
      this.paymentError = 'No se pudo determinar el estado del pago.';
      this.isProcessingPayment = false;
    }
  }

  cancelPayment(): void {
    this.showPaymentModal = false;
    this.clientSecret = null;

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

  clearConversation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForAstrology) {
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('astrologyMessages');
      sessionStorage.removeItem('firstAstrologyQuestionAsked');
      sessionStorage.removeItem('blockedAstrologyMessageId');
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
    }

    this.messages = [];
    this.hasStartedConversation = false;
    setTimeout(() => {
      this.startConversation();
    }, 500);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  formatMessage(content: string): string {
    // Método para formatear mensajes - implementa según necesites
    return content;
  }

  // Métodos específicos del zodíaco - implementa según tu lógica
  getZodiacSymbol(sign: string): string {
    // Implementar lógica para símbolos del zodíaco
    return '♈'; // Ejemplo
  }

  getZodiacElement(sign: string): string {
    // Implementar lógica para elementos
    return 'Fuego'; // Ejemplo
  }

  getZodiacModality(sign: string): string {
    // Implementar lógica para modalidades
    return 'Cardinal'; // Ejemplo
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
