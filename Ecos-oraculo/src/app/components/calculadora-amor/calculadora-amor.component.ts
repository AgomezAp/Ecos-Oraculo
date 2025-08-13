import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  CalculadoraAmorService,
  CompatibilityData,
  ConversationMessage,
  LoveCalculatorResponse,
  LoveExpertInfo,
} from '../../services/calculadora-amor.service';
import { Subject, takeUntil } from 'rxjs';
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
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';

@Component({
  selector: 'app-calculadora-amor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatNativeDateModule,
    RecolectaDatosComponent,
    FortuneWheelComponent,
  ],
  templateUrl: './calculadora-amor.component.html',
  styleUrl: './calculadora-amor.component.css',
})
export class CalculadoraAmorComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  textareaHeight: number = 45; // Altura inicial
  private readonly minTextareaHeight = 45;
  private readonly maxTextareaHeight = 120;
  // Variables principales del chat
  conversationHistory: ConversationMessage[] = [];
  currentMessage: string = '';
  messageInput = new FormControl('');
  isLoading: boolean = false;
  isTyping: boolean = false;
  hasStartedConversation: boolean = false;
  showDataForm: boolean = false;

  showDataModal: boolean = false;
  userData: any = null;

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
  hasUserPaidForLove: boolean = false;
  firstQuestionAsked: boolean = false;

  // NUEVA PROPIEDAD para controlar mensajes bloqueados
  blockedMessageId: string | null = null;
  //propiedades para la ruleta
  showFortuneWheel: boolean = false;
  lovePrizes: Prize[] = [
    {
      id: '1',
      name: '3 Lecturas Amorosas Gratis',
      color: '#ff69b4',
      icon: '💕',
    },
    {
      id: '2',
      name: '1 Análisis de Compatibilidad Premium',
      color: '#ff1493',
      icon: '💖',
    },
    {
      id: '3',
      name: '2 Consultas Románticas Extra',
      color: '#ff6347',
      icon: '💝',
    },
    {
      id: '4',
      name: '¡El amor dice: otra oportunidad!',
      color: '#dc143c',
      icon: '💘',
    },
  ];
  private wheelTimer: any;
  // Configuración de Stripe
  private stripePublishableKey =
    'pk_live_51ROf7JKaf976EMQYuG2XY0OwKWFcea33O5WxIDBKEeoTDqyOUgqmizQ2knrH6MCnJlIoDQ95HJrRhJaL0jjpULHj00sCSWkBw6';
  private backendUrl = environment.apiUrl;

  // Formulario reactivo
  compatibilityForm: FormGroup;

  // Estado del componente
  loveExpertInfo: LoveExpertInfo | null = null;
  compatibilityData: CompatibilityData | null = null;

  // Subject para manejar unsubscriptions
  private destroy$ = new Subject<void>();

  // Info del experto en amor
  loveExpertInfo_display = {
    name: 'Maestra Valentina',
    title: 'Guardiana del Amor Eterno',
    specialty: 'Numerología amorosa y compatibilidad de almas',
  };

  // Frases de bienvenida aleatorias
  welcomeMessages = [
    '¡Saludos, alma enamorada! 💕 Soy la Maestra Paula, y estoy aquí para revelarte los secretos del amor verdadero. Las cartas del amor susurran historias de corazones unidos y pasiones eternas. ¿Estás preparada para descubrir la compatibilidad de tu relación?',
    'Las energías amorosas me susurran que has venido buscando respuestas del corazón... Los números del amor revelan la química entre las almas. ¿Qué secreto romántico deseas conocer?',
    'Bienvenido al templo del amor eterno. Los patrones numerológicos del romance han anunciado tu llegada. Permíteme calcular la compatibilidad de tu relación a través de la numerología sagrada.',
    'Los números del amor danzan ante mí revelando tu presencia... Cada cálculo revela un destino romántico. ¿Qué pareja deseas que analice numerológicamente para ti?',
  ];

  constructor(
    private calculadoraAmorService: CalculadoraAmorService,
    private formBuilder: FormBuilder,
    private http: HttpClient
  ) {
    this.compatibilityForm = this.createCompatibilityForm();
  }

  async ngOnInit(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError =
        'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    this.hasUserPaidForLove =
      sessionStorage.getItem('hasUserPaidForLove') === 'true';

    // ✅ NUEVO: Cargar datos del usuario desde sessionStorage
    console.log(
      '🔍 Cargando datos del usuario desde sessionStorage para amor...'
    );
    const savedUserData = sessionStorage.getItem('userData');
    if (savedUserData) {
      try {
        this.userData = JSON.parse(savedUserData);
        console.log(
          '✅ Datos del usuario restaurados para amor:',
          this.userData
        );
      } catch (error) {
        console.error('❌ Error al parsear datos del usuario:', error);
        this.userData = null;
      }
    } else {
      console.log(
        'ℹ️ No hay datos del usuario guardados en sessionStorage para amor'
      );
      this.userData = null;
    }

    // ✅ REFACTORIZAR: Separar carga de datos
    this.loadLoveData();

    // Verificar URL para pagos exitosos
    this.checkPaymentStatus();

    this.loadLoveExpertInfo();
    this.subscribeToCompatibilityData();
    console.log('🎰 Verificando ruleta del amor...');
    console.log(
      '- conversationHistory.length:',
      this.conversationHistory.length
    );
    console.log(
      '- FortuneWheelComponent.canShowWheel():',
      FortuneWheelComponent.canShowWheel()
    );

    // ✅ TAMBIÉN VERIFICAR PARA MENSAJES RESTAURADOS
    if (
      this.conversationHistory.length > 0 &&
      FortuneWheelComponent.canShowWheel()
    ) {
      this.showLoveWheelAfterDelay(2000);
    }
  }
  private loadLoveData(): void {
    const savedMessages = sessionStorage.getItem('loveMessages');
    const savedFirstQuestion = sessionStorage.getItem('loveFirstQuestionAsked');
    const savedBlockedMessageId = sessionStorage.getItem(
      'loveBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.conversationHistory = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
        console.log('✅ Mensajes de amor restaurados desde sessionStorage');
      } catch (error) {
        console.error('Error al restaurar mensajes:', error);
        this.clearSessionData();
        this.initializeLoveWelcomeMessage();
      }
    } else {
      this.initializeLoveWelcomeMessage();
    }
  }
  private initializeLoveWelcomeMessage(): void {
    const randomWelcome =
      this.welcomeMessages[
        Math.floor(Math.random() * this.welcomeMessages.length)
      ];

    const welcomeMessage: ConversationMessage = {
      role: 'love_expert',
      message: randomWelcome,
      timestamp: new Date(),
    };

    this.conversationHistory.push(welcomeMessage);
    this.hasStartedConversation = true;

    // ✅ VERIFICACIÓN DE RULETA AMOROSA
    if (FortuneWheelComponent.canShowWheel()) {
      this.showLoveWheelAfterDelay(3000);
    } else {
      console.log(
        '🚫 No se puede mostrar ruleta del amor - sin tiradas disponibles'
      );
    }
  }
  private checkPaymentStatus(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get(
      'payment_intent_client_secret'
    );

    if (paymentIntent && paymentIntentClientSecret && this.stripe) {
      console.log('🔍 Verificando estado del pago de amor...');

      this.stripe
        .retrievePaymentIntent(paymentIntentClientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent) {
            switch (paymentIntent.status) {
              case 'succeeded':
                console.log('✅ Pago de amor confirmado desde URL');
                this.hasUserPaidForLove = true;
                sessionStorage.setItem('hasUserPaidForLove', 'true');
                this.blockedMessageId = null;
                sessionStorage.removeItem('loveBlockedMessageId');

                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );

                const lastMessage =
                  this.conversationHistory[this.conversationHistory.length - 1];
                if (
                  !lastMessage ||
                  !lastMessage.message.includes('¡Pago confirmado!')
                ) {
                  const confirmationMsg: ConversationMessage = {
                    role: 'love_expert',
                    message:
                      '✨ ¡Pago confirmado! Ahora puedes acceder a todas las lecturas de compatibilidad amorosa que desees. Los secretos del amor están a tu disposición. ¿Qué otro aspecto romántico te gustaría explorar? 💕',
                    timestamp: new Date(),
                  };
                  this.conversationHistory.push(confirmationMsg);
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
        .catch((error: any) => {
          console.error('Error verificando el pago:', error);
        });
    }
  }

  ngAfterViewChecked(): void {
    if (
      this.shouldAutoScroll &&
      this.conversationHistory.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.conversationHistory.length;
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

  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    this.destroy$.next();
    this.destroy$.complete();

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
    if (this.conversationHistory.length === 0) {
      this.initializeLoveWelcomeMessage();
    }
    this.hasStartedConversation = true;
  }

  /**
   * Crea el formulario reactivo para los datos de compatibilidad
   */
  private createCompatibilityForm(): FormGroup {
    return this.formBuilder.group({
      person1Name: ['', [Validators.required, Validators.minLength(2)]],
      person1BirthDate: ['', Validators.required],
      person2Name: ['', [Validators.required, Validators.minLength(2)]],
      person2BirthDate: ['', Validators.required],
    });
  }

  /**
   * Carga la información del experto en amor
   */
  private loadLoveExpertInfo(): void {
    this.calculadoraAmorService
      .getLoveExpertInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          this.loveExpertInfo = info;
        },
        error: (error) => {
          console.error('Error al cargar información del experto:', error);
        },
      });
  }

  /**
   * Se suscribe a los datos de compatibilidad
   */
  private subscribeToCompatibilityData(): void {
    this.calculadoraAmorService.compatibilityData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.compatibilityData = data;
        if (data) {
          this.populateFormWithData(data);
        }
      });
  }

  /**
   * Puebla el formulario con los datos de compatibilidad
   */
  private populateFormWithData(data: CompatibilityData): void {
    this.compatibilityForm.patchValue({
      person1Name: data.person1Name,
      person1BirthDate: new Date(data.person1BirthDate),
      person2Name: data.person2Name,
      person2BirthDate: new Date(data.person2BirthDate),
    });
  }

  /**
   * Calcula la compatibilidad entre las dos personas
   */
  calculateCompatibility(): void {
    if (this.compatibilityForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValues = this.compatibilityForm.value;
    const compatibilityData: CompatibilityData = {
      person1Name: formValues.person1Name.trim(),
      person1BirthDate: this.formatDateForService(formValues.person1BirthDate),
      person2Name: formValues.person2Name.trim(),
      person2BirthDate: this.formatDateForService(formValues.person2BirthDate),
    };

    this.isLoading = true;
    this.calculadoraAmorService
      .calculateCompatibility(compatibilityData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleCalculationResponse(response);
        },
        error: (error) => {
          this.handleError(error);
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  /**
   * Maneja la respuesta del cálculo de compatibilidad
   */
  private handleCalculationResponse(response: LoveCalculatorResponse): void {
    if (response.success) {
      this.hasStartedConversation = true;
      this.showDataForm = false;

      // Agregar mensaje de confirmación del cálculo
      const calculationMsg: ConversationMessage = {
        role: 'love_expert',
        message: `✨ He completado el análisis numerológico de ${this.compatibilityForm.value.person1Name} y ${this.compatibilityForm.value.person2Name}. Los números del amor han revelado información fascinante sobre vuestra compatibilidad. ¿Te gustaría conocer los detalles de esta lectura amorosa?`,
        timestamp: new Date(),
      };

      this.conversationHistory.push(calculationMsg);
      this.saveMessagesToSession();
      this.shouldAutoScroll = true;
    } else {
      console.error('Error en el cálculo:', response.error);
    }
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage = this.currentMessage.trim();

    // ✅ NUEVA LÓGICA: Verificar consultas amorosas gratuitas ANTES de verificar pago
    if (!this.hasUserPaidForLove && this.firstQuestionAsked) {
      // Verificar si tiene consultas amorosas gratis disponibles
      if (this.hasFreeLoveConsultationsAvailable()) {
        console.log('🎁 Usando consulta amorosa gratis del premio');
        this.useFreeLoveConsultation();
        // Continuar con el mensaje sin bloquear
      } else {
        // Si no tiene consultas gratis, mostrar modal de datos
        console.log(
          '💳 No hay consultas amorosas gratis - mostrando modal de datos'
        );

        // Cerrar otros modales primero
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar el mensaje para procesarlo después del pago
        sessionStorage.setItem('pendingLoveMessage', userMessage);

        this.saveStateBeforePayment();

        // Mostrar modal de datos con timeout
        setTimeout(() => {
          this.showDataModal = true;
          console.log('📝 showDataModal establecido a:', this.showDataModal);
        }, 100);

        return; // Salir aquí para no procesar el mensaje aún
      }
    }

    // Procesar mensaje normalmente
    this.processLoveUserMessage(userMessage);
  }
  private processLoveUserMessage(userMessage: string): void {
    this.shouldAutoScroll = true;

    // Agregar mensaje del usuario
    const userMsg: ConversationMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMsg);

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isTyping = true;
    this.isLoading = true;

    const compatibilityData =
      this.calculadoraAmorService.getCompatibilityData();

    // Preparar historial de conversación
    const conversationHistoryForService = this.conversationHistory
      .slice(-10)
      .map((msg) => ({
        role:
          msg.role === 'user' ? ('user' as const) : ('love_expert' as const),
        message: msg.message,
      }));

    // Enviar al servicio
    this.calculadoraAmorService
      .chatWithLoveExpert(
        userMessage,
        compatibilityData?.person1Name,
        compatibilityData?.person1BirthDate,
        compatibilityData?.person2Name,
        compatibilityData?.person2BirthDate
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isTyping = false;

          if (response.success && response.response) {
            const messageId = Date.now().toString();

            const loveExpertMsg: ConversationMessage = {
              role: 'love_expert',
              message: response.response,
              timestamp: new Date(),
              id: messageId,
            };
            this.conversationHistory.push(loveExpertMsg);

            this.shouldAutoScroll = true;

            // ✅ LÓGICA MODIFICADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
            if (
              this.firstQuestionAsked &&
              !this.hasUserPaidForLove &&
              !this.hasFreeLoveConsultationsAvailable()
            ) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('loveBlockedMessageId', messageId);

              setTimeout(() => {
                console.log(
                  '🔒 Mensaje amoroso bloqueado - mostrando modal de datos'
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
              sessionStorage.setItem('loveFirstQuestionAsked', 'true');
            }

            this.saveMessagesToSession();
          } else {
            this.handleError('Error al obtener respuesta del experto en amor');
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
    console.log('💾 Guardando estado de amor antes del pago...');
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'loveFirstQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem('loveBlockedMessageId', this.blockedMessageId);
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.conversationHistory.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem('loveMessages', JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error guardando mensajes:', error);
    }
  }

  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForLove');
    sessionStorage.removeItem('loveMessages');
    sessionStorage.removeItem('loveFirstQuestionAsked');
    sessionStorage.removeItem('loveBlockedMessageId');
  }

  isMessageBlocked(message: ConversationMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaidForLove;
  }

  async promptForPayment(): Promise<void> {
    console.log('💳 EJECUTANDO promptForPayment() para amor');

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
      const items = [{ id: 'love_compatibility_unlimited', amount: 500 }];

      // ✅ CARGAR DATOS DESDE sessionStorage SI NO ESTÁN EN MEMORIA
      if (!this.userData) {
        console.log(
          '🔍 userData no está en memoria, cargando desde sessionStorage para amor...'
        );
        const savedUserData = sessionStorage.getItem('userData');
        if (savedUserData) {
          try {
            this.userData = JSON.parse(savedUserData);
            console.log(
              '✅ Datos cargados desde sessionStorage para amor:',
              this.userData
            );
          } catch (error) {
            console.error('❌ Error al parsear datos guardados:', error);
            this.userData = null;
          }
        }
      }

      // ✅ VALIDAR DATOS ANTES DE CREAR customerInfo
      console.log('🔍 Validando userData completo para amor:', this.userData);

      if (!this.userData) {
        console.error('❌ No hay userData disponible para amor');
        this.paymentError =
          'No se encontraron los datos del cliente. Por favor, completa el formulario primero.';
        this.isProcessingPayment = false;
        this.showDataModal = true;
        return;
      }

      // ✅ VALIDAR CAMPOS INDIVIDUALES CON CONVERSIÓN A STRING
      const nombre = this.userData.nombre?.toString().trim();
      const apellido = this.userData.apellido?.toString().trim();
      const email = this.userData.email?.toString().trim();
      const telefono = this.userData.telefono?.toString().trim();

      console.log('🔍 Validando campos individuales para amor:');
      console.log('  - nombre:', `"${nombre}"`, nombre ? '✅' : '❌');
      console.log('  - apellido:', `"${apellido}"`, apellido ? '✅' : '❌');
      console.log('  - email:', `"${email}"`, email ? '✅' : '❌');
      console.log('  - telefono:', `"${telefono}"`, telefono ? '✅' : '❌');

      if (!nombre || !apellido || !email || !telefono) {
        console.error('❌ Faltan campos requeridos para el pago del amor');
        const faltantes = [];
        if (!nombre) faltantes.push('nombre');
        if (!apellido) faltantes.push('apellido');
        if (!email) faltantes.push('email');
        if (!telefono) faltantes.push('teléfono');

        this.paymentError = `Faltan datos del cliente: ${faltantes.join(
          ', '
        )}. Por favor, completa el formulario primero.`;
        this.isProcessingPayment = false;
        this.showDataModal = true;
        return;
      }

      // ✅ CREAR customerInfo SOLO SI TODOS LOS CAMPOS ESTÁN PRESENTES
      const customerInfo = {
        name: `${nombre} ${apellido}`,
        email: email,
        phone: telefono,
      };

      console.log(
        '📤 Enviando request de payment intent para amor con datos del cliente...'
      );
      console.log('👤 Datos del cliente enviados:', customerInfo);

      const requestBody = { items, customerInfo };

      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          requestBody
        )
        .toPromise();

      console.log('📥 Respuesta de payment intent:', response);

      if (!response || !response.clientSecret) {
        throw new Error(
          'Error al obtener la información de pago del servidor.'
        );
      }
      this.clientSecret = response.clientSecret;

      if (this.stripe && this.clientSecret) {
        this.elements = this.stripe.elements({
          clientSecret: this.clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#ff69b4',
              colorBackground: 'rgba(255, 105, 180, 0.1)',
              colorText: '#ffffff',
              colorDanger: '#ef4444',
              borderRadius: '8px',
            },
          },
        });
        this.paymentElement = this.elements.create('payment');

        this.isProcessingPayment = false;

        setTimeout(() => {
          const paymentElementContainer = document.getElementById(
            'payment-element-container-love'
          );
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
        throw new Error(
          'Stripe.js o la clave secreta del cliente no están disponibles.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error al preparar el pago:', error);
      console.error('❌ Detalles del error:', error.error || error);
      this.paymentError =
        error.message ||
        'Error al inicializar el pago. Por favor, inténtalo de nuevo.';
      this.isProcessingPayment = false;
    }
  }
  adjustTextareaHeight(event: any): void {
    const textarea = event.target;

    // Resetear altura para obtener scrollHeight correcto
    textarea.style.height = 'auto';

    // Calcular nueva altura basada en el contenido
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, this.minTextareaHeight),
      this.maxTextareaHeight
    );

    // Aplicar nueva altura
    this.textareaHeight = newHeight;
    textarea.style.height = newHeight + 'px';
  }
  onEnterPressed(event: KeyboardEvent): void {
    if (event.shiftKey) {
      // Permitir nueva línea con Shift+Enter
      return;
    }

    event.preventDefault();

    if (this.canSendMessage() && !this.isLoading) {
      this.sendMessage();
      // Resetear altura del textarea después del envío
      setTimeout(() => {
        this.textareaHeight = this.minTextareaHeight;
      }, 50);
    }
  }
  canSendMessage(): boolean {
    return !!(this.currentMessage && this.currentMessage.trim().length > 0);
  }

  // Método para resetear el chat
  resetChat(): void {
    // Confirmar antes de resetear
    const confirmReset = confirm(
      '¿Estás seguro de que quieres reiniciar la conversación?'
    );

    if (confirmReset) {
      // Limpiar el historial de conversación
      this.conversationHistory = [];

      // Limpiar el mensaje actual
      this.currentMessage = '';

      // Resetear flags
      this.isLoading = false;
      this.isTyping = false;

      // Agregar mensaje de bienvenida inicial si lo deseas
      this.addWelcomeMessage();

      // Scroll al inicio
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }
  private addWelcomeMessage(): void {
    const welcomeMessage = {
      id: Date.now().toString(),
      role: 'love_expert' as const,
      message:
        '¡Hola! Soy la Maestra Paula, tu guía en el mundo del amor y la compatibilidad numerológica. ¿En qué puedo ayudarte hoy? 💕',
      timestamp: new Date(),
      isBlocked: false,
    };

    this.conversationHistory.push(welcomeMessage);
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
          console.log('¡Pago exitoso para amor!');
          this.hasUserPaidForLove = true;
          sessionStorage.setItem('hasUserPaidForLove', 'true');
          this.showPaymentModal = false;
          this.paymentElement?.destroy();

          this.blockedMessageId = null;
          sessionStorage.removeItem('loveBlockedMessageId');

          const confirmationMsg: ConversationMessage = {
            role: 'love_expert',
            message:
              '✨ ¡Pago confirmado! Ahora puedes acceder a todas las lecturas de compatibilidad amorosa que desees. Los secretos del amor verdadero se revelarán ante ti. ¿Qué otro aspecto romántico te gustaría explorar? 💕',
            timestamp: new Date(),
          };
          this.conversationHistory.push(confirmationMsg);

          // ✅ NUEVO: Procesar mensaje pendiente si existe
          const pendingMessage = sessionStorage.getItem('pendingLoveMessage');
          if (pendingMessage) {
            console.log(
              '📝 Procesando mensaje de amor pendiente:',
              pendingMessage
            );
            sessionStorage.removeItem('pendingLoveMessage');

            // Procesar el mensaje pendiente después de un pequeño delay
            setTimeout(() => {
              this.processLoveUserMessage(pendingMessage);
            }, 1000);
          }

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
        console.log('Error al destruir elemento de pago:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }

    this.isProcessingPayment = false;
    this.paymentError = null;
  }

  savePersonalData(): void {
    // Implementar guardado de datos personales si es necesario
    this.showDataForm = false;
  }

  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  /**
   * Pregunta sobre compatibilidad
   */
  askAboutCompatibility(): void {
    const message =
      'Quiero conocer la compatibilidad entre dos personas. ¿Qué información necesitas de nosotros?';
    this.sendPredefinedMessage(message);
  }

  /**
   * Pregunta sobre los números del amor
   */
  askAboutNumbers(): void {
    const message =
      '¿Puedes explicarme más detalles sobre nuestros números del amor y qué significan para nuestra relación?';
    this.sendPredefinedMessage(message);
  }

  /**
   * Pide consejos para la relación
   */
  askAdvice(): void {
    const message =
      '¿Qué consejos nos puedes dar para fortalecer nuestra relación basándote en nuestros números de compatibilidad?';
    this.sendPredefinedMessage(message);
  }

  /**
   * Envía un mensaje predefinido
   */
  private sendPredefinedMessage(message: string): void {
    this.currentMessage = message;
    this.sendMessage();
  }

  newConsultation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForLove) {
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('loveMessages');
      sessionStorage.removeItem('loveFirstQuestionAsked');
      sessionStorage.removeItem('loveBlockedMessageId');
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
    }

    this.conversationHistory = [];
    this.hasStartedConversation = false;
    this.calculadoraAmorService.resetService();
    this.compatibilityForm.reset();

    setTimeout(() => {
      this.initializeLoveWelcomeMessage();
    }, 500);
  }

  /**
   * TrackBy function para optimizar el rendering de mensajes
   */
  trackByMessage(index: number, message: ConversationMessage): string {
    return `${message.role}-${message.timestamp.getTime()}-${index}`;
  }

  /**
   * Formatea la hora de un mensaje
   */
  formatTime(timestamp: Date | string): string {
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

  private handleError(errorMessage: string): void {
    const errorMsg: ConversationMessage = {
      role: 'love_expert',
      message: `💕 Las energías del amor están en fluctuación... ${errorMessage} Intenta nuevamente cuando las vibraciones románticas se estabilicen.`,
      timestamp: new Date(),
    };
    this.conversationHistory.push(errorMsg);
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

  /**
   * Formatea una fecha para el servicio
   */
  private formatDateForService(date: Date): string {
    if (!date) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  /**
   * Marca todos los campos del formulario como tocados
   */
  private markFormGroupTouched(): void {
    Object.keys(this.compatibilityForm.controls).forEach((key) => {
      const control = this.compatibilityForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Verifica si el formulario tiene errores específicos
   */
  hasFormError(fieldName: string, errorType: string): boolean {
    const field = this.compatibilityForm.get(fieldName);
    return !!(
      field &&
      field.hasError(errorType) &&
      (field.dirty || field.touched)
    );
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getFieldErrorMessage(fieldName: string): string {
    const field = this.compatibilityForm.get(fieldName);

    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (field?.hasError('minlength')) {
      return 'Mínimo 2 caracteres';
    }

    return '';
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

  closeModal(): void {
    console.log('Cerrando modal de calculadora de amor');
  }

  onUserDataSubmitted(userData: any): void {
    console.log('📥 Datos del usuario recibidos en amor:', userData);
    console.log('📋 Campos disponibles:', Object.keys(userData));

    // ✅ VALIDAR CAMPOS CRÍTICOS ANTES DE PROCEDER
    const requiredFields = ['nombre', 'apellido', 'email', 'telefono'];
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || userData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      console.error('❌ Faltan campos obligatorios para amor:', missingFields);
      alert(
        `Para proceder con el pago, necesitas completar: ${missingFields.join(
          ', '
        )}`
      );
      this.showDataModal = true; // Mantener modal abierto
      return;
    }

    // ✅ LIMPIAR Y GUARDAR datos INMEDIATAMENTE en memoria Y sessionStorage
    this.userData = {
      ...userData,
      nombre: userData.nombre?.toString().trim(),
      apellido: userData.apellido?.toString().trim(),
      email: userData.email?.toString().trim(),
      telefono: userData.telefono?.toString().trim(),
    };

    // ✅ GUARDAR EN sessionStorage INMEDIATAMENTE
    try {
      sessionStorage.setItem('userData', JSON.stringify(this.userData));
      console.log(
        '✅ Datos guardados en sessionStorage para amor:',
        this.userData
      );

      // Verificar que se guardaron correctamente
      const verificacion = sessionStorage.getItem('userData');
      console.log(
        '🔍 Verificación - Datos en sessionStorage para amor:',
        verificacion ? JSON.parse(verificacion) : 'No encontrados'
      );
    } catch (error) {
      console.error('❌ Error guardando en sessionStorage:', error);
    }

    this.showDataModal = false;

    // ✅ NUEVO: Enviar datos al backend como en otros componentes
    this.sendUserDataToBackend(userData);
  }
  private sendUserDataToBackend(userData: any): void {
    console.log('📤 Enviando datos al backend desde amor...');

    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        console.log(
          '✅ Datos enviados correctamente al backend desde amor:',
          response
        );

        // ✅ PROCEDER AL PAGO DESPUÉS DE UN PEQUEÑO DELAY
        setTimeout(() => {
          this.promptForPayment();
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error enviando datos al backend desde amor:', error);

        // ✅ AUN ASÍ PROCEDER AL PAGO (el backend puede fallar pero el pago debe continuar)
        console.log('⚠️ Continuando con el pago a pesar del error del backend');
        setTimeout(() => {
          this.promptForPayment();
        }, 500);
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
  }

  showLoveWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    console.log('⏰ Timer amoroso configurado para', delayMs, 'ms');

    this.wheelTimer = setTimeout(() => {
      console.log('🎰 Verificando si puede mostrar ruleta del amor...');
      console.log('- canShowWheel:', FortuneWheelComponent.canShowWheel());
      console.log('- !showPaymentModal:', !this.showPaymentModal);
      console.log('- !showDataModal:', !this.showDataModal);

      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        console.log('✅ Mostrando ruleta del amor - usuario puede girar');
        this.showFortuneWheel = true;
      } else {
        console.log('❌ No se puede mostrar ruleta del amor en este momento');
      }
    }, delayMs);
  }

  // ✅ MANEJAR PREMIO GANADO
  onPrizeWon(prize: Prize): void {
    console.log('🎉 Premio amoroso ganado:', prize);

    const prizeMessage: ConversationMessage = {
      role: 'love_expert',
      message: `💕 ¡El amor verdadero ha conspirado a tu favor! Has ganado: **${prize.name}** ${prize.icon}\n\nLas fuerzas románticas del universo han decidido bendecirte con este regalo celestial. La energía del amor fluye a través de ti, revelando secretos más profundos sobre la compatibilidad y el romance. ¡Que el amor eterno te acompañe!`,
      timestamp: new Date(),
    };

    this.conversationHistory.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    this.processLovePrize(prize);
  }

  // ✅ PROCESAR PREMIO ESPECÍFICO
  private processLovePrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Lecturas Amorosas
        this.addFreeLoveConsultations(3);
        break;
      case '2': // 1 Análisis Premium
        this.addFreeLoveConsultations(1);
        break;
      case '3': // 2 Consultas Extra
        this.addFreeLoveConsultations(2);
        break;
      case '4': // Otra oportunidad
        console.log('🔄 Otra oportunidad amorosa concedida');
        break;
    }
  }

  // ✅ AGREGAR CONSULTAS GRATIS
  private addFreeLoveConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeLoveConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeLoveConsultations', newTotal.toString());
    console.log(`🎁 Agregadas ${count} consultas amorosas. Total: ${newTotal}`);

    if (this.blockedMessageId && !this.hasUserPaidForLove) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('loveBlockedMessageId');
      console.log('🔓 Mensaje amoroso desbloqueado con consulta gratuita');
    }
  }

  // ✅ VERIFICAR CONSULTAS GRATIS DISPONIBLES
  private hasFreeLoveConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeLoveConsultations') || '0'
    );
    return freeConsultations > 0;
  }
  private useFreeLoveConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeLoveConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem('freeLoveConsultations', remaining.toString());
      console.log(`🎁 Consulta amorosa gratis usada. Restantes: ${remaining}`);

      // Mostrar mensaje informativo
      const prizeMsg: ConversationMessage = {
        role: 'love_expert',
        message: `✨ *Has usado una consulta amorosa gratis* ✨\n\nTe quedan **${remaining}** consultas amorosas gratis disponibles.`,
        timestamp: new Date(),
      };
      this.conversationHistory.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  // ✅ CERRAR RULETA
  onWheelClosed(): void {
    console.log('🎰 Cerrando ruleta del amor');
    this.showFortuneWheel = false;
  }

  // ✅ ACTIVAR RULETA MANUALMENTE
  triggerLoveWheel(): void {
    console.log('🎰 Intentando activar ruleta del amor manualmente...');

    if (this.showPaymentModal || this.showDataModal) {
      console.log('❌ No se puede mostrar - hay otros modales abiertos');
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      console.log('✅ Activando ruleta del amor manualmente');
      this.showFortuneWheel = true;
    } else {
      console.log(
        '❌ No se puede activar ruleta del amor - sin tiradas disponibles'
      );
      alert(
        'No tienes tiradas disponibles. ' +
          FortuneWheelComponent.getSpinStatus()
      );
    }
  }

  // ✅ OBTENER ESTADO DE SPINS
  getSpinStatus(): string {
    return FortuneWheelComponent.getSpinStatus();
  }
}
