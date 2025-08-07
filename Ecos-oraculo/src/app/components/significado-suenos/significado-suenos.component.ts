import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  ConversationMessage,
  DreamInterpreterData,
  InterpretadorSuenosService,
} from '../../services/interpretador-suenos.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';
@Component({
  selector: 'app-significado-suenos',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
    FortuneWheelComponent,
  ],
  templateUrl: './significado-suenos.component.html',
  styleUrl: './significado-suenos.component.css',
})
export class SignificadoSuenosComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variables principales del chat
  messageText: string = '';
  messageInput = new FormControl('');
  messages: ConversationMessage[] = [];
  isLoading = false;
  isTyping = false;
  hasStartedConversation = false;

  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  showFortuneWheel: boolean = false;
  wheelPrizes: Prize[] = [
    { id: '1', name: '3 Tiradas Gratis', color: '#4ecdc4', icon: '🎲' },
    { id: '2', name: '1 Consulta Gratis', color: '#45b7d1', icon: '🔮' },
    { id: '3', name: '2 Tiradas Extra', color: '#ffeaa7', icon: '🎯' },
    { id: '4', name: '¡Inténtalo otra vez!', color: '#ff7675', icon: '🔄' },
  ];
  private wheelTimer: any;

  //Datos para enviar
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
  hasUserPaidForDreams: boolean = false;
  firstQuestionAsked: boolean = false;

  // NUEVA PROPIEDAD para controlar mensajes bloqueados
  blockedMessageId: string | null = null;

  textareaHeight: number = 25; // Altura inicial
  private readonly minTextareaHeight = 45;
  private readonly maxTextareaHeight = 120;

  // Configuración de Stripe
  private stripePublishableKey =
    'pk_live_51ROf7JKaf976EMQYuG2XY0OwKWFcea33O5WxIDBKEeoTDqyOUgqmizQ2knrH6MCnJlIoDQ95HJrRhJaL0jjpULHj00sCSWkBw6';
  private backendUrl = environment.apiUrl;

  interpreterData: DreamInterpreterData = {
    name: 'Maestra Alma',
    specialty: 'Interpretación de sueños y simbolismo onírico',
    experience: 'Siglos interpretando los mensajes del subconsciente',
  };

  // Frases de bienvenida aleatorias
  welcomeMessages = [
    'Ah, veo que has venido a mí buscando desentrañar los misterios de tu mundo onírico... Los sueños son ventanas al alma. Cuéntame, ¿qué visiones te han visitado?',
    'Las energías cósmicas me susurran que tienes sueños que necesitan interpretación. Soy Maestra Alma, guardiana de los secretos oníricos. ¿Qué mensaje del subconsciente te inquieta?',
    'Bienvenido, viajero de los sueños. Los planos astrales me han mostrado tu llegada. Permíteme guiarte a través de los símbolos y misterios de tus visiones nocturnas.',
    'El cristal de los sueños se ilumina ante tu presencia... Siento que portas visiones que necesitan ser descifradas. Confía en mi sabiduría ancestral y comparte conmigo tus sueños.',
  ];

  constructor(
    private dreamService: InterpretadorSuenosService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError =
        'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    this.hasUserPaidForDreams =
      sessionStorage.getItem('hasUserPaidForDreams') === 'true';

    const savedMessages = sessionStorage.getItem('dreamMessages');
    const savedFirstQuestion = sessionStorage.getItem('firstQuestionAsked');
    const savedBlockedMessageId = sessionStorage.getItem('blockedMessageId');

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp), // Convertir string a Date
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
        console.log('✅ Mensajes restaurados desde sessionStorage');
      } catch (error) {
        console.error('Error al restaurar mensajes:', error);
        // Si hay error, limpiar y empezar de nuevo
        this.clearSessionData();
        this.startConversation();
      }
    } else {
      // Si no hay mensajes guardados, iniciar conversación
      this.startConversation();
    }
    // ✅ NUEVO: Verificar URL para pagos exitosos
    this.checkPaymentStatus();
  }
  // ...existing code...

  showWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    console.log('⏰ Timer configurado para', delayMs, 'ms');

    this.wheelTimer = setTimeout(() => {
      console.log('🎰 Verificando si puede mostrar ruleta...');

      // ✅ USAR MÉTODO ESTÁTICO DEL COMPONENTE RULETA
      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        console.log('✅ Mostrando ruleta - usuario puede girar');
        this.showFortuneWheel = true;
      } else {
        console.log('❌ No se puede mostrar ruleta en este momento');
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    console.log('🎉 Premio ganado:', prize);

    // Mostrar mensaje del intérprete sobre el premio
    const prizeMessage: ConversationMessage = {
      role: 'interpreter',
      message: `🎉 ¡Las energías cósmicas te han bendecido! Has ganado: **${prize.name}** ${prize.icon}\n\nEste regalo del universo ha sido activado para ti. Los misterios de los sueños se revelan ante ti con mayor claridad. ¡Que la fortuna te acompañe en tus próximas consultas!`,
      timestamp: new Date(),
    };

    this.messages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();
  }

  // Cerrar la ruleta
  onWheelClosed(): void {
    this.showFortuneWheel = false;
  }

  private checkPaymentStatus(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get(
      'payment_intent_client_secret'
    );

    if (paymentIntent && paymentIntentClientSecret && this.stripe) {
      console.log('🔍 Verificando estado del pago...');

      this.stripe
        .retrievePaymentIntent(paymentIntentClientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent) {
            switch (paymentIntent.status) {
              case 'succeeded':
                console.log('✅ Pago confirmado desde URL');
                this.hasUserPaidForDreams = true;
                sessionStorage.setItem('hasUserPaidForDreams', 'true');
                this.blockedMessageId = null;
                sessionStorage.removeItem('blockedMessageId');

                // Limpiar URL
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );

                // Agregar mensaje de confirmación si no existe
                const lastMessage = this.messages[this.messages.length - 1];
                if (
                  !lastMessage ||
                  !lastMessage.message.includes('¡Pago confirmado!')
                ) {
                  const confirmationMsg: ConversationMessage = {
                    role: 'interpreter',
                    message:
                      '✨ ¡Pago confirmado! Ahora puedes interpretar todos los sueños que desees. Los misterios oníricos están a tu disposición. ¿Qué otro sueño te gustaría que analice?',
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
        .catch((error) => {
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
    const threshold = 50; // píxeles desde el bottom
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      threshold;
    this.shouldAutoScroll = isNearBottom;
  }
  ngOnDestroy(): void {
    // Limpiar timer de la ruleta
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    // Código existente...
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
  triggerFortuneWheel(): void {
    console.log('🎰 Intentando activar ruleta manualmente...');

    if (this.showPaymentModal || this.showDataModal) {
      console.log('❌ No se puede mostrar - hay otros modales abiertos');
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      console.log('✅ Activando ruleta manualmente');
      this.showFortuneWheel = true;
    } else {
      console.log('❌ No se puede activar ruleta - sin tiradas disponibles');
      alert(
        'No tienes tiradas disponibles. ' +
          FortuneWheelComponent.getSpinStatus()
      );
    }
  }
  getSpinStatus(): string {
    return FortuneWheelComponent.getSpinStatus();
  }
  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  startConversation(): void {
    // Solo agregar mensaje de bienvenida si no hay mensajes
    if (this.messages.length === 0) {
      const randomWelcome =
        this.welcomeMessages[
          Math.floor(Math.random() * this.welcomeMessages.length)
        ];

      const welcomeMessage: ConversationMessage = {
        role: 'interpreter',
        message: randomWelcome,
        timestamp: new Date(),
      };

      this.messages.push(welcomeMessage);
    }
    this.hasStartedConversation = true;

    // ✅ VERIFICACIÓN SIMPLIFICADA
    if (FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(3000);
    } else {
      console.log('🚫 No se puede mostrar ruleta - sin tiradas disponibles');
    }
  }

  sendMessage(): void {
    if (this.messageText?.trim() && !this.isLoading) {
      const userMessage = this.messageText.trim();

      // ✅ NUEVA LÓGICA: Verificar premios disponibles ANTES de bloquear
      if (!this.hasUserPaidForDreams && this.firstQuestionAsked) {
        // Verificar si tiene consultas gratis disponibles
        if (this.hasFreeConsultationsAvailable()) {
          console.log('🎁 Usando consulta gratis del premio');
          this.useFreeConsultation();
          // Continuar con el mensaje sin bloquear
        } else {
          // Si no tiene consultas gratis, mostrar modal de datos PRIMERO
          console.log('💳 No hay consultas gratis - mostrando modal de datos');

          // ✅ Cerrar otros modales primero
          this.showFortuneWheel = false;
          this.showPaymentModal = false;

          // ✅ Guardar el mensaje para procesarlo después del pago
          sessionStorage.setItem('pendingUserMessage', userMessage);

          this.saveStateBeforePayment();

          // ✅ Mostrar modal de datos con timeout para asegurar el cambio
          setTimeout(() => {
            this.showDataModal = true;
            console.log('📝 showDataModal establecido a:', this.showDataModal);
          }, 100);

          return; // ✅ Salir aquí para no procesar el mensaje aún
        }
      }

      // ✅ ACTIVAR AUTO-SCROLL cuando se envía un mensaje
      this.shouldAutoScroll = true;

      // ✅ Procesar el mensaje normalmente
      this.processUserMessage(userMessage);
    }
  }
  private processUserMessage(userMessage: string): void {
  const userMsg: ConversationMessage = {
    role: 'user',
    message: userMessage,
    timestamp: new Date(),
  };
  this.messages.push(userMsg);

  this.saveMessagesToSession();
  this.messageText = '';
  this.isTyping = true;
  this.isLoading = true;

  const conversationHistory = this.messages.slice(0, -1);

  this.dreamService
    .chatWithInterpreter({
      interpreterData: this.interpreterData,
      userMessage: userMessage,
      conversationHistory: conversationHistory,
    })
    .subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.isTyping = false;

        if (response.success && response.response) {
          const messageId = Date.now().toString();

          const interpreterMsg: ConversationMessage = {
            role: 'interpreter',
            message: response.response,
            timestamp: new Date(),
            id: messageId,
          };
          this.messages.push(interpreterMsg);

          this.shouldAutoScroll = true;

          // ✅ ACTUALIZADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
          if (
            this.firstQuestionAsked &&
            !this.hasUserPaidForDreams &&
            !this.hasFreeConsultationsAvailable()
          ) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('blockedMessageId', messageId);

            // ✅ CAMBIO: Mostrar modal de datos en lugar de ir directo al pago
            setTimeout(() => {
              console.log('🔒 Mensaje bloqueado - mostrando modal de datos');
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
            sessionStorage.setItem('firstQuestionAsked', 'true');
          }

          this.saveMessagesToSession();
        } else {
          this.handleError('Error al obtener respuesta del intérprete');
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.isTyping = false;
        console.error('Error:', error);
        this.handleError(
          'Error de conexión. Por favor, inténtalo de nuevo.'
        );
      },
    });
}
  // ✅ NUEVO: Verificar si tiene consultas gratis disponibles
  private hasFreeConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );

    console.log(
      '🔍 Verificando consultas gratis disponibles:',
      freeConsultations
    );
    console.log(
      '🔍 Estado actual - hasUserPaidForDreams:',
      this.hasUserPaidForDreams
    );
    console.log(
      '🔍 Estado actual - firstQuestionAsked:',
      this.firstQuestionAsked
    );

    return freeConsultations > 0;
  }

  // ✅ NUEVO: Usar una consulta gratis
  private useFreeConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem('freeConsultations', remaining.toString());
      console.log(`🎁 Consulta gratis usada. Restantes: ${remaining}`);

      // Mostrar mensaje informativo
      const prizeMsg: ConversationMessage = {
        role: 'interpreter',
        message: `✨ *Has usado una consulta gratis* ✨\n\nTe quedan **${remaining}** consultas gratis disponibles.`,
        timestamp: new Date(),
      };
      this.messages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  // ✅ NUEVO: Mostrar mensaje cuando se usa un premio
  private showPrizeUsageMessage(): void {
    const prizeMsg: ConversationMessage = {
      role: 'interpreter',
      message:
        '✨ *Has usado una de tus recompensas místicas ganadas en la ruleta* ✨\n\nLas energías cósmicas fluyen a tu favor. ¡Continúa con tu consulta!',
      timestamp: new Date(),
    };

    this.messages.push(prizeMsg);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();
  }

  // ✅ NUEVO: Obtener resumen de premios disponibles
  getPrizesAvailable(): string {
    const prizes: string[] = [];

    const freeConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );
    if (freeConsultations > 0) {
      prizes.push(
        `${freeConsultations} consulta${
          freeConsultations > 1 ? 's' : ''
        } gratis`
      );
    }

    const freeInterpretations = parseInt(
      sessionStorage.getItem('freeInterpretations') || '0'
    );
    if (freeInterpretations > 0) {
      prizes.push(
        `${freeInterpretations} interpretación${
          freeInterpretations > 1 ? 'es' : ''
        } gratis`
      );
    }

    if (sessionStorage.getItem('hasVIPConsultation') === 'true') {
      prizes.push('1 consulta VIP');
    }

    if (sessionStorage.getItem('hasPremiumReading') === 'true') {
      prizes.push('1 lectura premium');
    }

    if (sessionStorage.getItem('hasMysticBonus') === 'true') {
      prizes.push('Bonus místico activo');
    }

    return prizes.length > 0 ? prizes.join(', ') : 'Ninguna';
  }

  private saveStateBeforePayment(): void {
    console.log('💾 Guardando estado antes del pago...');
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'firstQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem('blockedMessageId', this.blockedMessageId);
    }
  }

  // ✅ ARREGLO: Método para guardar mensajes corregido
  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.messages.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem('dreamMessages', JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error guardando mensajes:', error);
    }
  }

  // ✅ NUEVO: Método para limpiar datos de sesión
  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForDreams');
    sessionStorage.removeItem('dreamMessages');
    sessionStorage.removeItem('firstQuestionAsked');
    sessionStorage.removeItem('blockedMessageId');
  }

  // MÉTODO PARA VERIFICAR SI UN MENSAJE ESTÁ BLOQUEADO
  isMessageBlocked(message: ConversationMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaidForDreams;
  }

  async promptForPayment(): Promise<void> {
    console.log('💳 EJECUTANDO promptForPayment()');

    this.showPaymentModal = true;
    this.paymentError = null;
    this.isProcessingPayment = true;

    // Destruir elemento anterior si existe
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error destruyendo elemento anterior:', error);
      }
      this.paymentElement = undefined;
    }

    try {
      const items = [{ id: 'dreams_interpretation_unlimited', amount: 500 }];
      console.log('📤 Enviando request de payment intent...');

      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          { items }
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
          appearance: { theme: 'stripe' },
        });
        this.paymentElement = this.elements.create('payment');

        // Cambiar isProcessingPayment a false ANTES de buscar el contenedor
        this.isProcessingPayment = false;

        // Pequeña espera para que Angular actualice el DOM
        setTimeout(() => {
          const paymentElementContainer = document.getElementById(
            'payment-element-container'
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
          console.log('¡Pago exitoso para interpretación de sueños!');
          this.hasUserPaidForDreams = true;
          sessionStorage.setItem('hasUserPaidForDreams', 'true');
          this.showPaymentModal = false;
          this.paymentElement?.destroy();

          this.blockedMessageId = null;
          sessionStorage.removeItem('blockedMessageId');

          const confirmationMsg: ConversationMessage = {
            role: 'interpreter',
            message:
              '✨ ¡Pago confirmado! Ahora puedes interpretar todos los sueños que desees. Los misterios oníricos están a tu disposición. ¿Qué otro sueño te gustaría que analice?',
            timestamp: new Date(),
          };
          this.messages.push(confirmationMsg);

          // ✅ ACTIVAR AUTO-SCROLL para mensaje de confirmación
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
  // Método para nueva consulta (resetear solo si no ha pagado)
  newConsultation(): void {
    // ✅ RESETEAR CONTROL DE SCROLL
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForDreams) {
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('dreamMessages');
      sessionStorage.removeItem('firstQuestionAsked');
      sessionStorage.removeItem('blockedMessageId');
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
      role: 'interpreter',
      message: `🔮 Las energías cósmicas están perturbadas... ${errorMessage} Intenta nuevamente cuando las vibraciones se estabilicen.`,
      timestamp: new Date(),
    };
    this.messages.push(errorMsg);

    // ✅ ACTIVAR AUTO-SCROLL para mensajes de error
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

  // Actualizar el método onKeyPress
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.messageText?.trim() && !this.isLoading) {
        this.sendMessage();
        // Resetear altura del textarea después del envío
        setTimeout(() => {
          this.textareaHeight = this.minTextareaHeight;
        }, 50);
      }
    }
  }

  getTimeString(timestamp: Date | string): string {
    try {
      // Si es string, convertir a Date
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      // Verificar que sea una fecha válida
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
          this.promptForPayment();
        }, 300);
      },
      error: (error) => {
        console.error('❌ Error enviando datos:', error);
        // Aún así proceder al pago, pero mostrar advertencia
        alert(
          'Hubo un problema guardando los datos, pero puedes continuar con el pago.'
        );
        setTimeout(() => {
          this.promptForPayment();
        }, 300);
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
  }
}
