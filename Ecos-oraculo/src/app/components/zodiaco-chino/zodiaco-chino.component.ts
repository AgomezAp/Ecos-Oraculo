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
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ZodiacoChinoService } from '../../services/zodiaco-chino.service';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environmets.prod';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';

interface ChatMessage {
  role: 'user' | 'master';
  message: string;
  timestamp?: string;
  id?: string;
}

interface MasterInfo {
  success: boolean;
  master: {
    name: string;
    title: string;
    specialty: string;
    description: string;
    services: string[];
  };
  timestamp: string;
}

interface ZodiacAnimal {
  animal?: string;
  symbol?: string;
  year?: number;
  element?: string;
  traits?: string[];
}
@Component({
  selector: 'app-zodiaco-chino',
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
    RecolectaDatosComponent,
    FortuneWheelComponent,
  ],
  templateUrl: './zodiaco-chino.component.html',
  styleUrl: './zodiaco-chino.component.css',
})
export class ZodiacoChinoComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  // Propiedades principales
  masterInfo: MasterInfo | null = null;
  userForm: FormGroup;
  isFormCompleted = false;
  isLoading = false;
  currentMessage = '';
  conversationHistory: ChatMessage[] = [];
  zodiacAnimal: ZodiacAnimal = {};
  showDataForm = true;
  isTyping: boolean = false;
  private shouldScrollToBottom = false;
  private shouldAutoScroll = true;
  private lastMessageCount = 0;
  //Variables para control de fortuna
  showFortuneWheel: boolean = false;
  horoscopePrizes: Prize[] = [
    {
      id: '1',
      name: '3 Lecturas Horoscópicas Gratis',
      color: '#4ecdc4',
      icon: '🔮',
    },
    {
      id: '2',
      name: '1 Análisis Zodiacal Premium',
      color: '#45b7d1',
      icon: '✨',
    },
    {
      id: '3',
      name: '2 Consultas Astrológicas Extra',
      color: '#ffeaa7',
      icon: '🌟',
    },
    {
      id: '4',
      name: '¡Los astros dicen: otra oportunidad!',
      color: '#ff7675',
      icon: '🌙',
    },
  ];
  private wheelTimer: any;
  // Variables para control de pagos
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForHoroscope: boolean = false;
  firstQuestionAsked: boolean = false;
  blockedMessageId: string | null = null;
  //Datos para enviar
  showDataModal: boolean = false;
  userData: any = null;
  // Configuración de Stripe
  private stripePublishableKey =
    'pk_live_51ROf7JKaf976EMQYuG2XY0OwKWFcea33O5WxIDBKEeoTDqyOUgqmizQ2knrH6MCnJlIoDQ95HJrRhJaL0jjpULHj00sCSWkBw6';
  private backendUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private zodiacoChinoService: ZodiacoChinoService,
    private http: HttpClient
  ) {
    // Configuración del formulario para horóscopo
    this.userForm = this.fb.group({
      fullName: [''],
      birthYear: [
        '',
        [Validators.required, Validators.min(1900), Validators.max(2024)],
      ],
      birthDate: [''],
      initialQuestion: [
        '¿Qué puedes decirme sobre mi signo zodiacal y horóscopo?',
      ],
    });
  }

  async ngOnInit(): Promise<void> {
    // Inicializar Stripe
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError =
        'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    // Verificar estado de pago para horóscopo
    this.hasUserPaidForHoroscope =
      sessionStorage.getItem('hasUserPaidForHoroscope') === 'true';

    // Cargar datos guardados específicos del horóscopo
    const savedMessages = sessionStorage.getItem('horoscopeMessages');
    const savedFirstQuestion = sessionStorage.getItem(
      'horoscopeFirstQuestionAsked'
    );
    const savedBlockedMessageId = sessionStorage.getItem(
      'horoscopeBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.conversationHistory = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp,
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        console.log(
          '✅ Mensajes del horóscopo restaurados desde sessionStorage'
        );
      } catch (error) {
        console.error('Error al restaurar mensajes del horóscopo:', error);
        this.clearHoroscopeSessionData();
      }
    }

    // Verificar URL para pagos exitosos
    this.checkHoroscopePaymentStatus();

    this.loadMasterInfo();

    // Solo agregar mensaje de bienvenida si no hay mensajes guardados
    if (this.conversationHistory.length === 0) {
      this.addWelcomeMessage();

      // ✅ AGREGAR VERIFICACIÓN DE RULETA HOROSCÓPICA
      if (FortuneWheelComponent.canShowWheel()) {
        this.showHoroscopeWheelAfterDelay(3000);
      } else {
        console.log(
          '🚫 No se puede mostrar ruleta horoscópica - sin tiradas disponibles'
        );
      }
    }

    // ✅ AGREGAR ESTA LÍNEA AL FINAL:
    if (
      this.conversationHistory.length > 1 &&
      FortuneWheelComponent.canShowWheel()
    ) {
      this.showHoroscopeWheelAfterDelay(2000);
    }
  }
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }

    if (
      this.shouldAutoScroll &&
      this.conversationHistory.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.conversationHistory.length;
    }
  }

  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago del horóscopo:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }
  }

  private checkHoroscopePaymentStatus(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get(
      'payment_intent_client_secret'
    );

    if (paymentIntent && paymentIntentClientSecret && this.stripe) {
      console.log('🔍 Verificando estado del pago del horóscopo...');

      this.stripe
        .retrievePaymentIntent(paymentIntentClientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent) {
            switch (paymentIntent.status) {
              case 'succeeded':
                console.log('✅ Pago del horóscopo confirmado desde URL');
                this.hasUserPaidForHoroscope = true;
                sessionStorage.setItem('hasUserPaidForHoroscope', 'true');
                this.blockedMessageId = null;
                sessionStorage.removeItem('horoscopeBlockedMessageId');

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
                  this.addMessage(
                    'master',
                    '🔮 ¡Pago confirmado! Ahora puedes acceder a toda la sabiduría astrológica. Los secretos de las estrellas y tu horóscopo personal están a tu disposición. ¿Qué otro aspecto de tu signo zodiacal te gustaría explorar?'
                  );
                }
                break;

              case 'processing':
                console.log('⏳ Pago del horóscopo en procesamiento');
                break;

              case 'requires_payment_method':
                console.log('❌ Pago del horóscopo falló');
                this.clearHoroscopeSessionData();
                break;
            }
          }
        })
        .catch((error: any) => {
          console.error('Error verificando el pago del horóscopo:', error);
        });
    }
  }

  private saveHoroscopeMessagesToSession(): void {
    try {
      const messagesToSave = this.conversationHistory.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp,
      }));
      sessionStorage.setItem(
        'horoscopeMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
      console.error('Error guardando mensajes del horóscopo:', error);
    }
  }

  private clearHoroscopeSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForHoroscope');
    sessionStorage.removeItem('horoscopeMessages');
    sessionStorage.removeItem('horoscopeFirstQuestionAsked');
    sessionStorage.removeItem('horoscopeBlockedMessageId');
  }

  private saveHoroscopeStateBeforePayment(): void {
    console.log('💾 Guardando estado del horóscopo antes del pago...');
    this.saveHoroscopeMessagesToSession();
    sessionStorage.setItem(
      'horoscopeFirstQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'horoscopeBlockedMessageId',
        this.blockedMessageId
      );
    }
  }

  isMessageBlocked(message: ChatMessage): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForHoroscope
    );
  }

  async promptForHoroscopePayment(): Promise<void> {
    console.log('💳 EJECUTANDO promptForPayment() para horóscopo');

    this.showPaymentModal = true;
    this.paymentError = null;
    this.isProcessingPayment = true;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log(
          'Error destruyendo elemento anterior del horóscopo:',
          error
        );
      }
      this.paymentElement = undefined;
    }

    try {
      const items = [{ id: 'horoscope_reading_unlimited', amount: 500 }];
      console.log('📤 Enviando request de payment intent para horóscopo...');

      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          { items }
        )
        .toPromise();

      console.log('📥 Respuesta de payment intent del horóscopo:', response);

      if (!response || !response.clientSecret) {
        throw new Error(
          'Error al obtener la información de pago del servidor para horóscopo.'
        );
      }
      this.clientSecret = response.clientSecret;

      if (this.stripe && this.clientSecret) {
        this.elements = this.stripe.elements({
          clientSecret: this.clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#dc2626',
              colorBackground: '#ffffff',
              colorText: '#424770',
              colorDanger: '#df1b41',
              fontFamily: 'El Messiri, system-ui, sans-serif',
              spacingUnit: '2px',
              borderRadius: '12px',
            },
          },
        });
        this.paymentElement = this.elements.create('payment');

        this.isProcessingPayment = false;

        setTimeout(() => {
          const paymentElementContainer = document.getElementById(
            'payment-element-container-horoscope'
          );
          console.log(
            '🎯 Contenedor del horóscopo encontrado:',
            paymentElementContainer
          );

          if (paymentElementContainer && this.paymentElement) {
            console.log('✅ Montando payment element del horóscopo...');
            this.paymentElement.mount(paymentElementContainer);
          } else {
            console.error(
              '❌ Contenedor del elemento de pago del horóscopo no encontrado.'
            );
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
          }
        }, 100);
      } else {
        throw new Error(
          'Stripe.js o la clave secreta del cliente no están disponibles para horóscopo.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error al preparar el pago del horóscopo:', error);
      this.paymentError =
        error.message ||
        'Error al inicializar el pago del horóscopo. Por favor, inténtalo de nuevo.';
      this.isProcessingPayment = false;
    }
  }

  async handleHoroscopePaymentSubmit(): Promise<void> {
    if (
      !this.stripe ||
      !this.elements ||
      !this.clientSecret ||
      !this.paymentElement
    ) {
      this.paymentError =
        'El sistema de pago del horóscopo no está inicializado correctamente.';
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
        error.message ||
        'Ocurrió un error inesperado durante el pago del horóscopo.';
      this.isProcessingPayment = false;
    } else if (paymentIntent) {
      switch (paymentIntent.status) {
        case 'succeeded':
          console.log('¡Pago exitoso para horóscopo!');
          this.hasUserPaidForHoroscope = true;
          sessionStorage.setItem('hasUserPaidForHoroscope', 'true');
          this.showPaymentModal = false;
          this.paymentElement?.destroy();

          this.blockedMessageId = null;
          sessionStorage.removeItem('horoscopeBlockedMessageId');

          this.addMessage(
            'master',
            '🔮 ¡Pago confirmado! Ahora puedes acceder a toda la sabiduría astrológica. Los secretos de las estrellas y la influencia celestial revelarán todos sus misterios en tu horóscopo personal. ¿Qué otro aspecto de tu signo zodiacal te gustaría explorar?'
          );

          this.shouldAutoScroll = true;
          this.saveHoroscopeMessagesToSession();
          break;
        case 'processing':
          this.paymentError =
            'El pago del horóscopo se está procesando. Te notificaremos cuando se complete.';
          break;
        case 'requires_payment_method':
          this.paymentError =
            'Pago del horóscopo fallido. Por favor, intenta con otro método de pago.';
          this.isProcessingPayment = false;
          break;
        case 'requires_action':
          this.paymentError =
            'Se requiere una acción adicional para completar el pago del horóscopo.';
          this.isProcessingPayment = false;
          break;
        default:
          this.paymentError = `Estado del pago del horóscopo: ${paymentIntent.status}. Inténtalo de nuevo.`;
          this.isProcessingPayment = false;
          break;
      }
    } else {
      this.paymentError =
        'No se pudo determinar el estado del pago del horóscopo.';
      this.isProcessingPayment = false;
    }
  }

  cancelHoroscopePayment(): void {
    this.showPaymentModal = false;
    this.clientSecret = null;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago del horóscopo:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }

    this.isProcessingPayment = false;
    this.paymentError = null;
  }

  startChatWithoutForm(): void {
    this.showDataForm = false;
  }

  // Cargar información del maestro
  loadMasterInfo(): void {
    this.zodiacoChinoService.getMasterInfo().subscribe({
      next: (info) => {
        this.masterInfo = info;
      },
      error: (error) => {
        console.error('Error cargando información del maestro:', error);
        // Información predeterminada en caso de error
        this.masterInfo = {
          success: true,
          master: {
            name: 'Astróloga María',
            title: 'Guía Celestial de los Signos',
            specialty: 'Astrología occidental y horóscopo personalizado',
            description:
              'Sabia astróloga especializada en interpretar las influencias celestiales y la sabiduría de los doce signos zodiacales',
            services: [
              'Interpretación de signos zodiacales',
              'Análisis de cartas astrales',
              'Predicciones horoscópicas',
              'Compatibilidades entre signos',
              'Consejos basados en astrología',
            ],
          },
          timestamp: new Date().toISOString(),
        };
      },
    });
  }

  // Mensaje de bienvenida inicial
  addWelcomeMessage(): void {
    const welcomeMessage = `¡Saludos y bienvenido al reino de las estrellas! 🔮✨

Soy la Astróloga María, guía celestial de los signos zodiacales. Durante décadas he estudiado las influencias de los planetas y las constelaciones que guían nuestro destino.

Cada persona nace bajo la protección de un signo zodiacal que influye en su personalidad, destino y camino en la vida. Para revelar los secretos de tu horóscopo y las influencias celestiales, necesito conocer tu fecha de nacimiento.

Los doce signos (Aries, Tauro, Géminis, Cáncer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario y Piscis) tienen sabiduría ancestral que compartir contigo.

¿Estás listo para descubrir qué revelan las estrellas sobre tu destino? 🌙`;

    this.addMessage('master', welcomeMessage);
  }

  // Iniciar consulta del horóscopo
  startConsultation(): void {
    if (this.userForm.valid && !this.isLoading) {
      this.isLoading = true;

      const formData = this.userForm.value;

      // Calcular animal del zodiaco
      this.calculateZodiacAnimal(formData.birthYear, formData.birthDate);

      const initialMessage =
        formData.initialQuestion ||
        '¡Hola! Me gustaría conocer más sobre mi signo zodiacal y horóscopo.';

      // Agregar mensaje del usuario
      this.addMessage('user', initialMessage);

      // Marcar que se hizo la primera pregunta
      if (!this.firstQuestionAsked) {
        this.firstQuestionAsked = true;
        sessionStorage.setItem('horoscopeFirstQuestionAsked', 'true');
      }

      // Preparar datos para enviar al backend
      const consultationData = {
        zodiacData: {
          name: 'Astróloga María',
          specialty: 'Astrología occidental y horóscopo personalizado',
          experience: 'Décadas de experiencia en interpretación astrológica',
        },
        userMessage: initialMessage,
        fullName: formData.fullName,
        birthYear: formData.birthYear?.toString(),
        birthDate: formData.birthDate,
        conversationHistory: this.conversationHistory,
      };

      // Llamar al servicio
      this.zodiacoChinoService.chatWithMaster(consultationData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.response) {
            this.addMessage('master', response.response);
            this.isFormCompleted = true;
            this.showDataForm = false;
            this.saveHoroscopeMessagesToSession();
          } else {
            this.handleError('Error en la respuesta de la astróloga');
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError(
            'Error conectando con la astróloga: ' +
              (error.error?.error || error.message)
          );
        },
      });
    }
  }

  sendMessage(): void {
    if (this.currentMessage.trim() && !this.isLoading) {
      const message = this.currentMessage.trim();

      // ✅ NUEVA LÓGICA: Verificar consultas horoscópicas gratuitas ANTES de verificar pago
      if (!this.hasUserPaidForHoroscope && this.firstQuestionAsked) {
        // Verificar si tiene consultas horoscópicas gratis disponibles
        if (this.hasFreeHoroscopeConsultationsAvailable()) {
          console.log('🎁 Usando consulta horoscópica gratis del premio');
          this.useFreeHoroscopeConsultation();
          // Continuar con el mensaje sin bloquear
        } else {
          // Si no tiene consultas gratis, mostrar modal de datos
          console.log(
            '💳 No hay consultas horoscópicas gratis - mostrando modal de datos'
          );

          // Cerrar otros modales primero
          this.showFortuneWheel = false;
          this.showPaymentModal = false;

          // Guardar el mensaje para procesarlo después del pago
          sessionStorage.setItem('pendingHoroscopeMessage', message);

          this.saveHoroscopeStateBeforePayment();

          // Mostrar modal de datos con timeout
          setTimeout(() => {
            this.showDataModal = true;
            console.log('📝 showDataModal establecido a:', this.showDataModal);
          }, 100);

          return; // Salir aquí para no procesar el mensaje aún
        }
      }

      this.currentMessage = '';
      this.isLoading = true;
      this.isTyping = true;

      // Agregar mensaje del usuario
      this.addMessage('user', message);

      const formData = this.userForm.value;
      const consultationData = {
        zodiacData: {
          name: 'Astróloga María',
          specialty: 'Astrología occidental y horóscopo personalizado',
          experience: 'Décadas de experiencia en interpretación astrológica',
        },
        userMessage: message,
        fullName: formData.fullName,
        birthYear: formData.birthYear?.toString(),
        birthDate: formData.birthDate,
        conversationHistory: this.conversationHistory,
      };

      this.zodiacoChinoService.chatWithMaster(consultationData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isTyping = false;
          if (response.success && response.response) {
            const messageId = Date.now().toString();

            this.addMessage('master', response.response, messageId);

            // ✅ LÓGICA MODIFICADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
            if (
              this.firstQuestionAsked &&
              !this.hasUserPaidForHoroscope &&
              !this.hasFreeHoroscopeConsultationsAvailable()
            ) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('horoscopeBlockedMessageId', messageId);

              setTimeout(() => {
                console.log(
                  '🔒 Mensaje horoscópico bloqueado - mostrando modal de datos'
                );
                this.saveHoroscopeStateBeforePayment();

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
              sessionStorage.setItem('horoscopeFirstQuestionAsked', 'true');
            }

            this.saveHoroscopeMessagesToSession();
          } else {
            this.handleError('Error en la respuesta de la astróloga');
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isTyping = false;
          this.handleError(
            'Error conectando con la astróloga: ' +
              (error.error?.error || error.message)
          );
        },
      });
    }
  }
  // Calcular animal del zodiaco chino (mantenido para compatibilidad)
  calculateZodiacAnimal(birthYear: number, birthDate?: string): void {
    if (birthYear) {
      const animal = this.getChineseZodiacAnimal(birthYear);
      const element = this.getChineseElement(birthYear);
      const symbol = this.getAnimalSymbol(animal);
      const traits = this.getAnimalTraits(animal);

      this.zodiacAnimal = {
        animal,
        element,
        year: birthYear,
        symbol,
        traits,
      };
    }
  }

  // Obtener animal del zodiaco chino (mantenido para compatibilidad)
  private getChineseZodiacAnimal(year: number): string {
    const animals = [
      'Mono',
      'Gallo',
      'Perro',
      'Cerdo',
      'Rata',
      'Buey',
      'Tigre',
      'Conejo',
      'Dragón',
      'Serpiente',
      'Caballo',
      'Cabra',
    ];

    const index = (year - 4) % 12;
    return animals[index < 0 ? index + 12 : index];
  }

  // Obtener elemento chino (mantenido para compatibilidad)
  private getChineseElement(year: number): string {
    const elements = [
      'Metal',
      'Metal',
      'Agua',
      'Agua',
      'Madera',
      'Madera',
      'Fuego',
      'Fuego',
      'Tierra',
      'Tierra',
    ];
    const index = year % 10;
    return elements[index];
  }

  // Obtener símbolo del animal (mantenido para compatibilidad)
  private getAnimalSymbol(animal: string): string {
    const symbols: { [key: string]: string } = {
      Rata: '🐭',
      Buey: '🐂',
      Tigre: '🐅',
      Conejo: '🐰',
      Dragón: '🐲',
      Serpiente: '🐍',
      Caballo: '🐴',
      Cabra: '🐐',
      Mono: '🐵',
      Gallo: '🐓',
      Perro: '🐕',
      Cerdo: '🐷',
    };
    return symbols[animal] || '🐾';
  }

  // Obtener características del animal (mantenido para compatibilidad)
  private getAnimalTraits(animal: string): string[] {
    const traits: { [key: string]: string[] } = {
      Rata: ['Inteligente', 'Adaptable', 'Encantador', 'Ambicioso'],
      Buey: ['Trabajador', 'Confiable', 'Fuerte', 'Determinado'],
      Tigre: ['Valiente', 'Competitivo', 'Impredecible', 'Carismático'],
      Conejo: ['Gentil', 'Sensible', 'Compasivo', 'Elegante'],
      Dragón: ['Poderoso', 'Afortunado', 'Carismático', 'Ambicioso'],
      Serpiente: ['Sabio', 'Intuitivo', 'Misterioso', 'Sofisticado'],
      Caballo: ['Libre', 'Energético', 'Independiente', 'Aventurero'],
      Cabra: ['Creativo', 'Compasivo', 'Gentil', 'Pacífico'],
      Mono: ['Ingenioso', 'Inteligente', 'Flexible', 'Divertido'],
      Gallo: ['Organizado', 'Valiente', 'Honesto', 'Trabajador'],
      Perro: ['Leal', 'Honesto', 'Justo', 'Confiable'],
      Cerdo: ['Generoso', 'Optimista', 'Honesto', 'Compasivo'],
    };
    return traits[animal] || ['Único', 'Especial'];
  }

  // Manejar tecla Enter
  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Alternar formulario
  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  // Reiniciar consulta
  resetConsultation(): void {
    this.conversationHistory = [];
    this.isFormCompleted = false;
    this.showDataForm = true;
    this.currentMessage = '';
    this.zodiacAnimal = {};
    this.firstQuestionAsked = false;
    this.blockedMessageId = null;

    // Limpiar sessionStorage específico del horóscopo
    if (!this.hasUserPaidForHoroscope) {
      this.clearHoroscopeSessionData();
    } else {
      sessionStorage.removeItem('horoscopeMessages');
      sessionStorage.removeItem('horoscopeFirstQuestionAsked');
      sessionStorage.removeItem('horoscopeBlockedMessageId');
    }

    this.userForm.reset({
      fullName: '',
      birthYear: '',
      birthDate: '',
      initialQuestion:
        '¿Qué puedes decirme sobre mi signo zodiacal y horóscopo?',
    });
    this.addWelcomeMessage();
  }

  // Explorar compatibilidad
  exploreCompatibility(): void {
    const message =
      '¿Podrías hablarme sobre la compatibilidad de mi signo zodiacal con otros signos?';
    this.currentMessage = message;
    this.sendMessage();
  }

  // Explorar elementos
  exploreElements(): void {
    const message = '¿Cómo influyen los planetas en mi personalidad y destino?';
    this.currentMessage = message;
    this.sendMessage();
  }

  // Métodos auxiliares
  private addMessage(
    role: 'user' | 'master',
    message: string,
    id?: string
  ): void {
    const newMessage: ChatMessage = {
      role,
      message,
      timestamp: new Date().toISOString(),
      id: id || undefined,
    };
    this.conversationHistory.push(newMessage);
    this.shouldScrollToBottom = true;
    this.saveHoroscopeMessagesToSession();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      try {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      } catch (err) {
        console.error('Error scrolling to bottom:', err);
      }
    }
  }

  private handleError(message: string): void {
    this.addMessage(
      'master',
      `Lo siento, ${message}. Por favor, intenta nuevamente.`
    );
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

  formatTime(timestamp?: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return `${message.role}-${message.timestamp}-${index}`;
  }

  closeModal(): void {
    // Implementar lógica de cierre de modal si es necesario
    console.log('Cerrar modal');
  }

  // Auto-resize del textarea
  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // Manejar tecla Enter
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Limpiar chat
  clearChat(): void {
    this.conversationHistory = [];
    this.currentMessage = '';
    this.firstQuestionAsked = false;
    this.blockedMessageId = null;
    this.isLoading = false;

    // Limpiar sessionStorage específico del horóscopo
    if (!this.hasUserPaidForHoroscope) {
      this.clearHoroscopeSessionData();
    } else {
      sessionStorage.removeItem('horoscopeMessages');
      sessionStorage.removeItem('horoscopeFirstQuestionAsked');
      sessionStorage.removeItem('horoscopeBlockedMessageId');
    }

    this.shouldScrollToBottom = true;
    this.addWelcomeMessage();
  }
  resetChat(): void {
    this.conversationHistory = [];
    this.currentMessage = '';
    // Si tienes algún estado adicional que resetear, agrégalo aquí
  }
  onUserDataSubmitted(userData: any): void {
    console.log('Datos del usuario recibidos:', userData);
    this.userData = userData;
    this.showDataModal = false;

    // Enviar datos al backend
    this.sendUserDataToBackend(userData);
  }
  private sendUserDataToBackend(userData: any): void {
    console.log('📤 Enviando datos al backend...');

    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        console.log('✅ Datos enviados correctamente:', response);
        // Proceder al pago después de guardar los datos
        setTimeout(() => {
          this.promptForHoroscopePayment();
        }, 300);
      },
      error: (error) => {
        console.error('❌ Error enviando datos:', error);
        // Aún así proceder al pago, pero mostrar advertencia
        alert(
          'Hubo un problema guardando los datos, pero puedes continuar con el pago.'
        );
        setTimeout(() => {
          this.promptForHoroscopePayment();
        }, 300);
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
  }
  showHoroscopeWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    console.log('⏰ Timer horoscópico configurado para', delayMs, 'ms');

    this.wheelTimer = setTimeout(() => {
      console.log('🎰 Verificando si puede mostrar ruleta horoscópica...');

      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        console.log('✅ Mostrando ruleta horoscópica - usuario puede girar');
        this.showFortuneWheel = true;
      } else {
        console.log(
          '❌ No se puede mostrar ruleta horoscópica en este momento'
        );
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    console.log('🎉 Premio horoscópico ganado:', prize);

    const prizeMessage: ChatMessage = {
      role: 'master',
      message: `🔮 ¡Los astros han conspirado a tu favor! Has ganado: **${prize.name}** ${prize.icon}\n\nLas fuerzas celestiales han decidido bendecirte con este regalo sagrado. La energía zodiacal fluye a través de ti, revelando secretos más profundos de tu horóscopo personal. ¡Que la sabiduría astrológica te ilumine!`,
      timestamp: new Date().toISOString(),
    };

    this.conversationHistory.push(prizeMessage);
    this.shouldScrollToBottom = true;
    this.saveHoroscopeMessagesToSession();

    this.processHoroscopePrize(prize);
  }

  onWheelClosed(): void {
    console.log('🎰 Cerrando ruleta horoscópica');
    this.showFortuneWheel = false;
  }

  triggerHoroscopeWheel(): void {
    console.log('🎰 Intentando activar ruleta horoscópica manualmente...');

    if (this.showPaymentModal || this.showDataModal) {
      console.log('❌ No se puede mostrar - hay otros modales abiertos');
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      console.log('✅ Activando ruleta horoscópica manualmente');
      this.showFortuneWheel = true;
    } else {
      console.log(
        '❌ No se puede activar ruleta horoscópica - sin tiradas disponibles'
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

  private processHoroscopePrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Lecturas Horoscópicas
        this.addFreeHoroscopeConsultations(3);
        break;
      case '2': // 1 Análisis Premium
        this.addFreeHoroscopeConsultations(1);
        break;
      case '3': // 2 Consultas Extra
        this.addFreeHoroscopeConsultations(2);
        break;
      case '4': // Otra oportunidad
        console.log('🔄 Otra oportunidad horoscópica concedida');
        break;
    }
  }

  private addFreeHoroscopeConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeHoroscopeConsultations', newTotal.toString());
    console.log(
      `🎁 Agregadas ${count} consultas horoscópicas. Total: ${newTotal}`
    );

    if (this.blockedMessageId && !this.hasUserPaidForHoroscope) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('horoscopeBlockedMessageId');
      console.log('🔓 Mensaje horoscópico desbloqueado con consulta gratuita');
    }
  }

  private hasFreeHoroscopeConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeHoroscopeConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeHoroscopeConsultations',
        remaining.toString()
      );
      console.log(
        `🎁 Consulta horoscópica gratis usada. Restantes: ${remaining}`
      );

      const prizeMsg: ChatMessage = {
        role: 'master',
        message: `✨ *Has usado una lectura horoscópica gratis* ✨\n\nTe quedan **${remaining}** consultas astrológicas disponibles.`,
        timestamp: new Date().toISOString(),
      };
      this.conversationHistory.push(prizeMsg);
      this.shouldScrollToBottom = true;
      this.saveHoroscopeMessagesToSession();
    }
  }

  debugHoroscopeWheel(): void {
    console.log('=== DEBUG RULETA HOROSCÓPICA ===');
    console.log('showFortuneWheel:', this.showFortuneWheel);
    console.log(
      'FortuneWheelComponent.canShowWheel():',
      FortuneWheelComponent.canShowWheel()
    );
    console.log('showPaymentModal:', this.showPaymentModal);
    console.log('showDataModal:', this.showDataModal);
    console.log(
      'freeHoroscopeConsultations:',
      sessionStorage.getItem('freeHoroscopeConsultations')
    );

    this.showFortuneWheel = true;
    console.log('Forzado showFortuneWheel a:', this.showFortuneWheel);
  }

  // ✅ MÉTODO AUXILIAR para el template
  getHoroscopeConsultationsCount(): number {
    return parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );
  }
}
