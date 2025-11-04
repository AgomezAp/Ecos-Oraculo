import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MapaVocacionalService } from '../../services/mapa-vocacional.service';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';
interface VocationalMessage {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}
interface ChatMessage {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}
interface AssessmentQuestion {
  id: number;
  question: string;
  options: Array<{
    value: string;
    label: string;
    category: string;
  }>;
}

interface AssessmentAnswer {
  question: string;
  answer: string;
  category: string;
}

interface PersonalInfo {
  age?: number;
  currentEducation?: string;
  workExperience?: string;
  interests?: string[];
}

interface VocationalProfile {
  name: string;
  description: string;
  characteristics: string[];
  workEnvironments: string[];
}

interface AnalysisResult {
  profileDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  dominantProfile: VocationalProfile;
  recommendations: string[];
}
@Component({
  selector: 'app-mapa-vocacional',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatRadioModule,
    MatStepperModule,
    MatProgressBarModule,
    RecolectaDatosComponent,
    FortuneWheelComponent,
  ],
  templateUrl: './mapa-vocacional.component.html',
  styleUrl: './mapa-vocacional.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaVocacionalComponent
  implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit
{
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // Info del consejero
  counselorInfo = {
    name: 'Dra. Valeria',
    title: 'Consejero Vocacional Especialista',
    specialty: 'Orientación profesional y mapas vocacionales personalizados',
  };
  //Datos para enviar
  showDataModal: boolean = false;
  userData: any = null;

  // Estado de pestañas
  currentTab: 'chat' | 'assessment' | 'results' = 'chat';

  // Chat
  chatMessages: ChatMessage[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;

  // AGREGADO - Variables para auto-scroll
  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  // AGREGADO - Variables para control de pagos
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForVocational: boolean = false;
  firstQuestionAsked: boolean = false;
  blockedMessageId: string | null = null;
  //Variables para la ruleta
  showFortuneWheel: boolean = false;
  vocationalPrizes: Prize[] = [
    {
      id: '1',
      name: '3 tiradas de la ruleta vocacional',
      color: '#4ecdc4',
      icon: '🎯',
    },
    {
      id: '2',
      name: '1 Análisis Vocacional Premium',
      color: '#45b7d1',
      icon: '✨',
    },
    {
      id: '4',
      name: '¡Inténtalo de nuevo!',
      color: '#ff7675',
      icon: '🔄',
    },
  ];
  private wheelTimer: any;
  // AGREGADO - Configuración de Stripe
  /*     'pk_live_51S419E5hUE7XrP4NUOjIhnHqmvG3gmEHxwXArkodb2aGD7aBMcBUjBR8QNOgdrRyidxckj2BCVnYMu9ZpkyJuwSS00ru89AmQL';
          pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC 
  */
  private stripePublishableKey =
    'pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC';
  private backendUrl = environment.apiUrl;

  // Datos personales
  showPersonalForm: boolean = false;
  personalInfo: PersonalInfo = {};

  // Assessment
  assessmentQuestions: AssessmentQuestion[] = [];
  currentQuestionIndex: number = 0;
  selectedOption: string = '';
  assessmentAnswers: AssessmentAnswer[] = [];
  assessmentProgress: number = 0;
  hasAssessmentResults: boolean = false;
  assessmentResults: any = null;

  constructor(
    private vocationalService: MapaVocacionalService,
    private http: HttpClient,
    private elRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}
  ngAfterViewInit(): void {
    this.setVideosSpeed(0.67); // 0.5 = más lento, 1 = normal
  }
  private setVideosSpeed(rate: number): void {
    const host = this.elRef.nativeElement;
    const videos = host.querySelectorAll<HTMLVideoElement>('video');
    videos.forEach((v) => {
      const apply = () => (v.playbackRate = rate);
      if (v.readyState >= 1) apply();
      else v.addEventListener('loadedmetadata', apply, { once: true });
    });
  }
  async ngOnInit(): Promise<void> {
    // AGREGADO - Inicializar Stripe
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      this.paymentError =
        'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    // AGREGADO - Verificar estado de pago
    this.hasUserPaidForVocational =
      sessionStorage.getItem('hasUserPaidForVocational') === 'true';

    // ✅ NUEVO: Cargar datos del usuario desde sessionStorage
    const savedUserData = sessionStorage.getItem('userData');
    if (savedUserData) {
      try {
        this.userData = JSON.parse(savedUserData);
      } catch (error) {
        this.userData = null;
      }
    } else {
      this.userData = null;
    }

    const savedMessages = sessionStorage.getItem('vocationalMessages');
    const savedFirstQuestion = sessionStorage.getItem(
      'vocationalFirstQuestionAsked'
    );
    const savedBlockedMessageId = sessionStorage.getItem(
      'vocationalBlockedMessageId'
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
      } catch (error) {
      }
    }

    // Solo agregar mensaje de bienvenida si no hay mensajes guardados
    if (this.chatMessages.length === 0) {
      this.initializeWelcomeMessage();
    }

    // AGREGADO - Verificar URL para pagos exitosos
    this.checkPaymentStatus();

    this.loadAssessmentQuestions();

    if (this.chatMessages.length > 0 && FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(2000);
    }
  }

  // AGREGADO - Métodos para control de scroll
  ngAfterViewChecked(): void {
    if (
      this.shouldAutoScroll &&
      this.chatMessages.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.chatMessages.length;
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

  // AGREGADO - Cleanup Stripe
  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
      } finally {
        this.paymentElement = undefined;
      }
    }
  }

  // AGREGADO - Verificar estado de pago desde URL
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
            this.hasUserPaidForVocational = true;
            sessionStorage.setItem('hasUserPaidForVocational', 'true');
            this.blockedMessageId = null;
            sessionStorage.removeItem('vocationalBlockedMessageId');

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
              this.addMessage({
                sender: this.counselorInfo.name,
                content:
                  '✨ ¡Pago confirmado! Ahora puedes acceder a orientación vocacional ilimitada. Tu futuro profesional está a tu alcance.',
                timestamp: new Date(),
                isUser: false,
              });
              this.saveMessagesToSession();
            }
          }
        })
        .catch((error) => {
        });
    }
  }
  // Inicializar mensaje de bienvenida
  initializeWelcomeMessage(): void {
    this.addMessage({
      sender: this.counselorInfo.name,
      content: `¡Saludos! Soy ${this.counselorInfo.name}, tu consejero vocacional especialista. Estoy aquí para ayudarte a descubrir tu verdadera vocación y diseñar un mapa profesional personalizado. `,
      timestamp: new Date(),
      isUser: false,
    });
    if (FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(3000);
    } else {
    }
  }

  // Cambiar pestaña
  switchTab(tab: 'chat' | 'assessment' | 'results'): void {
    this.currentTab = tab;
  }

  // Chat methods
  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage = this.currentMessage.trim();

    // ✅ NUEVA LÓGICA: Verificar consultas vocacionales gratuitas ANTES de verificar pago
    if (!this.hasUserPaidForVocational && this.firstQuestionAsked) {
      // Verificar si tiene consultas vocacionales gratis disponibles
      if (this.hasFreeVocationalConsultationsAvailable()) {
        this.useFreeVocationalConsultation();
        // Continuar con el mensaje sin bloquear
      } else {
        // Cerrar otros modales primero
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar el mensaje para procesarlo después del pago
        sessionStorage.setItem('pendingVocationalMessage', userMessage);

        this.saveStateBeforePayment();

        // Mostrar modal de datos con timeout
        setTimeout(() => {
          this.showDataModal = true;
          this.cdr.markForCheck();
        }, 100);

        return; // Salir aquí para no procesar el mensaje aún
      }
    }

    this.shouldAutoScroll = true;

    // Procesar mensaje normalmente
    this.processUserMessage(userMessage);
  }

  // AGREGADO - Métodos para pagos
  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'vocationalFirstQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'vocationalBlockedMessageId',
        this.blockedMessageId
      );
    }
  }
  private processUserMessage(userMessage: string): void {
    this.addMessage({
      sender: 'Tú',
      content: userMessage,
      timestamp: new Date(),
      isUser: true,
    });

    this.currentMessage = '';
    this.isLoading = true;

    // Preparar historial de conversación
    const conversationHistory = this.chatMessages.slice(-10).map((msg) => ({
      role: msg.isUser ? ('user' as const) : ('counselor' as const),
      message: msg.content,
    }));

    // Enviar al servicio
    this.vocationalService
      .sendMessage(
        userMessage,
        this.personalInfo,
        this.assessmentAnswers,
        conversationHistory
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          const messageId = Date.now().toString();

          this.addMessage({
            sender: this.counselorInfo.name,
            content: response,
            timestamp: new Date(),
            isUser: false,
            id: messageId,
          });

          // ✅ LÓGICA MODIFICADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
          if (
            this.firstQuestionAsked &&
            !this.hasUserPaidForVocational &&
            !this.hasFreeVocationalConsultationsAvailable()
          ) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('vocationalBlockedMessageId', messageId);

            setTimeout(() => {
              this.saveStateBeforePayment();

              // Cerrar otros modales
              this.showFortuneWheel = false;
              this.showPaymentModal = false;

              // Mostrar modal de datos
              setTimeout(() => {
                this.showDataModal = true;
                this.cdr.markForCheck();
              }, 100);
            }, 2000);
          } else if (!this.firstQuestionAsked) {
            this.firstQuestionAsked = true;
            sessionStorage.setItem('vocationalFirstQuestionAsked', 'true');
          }

          this.saveMessagesToSession();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
          this.addMessage({
            sender: this.counselorInfo.name,
            content:
              'Disculpa, estoy teniendo dificultades técnicas. ¿Podrías intentar reformular tu pregunta?',
            timestamp: new Date(),
            isUser: false,
          });
          this.saveMessagesToSession();
          this.cdr.markForCheck();
        },
      });
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
        'vocationalMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
    }
  }

  isMessageBlocked(message: ChatMessage): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForVocational
    );
  }

  async promptForPayment(): Promise<void> {

    this.showPaymentModal = true;
    this.cdr.markForCheck(); // ✅ OnPush Change Detection
    this.paymentError = null;
    this.isProcessingPayment = true;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
      }
      this.paymentElement = undefined;
    }

    try {
      const items = [{ id: 'vocational_counseling_unlimited', amount: 400 }];

      // ✅ CARGAR DATOS DESDE sessionStorage SI NO ESTÁN EN MEMORIA
      if (!this.userData) {
        const savedUserData = sessionStorage.getItem('userData');
        if (savedUserData) {
          try {
            this.userData = JSON.parse(savedUserData);
          } catch (error) {
            this.userData = null;
          }
        }
      }

      if (!this.userData) {
        this.paymentError =
          'No se encontraron los datos del cliente. Por favor, completa el formulario primero.';
        this.isProcessingPayment = false;
        this.showDataModal = true;
        this.cdr.markForCheck();
        return;
      }

      // ✅ VALIDAR CAMPOS INDIVIDUALES CON CONVERSIÓN A STRING
      const email = this.userData.email?.toString().trim();


      if ( !email) {
        const faltantes = [];
        if (!email) faltantes.push('email');

        this.paymentError = `Faltan datos del cliente: ${faltantes.join(
          ', '
        )}. Por favor, completa el formulario primero.`;
        this.isProcessingPayment = false;
        this.showDataModal = true;
        this.cdr.markForCheck();
        return;
      }

      // ✅ CREAR customerInfo SOLO SI TODOS LOS CAMPOS ESTÁN PRESENTES
      const customerInfo = {
        email: email,
      };


      const requestBody = { items, customerInfo };

      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          requestBody
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
        this.cdr.markForCheck();

        setTimeout(() => {
          const paymentElementContainer = document.getElementById(
            'payment-element-container'
          );

          if (paymentElementContainer && this.paymentElement) {
            this.paymentElement.mount(paymentElementContainer);
          } else {
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
            this.cdr.markForCheck();
          }
        }, 100);
      } else {
        throw new Error(
          'Stripe.js o la clave secreta del cliente no están disponibles.'
        );
      }
    } catch (error: any) {
      this.paymentError =
        error.message ||
        'Error al inicializar el pago. Por favor, inténtalo de nuevo.';
      this.isProcessingPayment = false;
      this.cdr.markForCheck();
    }
  }
  showWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }


    this.wheelTimer = setTimeout(() => {

      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        this.showFortuneWheel = true;
        this.cdr.markForCheck();
      } else {
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {

    const prizeMessage: ChatMessage = {
      sender: this.counselorInfo.name,
      content: `🎯 ¡Excelente! El destino profesional te ha bendecido. Has ganado: **${prize.name}** ${prize.icon}\n\nEste regalo del universo vocacional ha sido activado para ti. Las oportunidades profesionales se alinean a tu favor. ¡Que esta fortuna te guíe hacia tu verdadera vocación!`,
      timestamp: new Date(),
      isUser: false,
    };

    this.chatMessages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    this.processVocationalPrize(prize);
  }

  onWheelClosed(): void {
    this.showFortuneWheel = false;
  }

  triggerFortuneWheel(): void {

    if (this.showPaymentModal || this.showDataModal) {
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      this.showFortuneWheel = true;
      this.cdr.markForCheck();
    } else {
      alert(
        'No tienes tiradas disponibles. ' +
          FortuneWheelComponent.getSpinStatus()
      );
    }
  }

  getSpinStatus(): string {
    return FortuneWheelComponent.getSpinStatus();
  }

  private processVocationalPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Sesiones Gratis
        this.addFreeVocationalConsultations(3);
        break;
      case '2': // 1 Análisis Premium - ACCESO COMPLETO
        this.hasUserPaidForVocational = true;
        sessionStorage.setItem('hasUserPaidForVocational', 'true');

        // Desbloquear cualquier mensaje bloqueado
        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('vocationalBlockedMessageId');
        }

        // Agregar mensaje especial para este premio
        const premiumMessage: ChatMessage = {
          sender: this.counselorInfo.name,
          content:
            '✨ **¡Has desbloqueado el acceso Premium completo!** ✨\n\nEl destino profesional ha sonreído sobre ti de manera extraordinaria. Ahora tienes acceso ilimitado a toda mi experiencia en orientación vocacional. Puedes consultar sobre tu vocación, evaluaciones profesionales y todos los aspectos de tu futuro laboral cuantas veces desees.\n\n🎯 *Las puertas de tu camino profesional se han abierto completamente* 🎯',
          timestamp: new Date(),
          isUser: false,
        };
        this.chatMessages.push(premiumMessage);
        this.shouldAutoScroll = true;
        this.saveMessagesToSession();
        break;
      // ✅ ELIMINADO: case '3' - 2 Consultas Extra
      case '4': // Otra oportunidad
        break;
      default:
    }
  }

  private addFreeVocationalConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeVocationalConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeVocationalConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForVocational) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('vocationalBlockedMessageId');
    }
  }

  private hasFreeVocationalConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeVocationalConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeVocationalConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeVocationalConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeVocationalConsultations',
        remaining.toString()
      );

      const prizeMsg: ChatMessage = {
        sender: this.counselorInfo.name,
        content: `✨ *Has usado una consulta vocacional gratis* ✨\n\nTe quedan **${remaining}** consultas vocacionales gratis disponibles.`,
        timestamp: new Date(),
        isUser: false,
      };
      this.chatMessages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
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
          this.hasUserPaidForVocational = true;
          sessionStorage.setItem('hasUserPaidForVocational', 'true');
          
          this.blockedMessageId = null;
          sessionStorage.removeItem('vocationalBlockedMessageId');

          this.addMessage({
            sender: this.counselorInfo.name,
            content:
              '✨ ¡Pago confirmado! Ahora puedes acceder a toda mi experiencia en orientación vocacional. Continuemos explorando tu camino profesional ideal.',
            timestamp: new Date(),
            isUser: false,
          });
          this.saveMessagesToSession();

          // ✅ CERRAR MODAL INMEDIATAMENTE después de confirmar pago
          this.showPaymentModal = false;
          this.isProcessingPayment = false;
          this.paymentElement?.destroy();
          this.cdr.markForCheck(); // ← Forzar actualización UI para cerrar modal

          // ✅ DESPUÉS procesar mensaje pendiente (esto mostrará el indicador de carga normal)
          const pendingMessage = sessionStorage.getItem(
            'pendingVocationalMessage'
          );
          if (pendingMessage) {
            sessionStorage.removeItem('pendingVocationalMessage');

            // Procesar después de que el modal se haya cerrado
            setTimeout(() => {
              this.processUserMessage(pendingMessage);
            }, 300);
          }

          this.shouldAutoScroll = true;
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
        case 'requires_action':
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
      } finally {
        this.paymentElement = undefined;
      }
    }
    this.isProcessingPayment = false;
    this.paymentError = null;
  }

  // AGREGADO - Métodos para control de tiempo
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
      return 'N/A';
    }
  }

  // AGREGADO - Auto resize para textarea
  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // AGREGADO - Manejar Enter
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  addMessage(message: ChatMessage): void {
    this.chatMessages.push(message);
    this.shouldAutoScroll = true; // MODIFICADO
    setTimeout(() => this.scrollToBottom(), 100);
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

  // Personal info methods
  togglePersonalForm(): void {
    this.showPersonalForm = !this.showPersonalForm;
  }

  savePersonalInfo(): void {
    this.showPersonalForm = false;

    if (Object.keys(this.personalInfo).length > 0) {
      this.addMessage({
        sender: this.counselorInfo.name,
        content: `Perfecto, he registrado tu información personal. Esto me ayudará a brindarte una orientación más precisa y personalizada. ¿Hay algo específico sobre tu futuro profesional que te preocupe o te emocione?`,
        timestamp: new Date(),
        isUser: false,
      });
    }
  }

  // Assessment methods
  loadAssessmentQuestions(): void {
    this.vocationalService.getAssessmentQuestions().subscribe({
      next: (questions) => {
        this.assessmentQuestions = questions;
        this.updateProgress();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.cdr.markForCheck();
      },
    });
  }

  get currentQuestion(): AssessmentQuestion | null {
    return this.assessmentQuestions[this.currentQuestionIndex] || null;
  }

  selectOption(option: any): void {
    this.selectedOption = option.value;
  }

  nextQuestion(): void {
    if (this.selectedOption && this.currentQuestion) {
      // Guardar respuesta
      this.assessmentAnswers[this.currentQuestionIndex] = {
        question: this.currentQuestion.question,
        answer: this.selectedOption,
        category:
          this.currentQuestion.options.find(
            (o: any) => o.value === this.selectedOption
          )?.category || '',
      };

      this.currentQuestionIndex++;
      this.selectedOption = '';
      this.updateProgress();
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      const savedAnswer = this.assessmentAnswers[this.currentQuestionIndex];
      this.selectedOption = savedAnswer ? savedAnswer.answer : '';
      this.updateProgress();
    }
  }

  updateProgress(): void {
    if (this.assessmentQuestions.length > 0) {
      this.assessmentProgress =
        ((this.currentQuestionIndex + 1) / this.assessmentQuestions.length) *
        100;
    }
  }

  finishAssessment(): void {
    if (this.selectedOption && this.currentQuestion) {
      // Guardar última respuesta
      this.assessmentAnswers[this.currentQuestionIndex] = {
        question: this.currentQuestion.question,
        answer: this.selectedOption,
        category:
          this.currentQuestion.options.find(
            (o: any) => o.value === this.selectedOption
          )?.category || '',
      };

      // Analizar resultados
      this.analyzeResults();
    }
  }

  analyzeResults(): void {
    this.vocationalService.analyzeAssessment(this.assessmentAnswers).subscribe({
      next: (results) => {
        this.assessmentResults = results;
        this.hasAssessmentResults = true;
        this.switchTab('results');
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.cdr.markForCheck();
      },
    });
  }

  startNewAssessment(): void {
    this.currentQuestionIndex = 0;
    this.selectedOption = '';
    this.assessmentAnswers = [];
    this.assessmentProgress = 0;
    this.assessmentResults = null;
    this.hasAssessmentResults = false;
    this.updateProgress();
    this.switchTab('assessment');
  }

  // Utility methods
  getCategoryEmoji(category: string): string {
    return this.vocationalService.getCategoryEmoji(category);
  }

  getCategoryColor(category: string): string {
    return this.vocationalService.getCategoryColor(category);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
    }
  }
  onUserDataSubmitted(userData: any): void {

    // ✅ VALIDAR CAMPOS CRÍTICOS ANTES DE PROCEDER
    const requiredFields = ['email']; // ❌ QUITADO 'apellido'
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || userData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      alert(
        `Para proceder con el pago, necesitas completar: ${missingFields.join(
          ', '
        )}`
      );
      this.showDataModal = true; // Mantener modal abierto
      this.cdr.markForCheck();
      return;
    }

    // ✅ LIMPIAR Y GUARDAR datos INMEDIATAMENTE en memoria Y sessionStorage
    this.userData = {
      ...userData,
      email: userData.email?.toString().trim(),
    };

    // ✅ GUARDAR EN sessionStorage INMEDIATAMENTE
    try {
      sessionStorage.setItem('userData', JSON.stringify(this.userData));

      // Verificar que se guardaron correctamente
      const verificacion = sessionStorage.getItem('userData');
    } catch (error) {
    }

    this.showDataModal = false;
    this.cdr.markForCheck();

    // ✅ NUEVO: Enviar datos al backend como en otros componentes
    this.sendUserDataToBackend(userData);
  }
  private sendUserDataToBackend(userData: any): void {

    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        // ✅ LLAMAR A promptForPayment QUE INICIALIZA STRIPE
        this.promptForPayment();
      },
      error: (error) => {
        // ✅ AUN ASÍ ABRIR EL MODAL DE PAGO
        this.promptForPayment();
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }
  resetChat(): void {

    // 1. Reset de arrays y mensajes
    this.chatMessages = [];
    this.currentMessage = '';

    // 2. Reset de estados de carga
    this.isLoading = false;

    // 3. Reset de estados de pago y bloqueo
    this.firstQuestionAsked = false;
    this.blockedMessageId = null;

    // 4. Reset de modales
    this.showPaymentModal = false;
    this.showDataModal = false;
    this.showFortuneWheel = false;
    this.showPersonalForm = false;

    // 5. Reset de variables de scroll y contadores
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    // 6. Reset del assessment
    this.currentQuestionIndex = 0;
    this.selectedOption = '';
    this.assessmentAnswers = [];
    this.assessmentProgress = 0;
    this.assessmentResults = null;
    this.hasAssessmentResults = false;

    // 7. Reset de información personal
    this.personalInfo = {};

    // 8. Reset de payment elements
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
      } finally {
        this.paymentElement = undefined;
      }
    }
    this.clientSecret = null;
    this.isProcessingPayment = false;
    this.paymentError = null;

    // 9. Limpiar timers
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    // 10. Limpiar sessionStorage específico vocacional (pero NO userData)
    sessionStorage.removeItem('vocationalMessages');
    sessionStorage.removeItem('vocationalFirstQuestionAsked');
    sessionStorage.removeItem('vocationalBlockedMessageId');
    sessionStorage.removeItem('pendingVocationalMessage');

    // 11. Reset a pestaña principal
    this.currentTab = 'chat';

    // 12. Reinicializar mensaje de bienvenida
    this.initializeWelcomeMessage();
    this.cdr.markForCheck();
  }
}
