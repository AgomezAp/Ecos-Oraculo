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
import {
  BirthChartRequest,
  BirthChartResponse,
  TablaNacimientoService,
} from '../../services/tabla-nacimiento.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import { Observable, map, catchError, of } from 'rxjs';
interface BirthChartMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  sender: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}
interface ChartData {
  sunSign?: string;
  moonSign?: string;
  ascendant?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  fullName?: string;
}

interface AstrologerInfo {
  name: string;
  title: string;
  specialty: string;
}
@Component({
  selector: 'app-tabla-nacimiento',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './tabla-nacimiento.component.html',
  styleUrl: './tabla-nacimiento.component.css',
})
export class TablaNacimientoComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // Chat y mensajes
  messages: Message[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;

  // Control de scroll
  private shouldScrollToBottom: boolean = true;
  private isUserScrolling: boolean = false;
  private lastMessageCount: number = 0;

  // Datos personales y carta
  chartData: ChartData = {};
  fullName: string = '';
  birthDate: string = '';
  birthTime: string = '';
  birthPlace: string = '';
  showDataForm: boolean = false;

  // Información del astrólogo
  astrologerInfo: AstrologerInfo = {
    name: 'Maestra Emma',
    title: 'Guardiana de las Configuraciones Celestiales',
    specialty: 'Especialista en cartas natales y astrología transpersonal',
  };
  //Datos para enviar
  showDataModal: boolean = false;
  userData: any = null;

  // Sistema de pagos
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
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() public dialogRef: MatDialogRef<TablaNacimientoComponent>,
    private http: HttpClient,
    private tablaNacimientoService: TablaNacimientoService
  ) {}

  async ngOnInit(): Promise<void> {
    // Inicializar Stripe
    this.stripe = await loadStripe(this.stripePublishableKey);

    // Verificar estado de pago
    this.hasUserPaid =
      sessionStorage.getItem('hasUserPaidBirthChart') === 'true';

    // Cargar datos guardados
    this.loadSavedData();
    this.checkPaymentStatus();

    // Mensaje de bienvenida
    if (this.messages.length === 0) {
      this.addMessage({
        sender: 'Maestra Emma',
        content: `🌟 ¡Saludos, buscador de los misterios celestiales! Soy Emma, tu guía en el cosmos de las configuraciones astrales. 

Estoy aquí para ayudarte a descifrar los secretos ocultos en tu tabla de nacimiento. Las estrellas han estado esperando este momento para revelarte su sabiduría.

¿Qué aspecto de tu carta natal te gustaría explorar primero?`,
        timestamp: new Date(),
        isUser: false,
      });
    }
  }

  ngAfterViewChecked(): void {
    if (
      this.shouldScrollToBottom &&
      !this.isUserScrolling &&
      this.messages.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages.length;
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

  private loadSavedData(): void {
    const savedMessages = sessionStorage.getItem('birthChartMessages');
    const savedFirstQuestion = sessionStorage.getItem(
      'birthChartFirstQuestionAsked'
    );
    const savedBlockedMessageId = sessionStorage.getItem(
      'birthChartBlockedMessageId'
    );
    const savedChartData = sessionStorage.getItem('birthChartData');

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.lastMessageCount = this.messages.length;
      } catch {}
    }

    if (savedChartData) {
      try {
        this.chartData = JSON.parse(savedChartData);
        this.fullName = this.chartData.fullName || '';
        this.birthDate = this.chartData.birthDate || '';
        this.birthTime = this.chartData.birthTime || '';
        this.birthPlace = this.chartData.birthPlace || '';
      } catch {}
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
            console.log('✅ Pago carta natal confirmado desde URL');
            this.hasUserPaid = true;
            sessionStorage.setItem('hasUserPaidBirthChart', 'true');
            this.blockedMessageId = null;
            sessionStorage.removeItem('birthChartBlockedMessageId');

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );

            // Agregar mensaje de confirmación
            const lastMessage = this.messages[this.messages.length - 1];
            if (
              !lastMessage ||
              !lastMessage.content.includes('¡Pago confirmado!')
            ) {
              this.shouldScrollToBottom = true;
              this.addMessage({
                sender: 'Maestra Emma',
                content:
                  '🌟 ✨ ¡Pago confirmado! Las puertas del conocimiento celestial se han abierto completamente para ti. Ahora puedes explorar todos los misterios de tu carta natal sin límites. ¡Que las estrellas te guíen hacia la sabiduría!',
                timestamp: new Date(),
                isUser: false,
              });
              this.saveMessagesToSession();
            }
          }
        })
        .catch((error) => {
          console.error('Error verificando el pago carta natal:', error);
        });
    }
  }

  sendMessage(): void {
    if (this.currentMessage?.trim() && !this.isLoading) {
      const userMessage = this.currentMessage.trim();

      // Verificar si es la SEGUNDA pregunta y si no ha pagado
      if (!this.hasUserPaid && this.firstQuestionAsked) {
        this.saveStateBeforePayment();
        this.showDataModal = true;
        return;
      }

      this.shouldScrollToBottom = true;

      // Agregar mensaje del usuario
      const userMsg = {
        sender: 'Tú',
        content: userMessage,
        timestamp: new Date(),
        isUser: true,
      };
      this.messages.push(userMsg);

      this.saveMessagesToSession();
      this.currentMessage = '';
      this.isLoading = true;

      // Usar el servicio real de carta natal
      this.generateAstrologicalResponse(userMessage).subscribe({
        next: (response: any) => {
          this.isLoading = false;

          const messageId = Date.now().toString();
          const astrologerMsg = {
            sender: 'Maestra Emma',
            content: response,
            timestamp: new Date(),
            isUser: false,
            id: messageId,
          };
          this.messages.push(astrologerMsg);

          this.shouldScrollToBottom = true;

          if (this.firstQuestionAsked && !this.hasUserPaid) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('birthChartBlockedMessageId', messageId);

            setTimeout(() => {
              this.saveStateBeforePayment();
              this.promptForPayment();
            }, 2000);
          } else if (!this.firstQuestionAsked) {
            this.firstQuestionAsked = true;
            sessionStorage.setItem('birthChartFirstQuestionAsked', 'true');
          }

          this.saveMessagesToSession();
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Error al obtener respuesta de carta natal:', error);

          const errorMsg = {
            sender: 'Maestra Emma',
            content:
              '🌟 Disculpa, las configuraciones celestiales están temporalmente perturbadas. Por favor, intenta nuevamente en unos momentos.',
            timestamp: new Date(),
            isUser: false,
          };
          this.messages.push(errorMsg);
          this.saveMessagesToSession();
        },
      });
    }
  }

  private generateAstrologicalResponse(
    userMessage: string
  ): Observable<string> {
    // Crear el historial de conversación para el contexto
    const conversationHistory = this.messages
      .filter((msg) => msg.content && msg.content.trim() !== '')
      .map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('astrologer' as const),
        message: msg.content,
      }));

    // Crear la solicitud con la estructura correcta
    const request: BirthChartRequest = {
      chartData: {
        name: this.astrologerInfo.name,
        specialty: this.astrologerInfo.specialty,
        experience:
          'Siglos de experiencia interpretando las configuraciones celestiales y los misterios de las cartas natales',
      },
      userMessage,
      birthDate: this.birthDate,
      birthTime: this.birthTime,
      birthPlace: this.birthPlace,
      fullName: this.fullName,
      conversationHistory,
    };

    // Llamar al servicio y transformar la respuesta
    return this.tablaNacimientoService.chatWithAstrologer(request).pipe(
      map((response: BirthChartResponse) => {
        if (response.success && response.response) {
          return response.response;
        } else {
          throw new Error(response.error || 'Error desconocido del servicio');
        }
      }),
      catchError((error: any) => {
        console.error('Error en el servicio de carta natal:', error);
        return of(
          '🌟 Las configuraciones celestiales están temporalmente nubladas. Los astros me susurran que debo recargar mis energías cósmicas. Por favor, intenta nuevamente en unos momentos.'
        );
      })
    );
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    this.saveChartData();
    sessionStorage.setItem(
      'birthChartFirstQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'birthChartBlockedMessageId',
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
        'birthChartMessages',
        JSON.stringify(messagesToSave)
      );
    } catch {}
  }

  private saveChartData(): void {
    try {
      const dataToSave = {
        ...this.chartData,
        fullName: this.fullName,
        birthDate: this.birthDate,
        birthTime: this.birthTime,
        birthPlace: this.birthPlace,
      };
      sessionStorage.setItem('birthChartData', JSON.stringify(dataToSave));
    } catch {}
  }

  isMessageBlocked(message: Message): boolean {
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
      const items = [{ id: 'birth_chart_unlimited', amount: 500 }];
      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          { items }
        )
        .toPromise();

      if (!response || !response.clientSecret) {
        throw new Error('Error al obtener la información de pago.');
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
            'payment-element-container-birth-chart'
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
      sessionStorage.setItem('hasUserPaidBirthChart', 'true');
      this.showPaymentModal = false;
      this.paymentElement?.destroy();
      this.blockedMessageId = null;
      sessionStorage.removeItem('birthChartBlockedMessageId');
      this.shouldScrollToBottom = true;

      this.addMessage({
        sender: 'Maestra Emma',
        content:
          '🌟 ✨ ¡Pago confirmado! Las puertas del conocimiento celestial se han abierto para ti. Ahora puedes acceder a toda la sabiduría de tu carta natal sin límites.',
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

  // Métodos de manejo de datos personales
  savePersonalData(): void {
    this.chartData = {
      ...this.chartData,
      fullName: this.fullName,
      birthDate: this.birthDate,
      birthTime: this.birthTime,
      birthPlace: this.birthPlace,
    };

    // Generar signos de ejemplo basados en los datos
    if (this.birthDate) {
      this.generateSampleChartData();
    }

    this.saveChartData();
    this.showDataForm = false;

    this.shouldScrollToBottom = true;
    this.addMessage({
      sender: 'Maestra Emma',
      content: `🌟 Perfecto, ${this.fullName}. He registrado tus datos celestiales. Las configuraciones de tu nacimiento en ${this.birthPlace} el ${this.birthDate} revelan patrones únicos en el cosmos. ¿Sobre qué aspecto específico de tu carta natal te gustaría que profundice?`,
      timestamp: new Date(),
      isUser: false,
    });
  }

  private generateSampleChartData(): void {
    // Generar datos de ejemplo basados en la fecha de nacimiento
    const date = new Date(this.birthDate);
    const month = date.getMonth() + 1;

    const zodiacSigns = [
      'Capricornio',
      'Acuario',
      'Piscis',
      'Aries',
      'Tauro',
      'Géminis',
      'Cáncer',
      'Leo',
      'Virgo',
      'Libra',
      'Escorpio',
      'Sagitario',
    ];

    const signIndex = Math.floor((month - 1) / 1) % 12;
    this.chartData.sunSign = zodiacSigns[signIndex];
    this.chartData.moonSign = zodiacSigns[(signIndex + 4) % 12];
    this.chartData.ascendant = zodiacSigns[(signIndex + 8) % 12];
  }

  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  // Métodos de utilidad
  addMessage(message: Message): void {
    this.messages.push(message);
    this.shouldScrollToBottom = true;
  }

  formatMessage(content: string): string {
    if (!content) return '';

    let formattedContent = content;

    // Convertir **texto** a <strong>texto</strong> para negrilla
    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Convertir saltos de línea a <br> para mejor visualización
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    // Opcional: También puedes manejar *texto* (una sola asterisco) como cursiva
    formattedContent = formattedContent.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      '<em>$1</em>'
    );

    return formattedContent;
  }

  onScroll(event: any): void {
    const element = event.target;
    const isAtBottom =
      element.scrollHeight - element.scrollTop === element.clientHeight;
    this.isUserScrolling = !isAtBottom;
    if (isAtBottom) this.isUserScrolling = false;
  }

  onUserStartScroll(): void {
    this.isUserScrolling = true;
    setTimeout(() => {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        const isAtBottom =
          element.scrollHeight - element.scrollTop === element.clientHeight;
        if (isAtBottom) this.isUserScrolling = false;
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
  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
  clearChat(): void {
    // Limpiar mensajes del chat
    this.messages = [];
    this.currentMessage = '';
    this.lastMessageCount = 0;

    // Resetear estados
    this.firstQuestionAsked = false;
    this.blockedMessageId = null;
    this.isLoading = false;

    // Limpiar sessionStorage
    sessionStorage.removeItem('birthChartMessages');
    sessionStorage.removeItem('birthChartFirstQuestionAsked');
    sessionStorage.removeItem('birthChartBlockedMessageId');

    // Indicar que se debe hacer scroll porque hay un mensaje nuevo
    this.shouldScrollToBottom = true;

    // Agregar mensaje de bienvenida inicial
    this.addMessage({
      sender: 'Maestra Emma',
      content: `🌟 ¡Saludos, buscador de los misterios celestiales! Soy Emma, tu guía en el cosmos de las configuraciones astrales. 

Estoy aquí para ayudarte a descifrar los secretos ocultos en tu tabla de nacimiento. Las estrellas han estado esperando este momento para revelarte su sabiduría.

¿Qué aspecto de tu carta natal te gustaría explorar primero?`,
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
