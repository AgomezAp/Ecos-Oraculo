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
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';
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
    FortuneWheelComponent,
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
  //Variables para la ruleta
  showFortuneWheel: boolean = false;
  birthChartPrizes: Prize[] = [
    {
      id: '1',
      name: '3 Lecturas Astrales Gratis',
      color: '#4ecdc4',
      icon: '🌟',
    },
    {
      id: '2',
      name: '1 Análisis Natal Premium',
      color: '#45b7d1',
      icon: '✨',
    },
    {
      id: '3',
      name: '2 Consultas Celestiales Extra',
      color: '#ffeaa7',
      icon: '🌙',
    },
    {
      id: '4',
      name: '¡Las estrellas dicen: otra oportunidad!',
      color: '#ff7675',
      icon: '🔮',
    },
  ];
  private wheelTimer: any;
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

      // ✅ AGREGAR VERIFICACIÓN DE RULETA NATAL
      if (FortuneWheelComponent.canShowWheel()) {
        this.showBirthChartWheelAfterDelay(3000);
      } else {
        console.log(
          '🚫 No se puede mostrar ruleta natal - sin tiradas disponibles'
        );
      }
    }

    // ✅ AGREGAR ESTA LÍNEA AL FINAL:
    if (this.messages.length > 1 && FortuneWheelComponent.canShowWheel()) {
      this.showBirthChartWheelAfterDelay(2000);
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
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
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

      // ✅ NUEVA LÓGICA: Verificar consultas natales gratuitas ANTES de verificar pago
      if (!this.hasUserPaid && this.firstQuestionAsked) {
        // Verificar si tiene consultas natales gratis disponibles
        if (this.hasFreeBirthChartConsultationsAvailable()) {
          console.log('🎁 Usando consulta natal gratis del premio');
          this.useFreeBirthChartConsultation();
          // Continuar con el mensaje sin bloquear
        } else {
          // Si no tiene consultas gratis, mostrar modal de datos
          console.log(
            '💳 No hay consultas natales gratis - mostrando modal de datos'
          );

          // Cerrar otros modales primero
          this.showFortuneWheel = false;
          this.showPaymentModal = false;

          // Guardar el mensaje para procesarlo después del pago
          sessionStorage.setItem('pendingBirthChartMessage', userMessage);

          this.saveStateBeforePayment();

          // Mostrar modal de datos con timeout
          setTimeout(() => {
            this.showDataModal = true;
            console.log('📝 showDataModal establecido a:', this.showDataModal);
          }, 100);

          return; // Salir aquí para no procesar el mensaje aún
        }
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

          // ✅ LÓGICA MODIFICADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
          if (
            this.firstQuestionAsked &&
            !this.hasUserPaid &&
            !this.hasFreeBirthChartConsultationsAvailable()
          ) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('birthChartBlockedMessageId', messageId);

            setTimeout(() => {
              console.log(
                '🔒 Mensaje natal bloqueado - mostrando modal de datos'
              );
              this.saveStateBeforePayment();

              // Cerrar otros modales
              this.showFortuneWheel = false;
              this.showPaymentModal = false;

              // Mostrar modal de datos
              setTimeout(() => {
                this.showDataModal = true;
              }, 100);
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
  showBirthChartWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    console.log('⏰ Timer carta natal configurado para', delayMs, 'ms');

    this.wheelTimer = setTimeout(() => {
      console.log('🎰 Verificando si puede mostrar ruleta natal...');

      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        console.log('✅ Mostrando ruleta natal - usuario puede girar');
        this.showFortuneWheel = true;
      } else {
        console.log('❌ No se puede mostrar ruleta natal en este momento');
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    console.log('🎉 Premio celestial ganado:', prize);

    const prizeMessage: Message = {
      sender: 'Maestra Emma',
      content: `🌟 ¡Las configuraciones celestiales han conspirado a tu favor! Has ganado: **${prize.name}** ${prize.icon}\n\nLos antiguos guardianes de las estrellas han decidido bendecirte con este regalo sagrado. La energía cósmica fluye a través de ti, revelando secretos más profundos de tu carta natal. ¡Que la sabiduría celestial te ilumine!`,
      timestamp: new Date(),
      isUser: false,
    };

    this.messages.push(prizeMessage);
    this.shouldScrollToBottom = true;
    this.saveMessagesToSession();

    this.processBirthChartPrize(prize);
  }

  onWheelClosed(): void {
    console.log('🎰 Cerrando ruleta de carta natal');
    this.showFortuneWheel = false;
  }

  triggerBirthChartWheel(): void {
    console.log('🎰 Intentando activar ruleta natal manualmente...');

    if (this.showPaymentModal || this.showDataModal) {
      console.log('❌ No se puede mostrar - hay otros modales abiertos');
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      console.log('✅ Activando ruleta natal manualmente');
      this.showFortuneWheel = true;
    } else {
      console.log(
        '❌ No se puede activar ruleta natal - sin tiradas disponibles'
      );
      alert(
        'No tienes tiradas disponibles. ' +
          FortuneWheelComponent.getSpinStatus()
      );
    }
  }

  getSpinStatus(): string {
    return FortuneWheelComponent.getSpinStatus();
  }
  private processBirthChartPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Lecturas Astrales
        this.addFreeBirthChartConsultations(3);
        break;
      case '2': // 1 Análisis Premium
        this.addFreeBirthChartConsultations(1);
        break;
      case '3': // 2 Consultas Extra
        this.addFreeBirthChartConsultations(2);
        break;
      case '4': // Otra oportunidad
        console.log('🔄 Otra oportunidad celestial concedida');
        break;
    }
  }

  private addFreeBirthChartConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeBirthChartConsultations', newTotal.toString());
    console.log(
      `🎁 Agregadas ${count} consultas de carta natal. Total: ${newTotal}`
    );

    if (this.blockedMessageId && !this.hasUserPaid) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('birthChartBlockedMessageId');
      console.log('🔓 Mensaje natal desbloqueado con consulta gratuita');
    }
  }

  private hasFreeBirthChartConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeBirthChartConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeBirthChartConsultations',
        remaining.toString()
      );
      console.log(`🎁 Consulta natal gratis usada. Restantes: ${remaining}`);

      const prizeMsg: Message = {
        sender: 'Maestra Emma',
        content: `✨ *Has usado una lectura astral gratis* ✨\n\nTe quedan **${remaining}** consultas celestiales disponibles.`,
        timestamp: new Date(),
        isUser: false,
      };
      this.messages.push(prizeMsg);
      this.shouldScrollToBottom = true;
      this.saveMessagesToSession();
    }
  }

  debugBirthChartWheel(): void {
    console.log('=== DEBUG RULETA CARTA NATAL ===');
    console.log('showFortuneWheel:', this.showFortuneWheel);
    console.log(
      'FortuneWheelComponent.canShowWheel():',
      FortuneWheelComponent.canShowWheel()
    );
    console.log('showPaymentModal:', this.showPaymentModal);
    console.log('showDataModal:', this.showDataModal);
    console.log(
      'freeBirthChartConsultations:',
      sessionStorage.getItem('freeBirthChartConsultations')
    );

    this.showFortuneWheel = true;
    console.log('Forzado showFortuneWheel a:', this.showFortuneWheel);
  }

  // ✅ MÉTODO AUXILIAR para el template
  getBirthChartConsultationsCount(): number {
    return parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );
  }

  // ✅ MÉTODO AUXILIAR para parsing en template
  parseInt(value: string): number {
    return parseInt(value);
  }

  // ✅ MODIFICAR clearChat para incluir datos de la ruleta
 
}
