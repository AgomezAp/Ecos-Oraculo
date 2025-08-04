import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
export interface Prize {
  id: string;
  name: string;
  color: string;
  textColor?: string;
  icon?: string;
}

@Component({
  selector: 'app-fortune-wheel',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './fortune-wheel.component.html',
  styleUrl: './fortune-wheel.component.css',
})
export class FortuneWheelComponent implements OnInit, OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() prizes: Prize[] = [
    { id: '1', name: '3 Tiradas Gratis', color: '#4ecdc4', icon: '🎲' },
    { id: '2', name: '1 Consulta Gratis', color: '#45b7d1', icon: '🔮' },
    { id: '3', name: '2 Tiradas Extra', color: '#ffeaa7', icon: '🎯' },
    { id: '4', name: '¡Inténtalo otra vez!', color: '#ff7675', icon: '🔄' },
  ];

  @Output() onPrizeWon = new EventEmitter<Prize>();
  @Output() onWheelClosed = new EventEmitter<void>();

  @ViewChild('wheelElement') wheelElement!: ElementRef;

  // ✅ PROPIEDADES PARA LA RULETA
  segmentAngle: number = 0;
  currentRotation: number = 0;
  isSpinning: boolean = false;
  selectedPrize: Prize | null = null;
  wheelSpinning: boolean = false;

  // ✅ PROPIEDADES PARA CONTROL DE SPINS
  canSpinWheel: boolean = true;
  hasUsedFreeSpinToday: boolean = false;
  nextFreeSpinTime: Date | null = null;
  spinCooldownTimer: any;

  ngOnInit() {
    this.segmentAngle = 360 / this.prizes.length;
    this.checkSpinAvailability();
    this.startSpinCooldownTimer();
  }

  ngOnDestroy(): void {
    if (this.spinCooldownTimer) {
      clearInterval(this.spinCooldownTimer);
    }
  }

  // ✅ MÉTODO PRINCIPAL PARA VERIFICAR SI PUEDE MOSTRAR LA RULETA
  static canShowWheel(): boolean {
    const freeSpins = parseInt(sessionStorage.getItem('freeSpins') || '0');
    const lastSpinDate = sessionStorage.getItem('lastSpinDate');
    const today = new Date().toDateString();

    // Tiene spins extras
    if (freeSpins > 0) {
      return true;
    }

    // Usuario nuevo (no ha girado nunca)
    if (!lastSpinDate) {
      return true;
    }

    // Ya usó su giro diario gratuito
    if (lastSpinDate === today) {
      return false;
    }

    // Nuevo día - puede usar giro gratuito
    return true;
  }

  // ✅ MÉTODO ESTÁTICO PARA VERIFICAR DESDE OTROS COMPONENTES
  static getSpinStatus(): string {
    const freeSpins = parseInt(sessionStorage.getItem('freeSpins') || '0');
    const lastSpinDate = sessionStorage.getItem('lastSpinDate');
    const today = new Date().toDateString();

    if (freeSpins > 0) {
      return `${freeSpins} tiradas extra disponibles`;
    }

    if (!lastSpinDate) {
      return 'Tirada gratuita disponible (usuario nuevo)';
    }

    if (lastSpinDate !== today) {
      return 'Tirada gratuita diaria disponible';
    }

    return 'Sin tiradas disponibles';
  }

  // ✅ VERIFICAR DISPONIBILIDAD DE SPINS
  checkSpinAvailability(): void {
    const lastSpinDate = sessionStorage.getItem('lastSpinDate');
    const today = new Date().toDateString();
    const freeSpins = parseInt(sessionStorage.getItem('freeSpins') || '0');

    if (!lastSpinDate) {
      console.log('🆕 Usuario nuevo - permitir primer giro');
      this.canSpinWheel = true;
      this.hasUsedFreeSpinToday = false;
      return;
    }

    // Verificar si ya giró hoy
    if (lastSpinDate === today) {
      this.hasUsedFreeSpinToday = true;
      this.canSpinWheel = freeSpins > 0; // Solo puede girar si tiene spins extras
    } else {
      this.hasUsedFreeSpinToday = false;
      this.canSpinWheel = true; // Nuevo día, puede usar giro gratuito
    }

    // Verificar cooldown solo si no tiene spins extras
    if (freeSpins === 0) {
      const lastSpinTime = sessionStorage.getItem('lastSpinTime');
      if (lastSpinTime && lastSpinDate === today) {
        const timeSince = Date.now() - parseInt(lastSpinTime);
        const cooldownMs = 24 * 60 * 60 * 1000;

        if (timeSince < cooldownMs) {
          this.canSpinWheel = false;
          this.nextFreeSpinTime = new Date(parseInt(lastSpinTime) + cooldownMs);
        }
      }
    }

    console.log('🎰 Estado de spins:', {
      canSpinWheel: this.canSpinWheel,
      hasUsedFreeSpinToday: this.hasUsedFreeSpinToday,
      freeSpins: freeSpins,
      lastSpinDate: lastSpinDate,
      today: today,
    });
  }

  // ✅ GIRAR LA RULETA
  spinWheel() {
    if (!this.canSpinWheel || this.wheelSpinning || this.isSpinning) {
      console.log('❌ No se puede girar la ruleta ahora');
      return;
    }

    console.log('🎰 Iniciando giro de ruleta...');

    // Bloquear inmediatamente
    this.wheelSpinning = true;
    this.isSpinning = true;
    this.canSpinWheel = false;

    // Manejar uso de spins
    this.handleSpinUsage();

    // Rotación aleatoria
    const minSpins = 6;
    const maxSpins = 10;
    const randomSpins = Math.random() * (maxSpins - minSpins) + minSpins;
    const finalRotation = randomSpins * 360;

    // ✅ Determinar premio ganado INMEDIATAMENTE
    const wonPrize = this.determineWonPrize();
    console.log('🎁 Premio determinado:', wonPrize); // Debug

    this.currentRotation += finalRotation;

    // ✅ Animación de 3 segundos con mejor manejo
    setTimeout(() => {
      console.log('⏰ Finalizando animación...'); // Debug

      this.wheelSpinning = false;
      this.isSpinning = false;
      this.selectedPrize = wonPrize; // ✅ Establecer premio

      console.log('🏆 Premio seleccionado:', this.selectedPrize); // Debug

      // Procesar premio
      this.processPrizeWon(wonPrize);

      // Actualizar disponibilidad
      this.updateSpinAvailability(wonPrize);

      // Emitir evento al componente padre
      this.onPrizeWon.emit(wonPrize);

      // ✅ Forzar detección de cambios
      setTimeout(() => {
        console.log('🔄 Estado final - selectedPrize:', this.selectedPrize);
      }, 100);
    }, 3000);
  }
  // ✅ MANEJAR USO DE SPINS
  private handleSpinUsage(): void {
    const freeSpins = this.getFreeSpinsCount();

    if (freeSpins > 0) {
      // Usar spin extra
      sessionStorage.setItem('freeSpins', (freeSpins - 1).toString());
      console.log(`🎁 Usado spin extra. Restantes: ${freeSpins - 1}`);
    } else {
      // Usar spin diario gratuito
      const today = new Date().toDateString();
      sessionStorage.setItem('lastSpinDate', today);
      sessionStorage.setItem('lastSpinTime', Date.now().toString());
      this.hasUsedFreeSpinToday = true;
    }
  }

  // ✅ DETERMINAR PREMIO GANADO
  private determineWonPrize(): Prize {
    const random = Math.random();

    if (random < 0.15) {
      return this.prizes[0]; // 15% - 3 Tiradas Gratis
    } else if (random < 0.35) {
      return this.prizes[1]; // 20% - 1 Consulta Gratis
    } else if (random < 0.5) {
      return this.prizes[2]; // 15% - 2 Tiradas Extra
    } else {
      return this.prizes[3]; // 50% - Inténtalo otra vez
    }
  }

  // ✅ PROCESAR PREMIO GANADO
  private processPrizeWon(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Tiradas Gratis
        this.grantFreeSpins(3);
        break;
      case '2': // 1 Consulta Gratis
        this.grantFreeConsultation(1);
        break;
      case '3': // 2 Tiradas Extra
        this.grantFreeSpins(2);
        break;
      case '4': // Inténtalo otra vez
        this.grantAnotherChance();
        break;
    }

    this.savePrizeToHistory(prize);
  }

  // ✅ OTORGAR SPINS GRATIS
  private grantFreeSpins(count: number): void {
    console.log(`✨ Otorgadas ${count} tiradas gratis`);
    const currentSpins = this.getFreeSpinsCount();
    sessionStorage.setItem('freeSpins', (currentSpins + count).toString());
  }

  // ✅ OTORGAR CONSULTA GRATIS
  private grantFreeConsultation(count: number): void {
    console.log(`🔮 Otorgadas ${count} consultas gratis`);
    const currentConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );
    sessionStorage.setItem(
      'freeConsultations',
      (currentConsultations + count).toString()
    );

    // Desbloquear mensaje si había uno bloqueado
    const blockedMessageId = sessionStorage.getItem('blockedMessageId');
    const hasUserPaid =
      sessionStorage.getItem('hasUserPaidForDreams') === 'true';

    if (blockedMessageId && !hasUserPaid) {
      console.log('🔓 Desbloqueando mensaje con consulta gratis ganada');
      sessionStorage.removeItem('blockedMessageId');
    }
  }

  // ✅ OTRA OPORTUNIDAD
  private grantAnotherChance(): void {
    console.log('🔄 Otra oportunidad otorgada');
    // Se maneja en updateSpinAvailability
  }

  // ✅ GUARDAR PREMIO EN HISTORIAL
  private savePrizeToHistory(prize: Prize): void {
    const prizeHistory = JSON.parse(
      sessionStorage.getItem('prizeHistory') || '[]'
    );
    prizeHistory.push({
      prize: prize,
      timestamp: new Date().toISOString(),
      claimed: true,
    });
    sessionStorage.setItem('prizeHistory', JSON.stringify(prizeHistory));
  }

  // ✅ ACTUALIZAR DISPONIBILIDAD DESPUÉS DEL GIRO
  private updateSpinAvailability(wonPrize: Prize): void {
    if (wonPrize.id === '4') {
      // "Inténtalo otra vez" - permitir otro giro inmediatamente
      console.log('🔄 Premio: Inténtalo otra vez - permitiendo otro giro');
      this.canSpinWheel = true;
      setTimeout(() => {
        if (FortuneWheelComponent.canShowWheel()) {
          // No cerramos el modal, permitimos otro giro
          this.selectedPrize = null;
        }
      }, 2000);
    } else {
      // Para otros premios, verificar disponibilidad
      const freeSpins = parseInt(sessionStorage.getItem('freeSpins') || '0');
      this.canSpinWheel = freeSpins > 0;

      console.log('🎁 Premio ganado. Spins restantes:', freeSpins);

      if (!this.canSpinWheel) {
        // No quedan más spins - establecer cooldown
        this.nextFreeSpinTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        this.startSpinCooldownTimer();
        console.log('⏰ No hay más spins. Próximo spin en 24 horas');
      }
    }
  }

  // ✅ TIMER PARA COOLDOWN
  startSpinCooldownTimer(): void {
    if (this.spinCooldownTimer) {
      clearInterval(this.spinCooldownTimer);
    }

    if (this.nextFreeSpinTime && !this.canSpinWheel) {
      this.spinCooldownTimer = setInterval(() => {
        const now = new Date().getTime();
        const timeLeft = this.nextFreeSpinTime!.getTime() - now;

        if (timeLeft <= 0) {
          this.canSpinWheel = true;
          this.nextFreeSpinTime = null;
          clearInterval(this.spinCooldownTimer);
        }
      }, 1000);
    }
  }

  // ✅ MÉTODOS AUXILIARES
  hasFreeSpinsAvailable(): boolean {
    return this.getFreeSpinsCount() > 0;
  }

  getFreeSpinsCount(): number {
    return parseInt(sessionStorage.getItem('freeSpins') || '0');
  }

  getTimeUntilNextSpin(): string {
    if (!this.nextFreeSpinTime) return '';

    const now = new Date().getTime();
    const timeLeft = this.nextFreeSpinTime.getTime() - now;

    if (timeLeft <= 0) return '';

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  // ✅ RECLAMAR PREMIO Y CERRAR
  claimPrize() {
    if (this.selectedPrize) {
      this.closeWheel();
    }
  }

  // ✅ CERRAR RULETA
  closeWheel() {
    this.onWheelClosed.emit();
    this.resetWheel();
  }

  // ✅ RESET WHEEL
  private resetWheel() {
    this.selectedPrize = null;
    this.wheelSpinning = false;
    this.isSpinning = false;
  }

  // ✅ MÉTODO PARA CERRAR DESDE TEMPLATE
  onWheelClosedHandler() {
    this.closeWheel();
  }
}
