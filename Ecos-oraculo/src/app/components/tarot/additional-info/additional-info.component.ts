import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatosService } from '../../../services/tarot/datos.service';
import { ParticlesComponent } from '../../../shared/particles/particles.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-additional-info',
  imports: [ParticlesComponent,FormsModule,CommonModule],
  templateUrl: './additional-info.component.html',
  styleUrl: './additional-info.component.css',

    animations: [
        trigger('fadeIn', [
          state('void', style({ opacity: 0 })),
          transition(':enter', [animate('1s ease-in', style({ opacity: 1 }))]),
        ]),
      ],
})
export class AdditionalInfoComponent implements OnInit  {
  countryCode: string = '';
  phone: string = '';
  nombreCliente: string = '';
  descriptionsText: string = '';  
  selectedCards: any[] = [];
  private encryptionKey = 'U0qQ0TGufDDJqCNvQS0b795q8EZPAp9E';
  termsAccepted: boolean = false;
  tema = localStorage.getItem('tema');
  recopila: any[] = [];
  Nombre: string = '';
  telefono: string = '';
  pais: string = '';
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private datosService: DatosService,

  ) {}

  ngOnInit(): void {
    const recopilaData = localStorage.getItem('selectedCards');
 
      if (recopilaData) {
        this.recopila = JSON.parse(recopilaData);
        console.log('Card Details:', this.recopila);
      }
  }

  submitPhone(): void {
    this.pais = this.countryCode;
    this.telefono = this.phone;
    this.Nombre = this.nombreCliente;
    const datos: any = {
      Nombre: this.Nombre,
      telefono: this.telefono,
      pais: this.pais,
    };
    this.datosService.registrar(datos).subscribe(
      (response) => {
        console.log('Datos enviados:', response);
      },
      (error) => {
        console.error('Error al enviar los datos:', error);
      }
    );
    const errorMessage = document.getElementById('errorMessage');
    const numErrorMessage = document.getElementById('numErrorMessage');
    if (!this.termsAccepted) {
      alert('Debes aceptar los términos y condiciones para continuar.');
      return;
    }
    if (isNaN(Number(this.phone))) {
      numErrorMessage?.classList.add('show');
      numErrorMessage?.classList.remove('none');
      return;
    } else {
      numErrorMessage?.classList.remove('show');
      numErrorMessage?.classList.add('none');
    }

    if (!this.countryCode) {
      errorMessage?.classList.add('show');
      errorMessage?.classList.remove('none');
      return;
    } else {
      errorMessage?.classList.remove('show');
      errorMessage?.classList.add('none');
    }

    if (this.phone) {
      document.getElementById('phoneContainer')?.classList.remove('show');
      setTimeout(() => {
        document.getElementById('phoneContainer')!.style.display = 'none';
        document.getElementById('thankYouMessage')!.style.display = 'block';
        document.getElementById('thankYouMessage')!.classList.add('show');
      }, 500);

      // Recopilar datos de las cartas seleccionadas
      const cardDetails = this.recopila.map(card => ({
        name: card.name,
        description: card.descriptions[0] // Asumiendo que solo hay una descripción por carta
      }));
     
      console.log('Card Details:', cardDetails);
      const nombreCliente = this.nombreCliente;
      const numeroCliente = `${this.countryCode}${this.phone}`;
      const numeroMaestro = '+34611317005';
      console.log(this.nombreCliente)
      const datosMod = {
        sessionId: '1234',
        nombreCliente: nombreCliente,
        phoneNumberCliente: numeroCliente,
        phoneNumberMaestro: numeroMaestro,
        nombreDelCliente: this.nombreCliente,
        message: `Nueva consulta de ${this.nombreCliente} (${numeroCliente}): Tema: ${this.tema}   \n\n${cardDetails.map(card => `Carta: ${card.name}, Descripción: ${card.description}`).join('\n')} \n\nPonte en contacto con el cliente:\n\nhttps://wa.me/${numeroCliente}`,
      };

      const url = 'https://gestor-de-mesajeria-via-whatsapp-g5hc.onrender.com/api/messages/CrearMensaje';
      this.http.post(url, datosMod).subscribe(
        (response) => {
          console.log('Respuesta del servidor:', response);
        },
        (error) => {
          console.error('Error al realizar el POST:', error);
        }
      );
      this.router.navigate(['/agradecimiento']);
    } else {
      alert('Por favor, ingresa tu número de teléfono.');
    }
  }

  
}