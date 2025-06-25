import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bienvenida',
  imports: [MatIconModule],
  templateUrl: './bienvenida.component.html',
  styleUrl: './bienvenida.component.css',
})
export class BienvenidaComponent implements AfterViewInit {
  @ViewChild('backgroundVideo') backgroundVideo!: ElementRef<HTMLVideoElement>;
  constructor(private router: Router) {}
  ngAfterViewInit() {
    this.startVideo();
    const serviceCards = document.querySelectorAll('.service-card');

    serviceCards.forEach((card) => {
      const video = card.querySelector('.card-video') as HTMLVideoElement;

      if (video) {
        // Reproducir video en hover
        card.addEventListener('mouseenter', () => {
          video.play().catch((error) => {
            console.log('Error al reproducir video:', error);
          });
        });

        // Pausar video cuando el mouse sale
        card.addEventListener('mouseleave', () => {
          video.pause();
          video.currentTime = 0; // Reiniciar el video
        });
      }
    });
  }
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
  private startVideo() {
    if (this.backgroundVideo && this.backgroundVideo.nativeElement) {
      const video = this.backgroundVideo.nativeElement;

      // Asegurar que está silenciado
      video.muted = true;
      video.volume = 0;
      video.playbackRate = 0.8;
      // Intentar reproducir
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Video reproduciéndose automáticamente');
          })
          .catch((error) => {
            console.log(
              'Autoplay falló, intentando con interacción del usuario:',
              error
            );
            this.setupUserInteractionFallback();
          });
      }
    }
  }

  private setupUserInteractionFallback() {
    // Si el autoplay falla, reproduce el video con cualquier interacción del usuario
    const playOnInteraction = () => {
      if (this.backgroundVideo && this.backgroundVideo.nativeElement) {
        this.backgroundVideo.nativeElement.play();
        document.removeEventListener('click', playOnInteraction);
        document.removeEventListener('touchstart', playOnInteraction);
      }
    };

    document.addEventListener('click', playOnInteraction);
    document.addEventListener('touchstart', playOnInteraction);
  }
}
