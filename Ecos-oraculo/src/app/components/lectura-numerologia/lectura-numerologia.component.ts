import { AfterViewChecked, Component, ElementRef, Inject, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { NumerologiaService } from '../../services/numerologia.service';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
interface NumerologyMessage {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}
interface ConversationMessage {
  role: 'user' | 'numerologist';
  message: string;
  timestamp: Date;
  id?: string;
}

@Component({
  selector: 'app-historia-sagrada',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './lectura-numerologia.component.html',
  styleUrl: './lectura-numerologia.component.css',
})
export class LecturaNumerologiaComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variables principales del chat
  messages: ConversationMessage[] = [];
  currentMessage: string = '';
  messageInput = new FormControl('');
  isLoading: boolean = false;
  isTyping: boolean = false;
  hasStartedConversation: boolean = false;
  showDataForm: boolean = false;

  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  // Variables para control de pagos
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForNumerology: boolean = false;
  firstQuestionAsked: boolean = false;

  // NUEVA PROPIEDAD para controlar mensajes bloqueados
  blockedMessageId: string | null = null;

  // Configuración de Stripe
  private stripePublishableKey = 'pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC';
  private backendUrl = 'http://localhost:3010';

  // Datos personales
  fullName: string = '';
  birthDate: string = '';

  // Números calculados
  personalNumbers = {
    lifePath: 0,
    destiny: 0,
  };

  // Info del numerólogo
  numerologistInfo = {
    name: 'Maestra Pythia',
    title: 'Guardiana de los Números Sagrados',
    specialty: 'Numerología y vibración numérica universal',
  };

  // Frases de bienvenida aleatorias
  welcomeMessages = [
    'Salve, buscador de la sabiduría numérica... Los números son el lenguaje del universo y revelan los secretos de tu destino. ¿Qué deseas conocer sobre tu vibración numerológica?',
    'Las energías numéricas me susurran que has venido buscando respuestas... Soy Maestra Pythia, guardiana de los números sagrados. ¿Qué misterio numérico te inquieta?',
    'Bienvenido al templo de los números sagrados. Los patrones matemáticos del cosmos han anunciado tu llegada. Permíteme revelarte los secretos de tu código numerológico.',
    'Los números danzan ante mí revelando tu presencia... Cada número tiene un significado, cada cálculo revela un destino. ¿Qué números deseas que interprete para ti?'
  ];

  constructor(
    @Optional() public dialogRef: MatDialogRef<LecturaNumerologiaComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private numerologyService: NumerologiaService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError = 'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    this.hasUserPaidForNumerology = sessionStorage.getItem('hasUserPaidForNumerology') === 'true';

    const savedMessages = sessionStorage.getItem('numerologyMessages');
    const savedFirstQuestion = sessionStorage.getItem('numerologyFirstQuestionAsked');
    const savedBlockedMessageId = sessionStorage.getItem('numerologyBlockedMessageId');

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
        console.log('✅ Mensajes de numerología restaurados desde sessionStorage');
      } catch (error) {
        console.error('Error al restaurar mensajes:', error);
        this.clearSessionData();
        this.startConversation();
      }
    } else {
      this.startConversation();
    }

    // Verificar URL para pagos exitosos
    this.checkPaymentStatus();

    // Probar conexión
    this.numerologyService.testConnection().subscribe({
      next: (response) => {
        console.log('✅ Conexión con numerología exitosa:', response);
      },
      error: (error) => {
        console.error('❌ Error de conexión con numerología:', error);
      },
    });
  }

  private checkPaymentStatus(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

    if (paymentIntent && paymentIntentClientSecret && this.stripe) {
      console.log('🔍 Verificando estado del pago de numerología...');

      this.stripe.retrievePaymentIntent(paymentIntentClientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent) {
            switch (paymentIntent.status) {
              case 'succeeded':
                console.log('✅ Pago de numerología confirmado desde URL');
                this.hasUserPaidForNumerology = true;
                sessionStorage.setItem('hasUserPaidForNumerology', 'true');
                this.blockedMessageId = null;
                sessionStorage.removeItem('numerologyBlockedMessageId');

                window.history.replaceState({}, document.title, window.location.pathname);

                const lastMessage = this.messages[this.messages.length - 1];
                if (!lastMessage || !lastMessage.message.includes('¡Pago confirmado!')) {
                  const confirmationMsg: ConversationMessage = {
                    role: 'numerologist',
                    message: '✨ ¡Pago confirmado! Ahora puedes acceder a todas las interpretaciones numerológicas que desees. Los números sagrados están a tu disposición. ¿Qué otro aspecto numerológico te gustaría explorar?',
                    timestamp: new Date(),
                  };
                  this.messages.push(confirmationMsg);
                  this.saveMessagesToSession();
                }
                break;

              case 'processing':
                console.log('⏳ Pago en procesamiento');
                break;

              case 'requires_payment_method':
                console.log('❌ Pago falló');
                this.clearSessionData();
                break;
            }
          }
        })
        .catch((error:any) => {
          console.error('Error verificando el pago:', error);
        });
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.messages.length > this.lastMessageCount) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages.length;
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const threshold = 50;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
    this.shouldAutoScroll = isNearBottom;
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

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  startConversation(): void {
    if (this.messages.length === 0) {
      const randomWelcome = this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)];

      const welcomeMessage: ConversationMessage = {
        role: 'numerologist',
        message: randomWelcome,
        timestamp: new Date(),
      };

      this.messages.push(welcomeMessage);
    }
    this.hasStartedConversation = true;
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage = this.currentMessage.trim();

    // Verificar si es la SEGUNDA pregunta y si no ha pagado
    if (!this.hasUserPaidForNumerology && this.firstQuestionAsked) {
      this.saveStateBeforePayment();
      this.promptForPayment();
      return;
    }

    this.shouldAutoScroll = true;

    // Agregar mensaje del usuario
    const userMsg: ConversationMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isTyping = true;
    this.isLoading = true;

    // Preparar historial de conversación
    const conversationHistory = this.messages.slice(-10).map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('numerologist' as const),
      message: msg.message,
    }));

    // Enviar al servicio
    this.numerologyService
      .sendMessage(
        userMessage,
        this.birthDate || undefined,
        this.fullName || undefined,
        conversationHistory
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isTyping = false;

          if (response) {
            const messageId = Date.now().toString();

            const numerologistMsg: ConversationMessage = {
              role: 'numerologist',
              message: response,
              timestamp: new Date(),
              id: messageId,
            };
            this.messages.push(numerologistMsg);

            this.shouldAutoScroll = true;

            if (this.firstQuestionAsked && !this.hasUserPaidForNumerology) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('numerologyBlockedMessageId', messageId);

              setTimeout(() => {
                this.saveStateBeforePayment();
                this.promptForPayment();
              }, 2000);
            } else if (!this.firstQuestionAsked) {
              this.firstQuestionAsked = true;
              sessionStorage.setItem('numerologyFirstQuestionAsked', 'true');
            }

            this.saveMessagesToSession();
          } else {
            this.handleError('Error al obtener respuesta del numerólogo');
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.isTyping = false;
          console.error('Error:', error);
          this.handleError('Error de conexión. Por favor, inténtalo de nuevo.');
        },
      });
  }

  private saveStateBeforePayment(): void {
    console.log('💾 Guardando estado de numerología antes del pago...');
    this.saveMessagesToSession();
    sessionStorage.setItem('numerologyFirstQuestionAsked', this.firstQuestionAsked.toString());
    if (this.blockedMessageId) {
      sessionStorage.setItem('numerologyBlockedMessageId', this.blockedMessageId);
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
      }));
      sessionStorage.setItem('numerologyMessages', JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error guardando mensajes:', error);
    }
  }

  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForNumerology');
    sessionStorage.removeItem('numerologyMessages');
    sessionStorage.removeItem('numerologyFirstQuestionAsked');
    sessionStorage.removeItem('numerologyBlockedMessageId');
  }

  isMessageBlocked(message: ConversationMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaidForNumerology;
  }

  async promptForPayment(): Promise<void> {
    console.log('💳 EJECUTANDO promptForPayment() para numerología');

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
      const items = [{ id: 'numerology_reading_unlimited', amount: 500 }];
      console.log('📤 Enviando request de payment intent para numerología...');

      const response = await this.http
        .post<{ clientSecret: string }>(`${this.backendUrl}/create-payment-intent`, { items })
        .toPromise();

      console.log('📥 Respuesta de payment intent:', response);

      if (!response || !response.clientSecret) {
        throw new Error('Error al obtener la información de pago del servidor.');
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
          const paymentElementContainer = document.getElementById('payment-element-container');
          console.log('🎯 Contenedor encontrado:', paymentElementContainer);

          if (paymentElementContainer && this.paymentElement) {
            console.log('✅ Montando payment element...');
            this.paymentElement.mount(paymentElementContainer);
          } else {
            console.error('❌ Contenedor del elemento de pago no encontrado.');
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
          }
        }, 100);
      } else {
        throw new Error('Stripe.js o la clave secreta del cliente no están disponibles.');
      }
    } catch (error: any) {
      console.error('❌ Error al preparar el pago:', error);
      this.paymentError = error.message || 'Error al inicializar el pago. Por favor, inténtalo de nuevo.';
      this.isProcessingPayment = false;
    }
  }

  async handlePaymentSubmit(): Promise<void> {
    if (!this.stripe || !this.elements || !this.clientSecret || !this.paymentElement) {
      this.paymentError = 'El sistema de pago no está inicializado correctamente.';
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
      this.paymentError = error.message || 'Ocurrió un error inesperado durante el pago.';
      this.isProcessingPayment = false;
    } else if (paymentIntent) {
      switch (paymentIntent.status) {
        case 'succeeded':
          console.log('¡Pago exitoso para numerología!');
          this.hasUserPaidForNumerology = true;
          sessionStorage.setItem('hasUserPaidForNumerology', 'true');
          this.showPaymentModal = false;
          this.paymentElement?.destroy();

          this.blockedMessageId = null;
          sessionStorage.removeItem('numerologyBlockedMessageId');

          const confirmationMsg: ConversationMessage = {
            role: 'numerologist',
            message: '✨ ¡Pago confirmado! Ahora puedes acceder a todas las interpretaciones numerológicas que desees. Los números sagrados revelarán todos sus secretos. ¿Qué otro aspecto numerológico te gustaría explorar?',
            timestamp: new Date(),
          };
          this.messages.push(confirmationMsg);

          this.shouldAutoScroll = true;
          this.saveMessagesToSession();
          break;
        case 'processing':
          this.paymentError = 'El pago se está procesando. Te notificaremos cuando se complete.';
          break;
        case 'requires_payment_method':
          this.paymentError = 'Pago fallido. Por favor, intenta con otro método de pago.';
          this.isProcessingPayment = false;
          break;
        case 'requires_action':
          this.paymentError = 'Se requiere una acción adicional para completar el pago.';
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

  savePersonalData(): void {
    if (this.fullName) {
      this.personalNumbers.destiny = this.numerologyService.calculateDestinyNumber(this.fullName);
    }

    if (this.birthDate) {
      this.personalNumbers.lifePath = this.numerologyService.calculateLifePath(this.birthDate);
    }

    this.showDataForm = false;

    if (this.personalNumbers.lifePath || this.personalNumbers.destiny) {
      let numbersMessage = 'He calculado tus números sagrados:\n\n';

      if (this.personalNumbers.lifePath) {
        numbersMessage += `🔹 Camino de Vida: ${this.personalNumbers.lifePath} - ${this.numerologyService.getNumberMeaning(this.personalNumbers.lifePath)}\n\n`;
      }

      if (this.personalNumbers.destiny) {
        numbersMessage += `🔹 Número del Destino: ${this.personalNumbers.destiny} - ${this.numerologyService.getNumberMeaning(this.personalNumbers.destiny)}\n\n`;
      }

      numbersMessage += '¿Te gustaría que profundice en la interpretación de alguno de estos números?';

      const numbersMsg: ConversationMessage = {
        role: 'numerologist',
        message: numbersMessage,
        timestamp: new Date(),
      };
      this.messages.push(numbersMsg);
      this.saveMessagesToSession();
    }
  }

  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  newConsultation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForNumerology) {
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('numerologyMessages');
      sessionStorage.removeItem('numerologyFirstQuestionAsked');
      sessionStorage.removeItem('numerologyBlockedMessageId');
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
    }
    
    this.messages = [];
    this.hasStartedConversation = false;
    setTimeout(() => {
      this.startConversation();
    }, 500);
  }

  private handleError(errorMessage: string): void {
    const errorMsg: ConversationMessage = {
      role: 'numerologist',
      message: `🔢 Los números cósmicos están en fluctuación... ${errorMessage} Intenta nuevamente cuando las vibraciones numéricas se estabilicen.`,
      timestamp: new Date(),
    };
    this.messages.push(errorMsg);
    this.shouldAutoScroll = true;
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

  clearConversation(): void {
    this.newConsultation();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getTimeString(timestamp: Date | string): string {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formateando timestamp:', error);
      return 'N/A';
    }
  }

  formatMessage(content: string): string {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<em>$1</em>');
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}