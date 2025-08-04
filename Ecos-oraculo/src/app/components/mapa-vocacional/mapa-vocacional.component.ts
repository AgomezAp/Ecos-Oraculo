import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
})
export class MapaVocacionalComponent
  implements OnInit, OnDestroy, AfterViewChecked
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
      name: '3 Sesiones de Orientación Gratis',
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
      id: '3',
      name: '2 Consultas Vocacionales Extra',
      color: '#ffeaa7',
      icon: '🌟',
    },
    {
      id: '4',
      name: '¡Tu vocación dice: otra oportunidad!',
      color: '#ff7675',
      icon: '🔄',
    },
  ];
  private wheelTimer: any;
  // AGREGADO - Configuración de Stripe
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
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    // AGREGADO - Inicializar Stripe
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError =
        'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    // AGREGADO - Verificar estado de pago
    this.hasUserPaidForVocational =
      sessionStorage.getItem('hasUserPaidForVocational') === 'true';

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
        console.error('Error al restaurar mensajes:', error);
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
        console.log('Error al destruir elemento de pago:', error);
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
            console.log('✅ Pago vocacional confirmado desde URL');
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
          console.error('Error verificando el pago vocacional:', error);
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
      console.log(
        '🚫 No se puede mostrar ruleta vocacional - sin tiradas disponibles'
      );
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
        console.log('🎁 Usando consulta vocacional gratis del premio');
        this.useFreeVocationalConsultation();
        // Continuar con el mensaje sin bloquear
      } else {
        // Si no tiene consultas gratis, mostrar modal de datos
        console.log(
          '💳 No hay consultas vocacionales gratis - mostrando modal de datos'
        );

        // Cerrar otros modales primero
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar el mensaje para procesarlo después del pago
        sessionStorage.setItem('pendingVocationalMessage', userMessage);

        this.saveStateBeforePayment();

        // Mostrar modal de datos con timeout
        setTimeout(() => {
          this.showDataModal = true;
          console.log('📝 showDataModal establecido a:', this.showDataModal);
        }, 100);

        return; // Salir aquí para no procesar el mensaje aún
      }
    }

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
          const messageId = Date.now().toString(); // AGREGADO

          this.addMessage({
            sender: this.counselorInfo.name,
            content: response,
            timestamp: new Date(),
            isUser: false,
            id: messageId, // AGREGADO
          });

          // AGREGADO - Controlar bloqueo de mensajes
          if (this.firstQuestionAsked && !this.hasUserPaidForVocational) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('vocationalBlockedMessageId', messageId);
            setTimeout(() => {
              this.saveStateBeforePayment();
              this.promptForPayment();
            }, 2000);
          } else if (!this.firstQuestionAsked) {
            this.firstQuestionAsked = true;
            sessionStorage.setItem('vocationalFirstQuestionAsked', 'true');
          }

          this.saveMessagesToSession(); // AGREGADO
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.addMessage({
            sender: this.counselorInfo.name,
            content:
              'Disculpa, estoy teniendo dificultades técnicas. ¿Podrías intentar reformular tu pregunta?',
            timestamp: new Date(),
            isUser: false,
          });
          this.isLoading = false;
        },
      });
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
      console.error('Error guardando mensajes:', error);
    }
  }

  isMessageBlocked(message: ChatMessage): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForVocational
    );
  }

  async promptForPayment(): Promise<void> {
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
      const items = [{ id: 'vocational_counseling_unlimited', amount: 500 }];

      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
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
            this.paymentElement.mount(paymentElementContainer);
          } else {
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
          }
        }, 100);
      }
    } catch (error: any) {
      this.paymentError =
        error.message ||
        'Error al inicializar el pago. Por favor, inténtalo de nuevo.';
      this.isProcessingPayment = false;
    }
  }
   showWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    console.log('⏰ Timer vocacional configurado para', delayMs, 'ms');

    this.wheelTimer = setTimeout(() => {
      console.log('🎰 Verificando si puede mostrar ruleta vocacional...');

      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        console.log('✅ Mostrando ruleta vocacional - usuario puede girar');
        this.showFortuneWheel = true;
      } else {
        console.log('❌ No se puede mostrar ruleta vocacional en este momento');
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    console.log('🎉 Premio vocacional ganado:', prize);

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
    console.log('🎰 Cerrando ruleta vocacional');
    this.showFortuneWheel = false;
  }

  triggerFortuneWheel(): void {
    console.log('🎰 Intentando activar ruleta vocacional manualmente...');

    if (this.showPaymentModal || this.showDataModal) {
      console.log('❌ No se puede mostrar - hay otros modales abiertos');
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      console.log('✅ Activando ruleta vocacional manualmente');
      this.showFortuneWheel = true;
    } else {
      console.log('❌ No se puede activar ruleta vocacional - sin tiradas disponibles');
      alert('No tienes tiradas disponibles. ' + FortuneWheelComponent.getSpinStatus());
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
      case '2': // 1 Análisis Premium
        this.addFreeVocationalConsultations(1);
        break;
      case '3': // 2 Consultas Extra
        this.addFreeVocationalConsultations(2);
        break;
      case '4': // Otra oportunidad
        console.log('🔄 Otra oportunidad vocacional concedida');
        break;
    }
  }

  private addFreeVocationalConsultations(count: number): void {
    const current = parseInt(sessionStorage.getItem('freeVocationalConsultations') || '0');
    const newTotal = current + count;
    sessionStorage.setItem('freeVocationalConsultations', newTotal.toString());
    console.log(`🎁 Agregadas ${count} consultas vocacionales. Total: ${newTotal}`);

    if (this.blockedMessageId && !this.hasUserPaidForVocational) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('vocationalBlockedMessageId');
      console.log('🔓 Mensaje vocacional desbloqueado con consulta gratuita');
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
      sessionStorage.setItem('freeVocationalConsultations', remaining.toString());
      console.log(`🎁 Consulta vocacional gratis usada. Restantes: ${remaining}`);

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

  debugVocationalWheel(): void {
    console.log('=== DEBUG RULETA VOCACIONAL ===');
    console.log('showFortuneWheel:', this.showFortuneWheel);
    console.log('FortuneWheelComponent.canShowWheel():', FortuneWheelComponent.canShowWheel());
    
    this.showFortuneWheel = true;
    console.log('Forzado showFortuneWheel a:', this.showFortuneWheel);
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
      this.paymentError =
        error.message || 'Ocurrió un error inesperado durante el pago.';
      this.isProcessingPayment = false;
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      this.hasUserPaidForVocational = true;
      sessionStorage.setItem('hasUserPaidForVocational', 'true');
      this.showPaymentModal = false;
      this.paymentElement?.destroy();
      this.blockedMessageId = null;
      sessionStorage.removeItem('vocationalBlockedMessageId');

      this.addMessage({
        sender: this.counselorInfo.name,
        content:
          '✨ ¡Pago confirmado! Ahora puedes acceder a toda mi experiencia en orientación vocacional. Continuemos explorando tu camino profesional ideal.',
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
      } catch (error) {
        console.log('Error al destruir elemento de pago:', error);
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
      },
      error: (error) => {
        console.error('Error loading questions:', error);
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
      },
      error: (error) => {
        console.error('Error analyzing assessment:', error);
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
      console.error('Error scrolling to bottom:', err);
    }
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
