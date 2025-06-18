import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ParticlesComponent } from '../../../shared/particles/particles.component';
import { CardService } from '../../../services/tarot/card.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-description',
  imports: [CommonModule, ParticlesComponent],
  templateUrl: './description.component.html',
  styleUrl: './description.component.css'
})
export class DescriptionComponent {
selectedCards: any[] = [];
  descriptionsText: string = '';
  countryCode: string = '';
  phone: string = '';
  nombreCliente: string = '';
  isPaid: boolean = false;
  showPopupFlag: boolean = false;
  private encryptionKey = 'U0qQ0TGufDDJqCNvQS0b795q8EZPAp9E';

  constructor(private cardService: CardService, private router: Router, private route: ActivatedRoute, private http: HttpClient,) { }

  ngOnInit(): void {
 /*    this.route.queryParams.subscribe((params: any) => {
      if (params['collection_status'] === 'approved') {
        this.isPaid = true;
        const encryptedData = localStorage.getItem('paymentData');
        if (encryptedData) {
          try {
            const bytes = CryptoJS.AES.decrypt(
              encryptedData,
              this.encryptionKey
            );
            const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            this.selectedCards = decryptedData.selectedCards || [];
          } catch (e) {
            console.error('Error al desencriptar los datos:', e);
          }
        }
      }
    }) */

    this.selectedCards = this.cardService.getSelectedCards();
    this.descriptionsText = this.selectedCards
      .map((card) => {
        if (card.descriptions && card.descriptions.length > 0) {
          const randomIndex = Math.floor(Math.random() * card.descriptions.length);
          return card.descriptions[randomIndex].trim();
        }
        return null;
      })
      .filter((description) => description)
      .map((description) => (description.endsWith(".") ? description : description + "."))
      .join("  "); // Concatenar descripciones
  /*   setTimeout(() => {
      if (!this.isPaid) {
        this.showSweetAlert();
      }
    }, 500); */
  }
/*   showSweetAlert(): void {
    Swal.fire({
      title: 'Para ver el contenido',
      text: 'Realiza una pequeña contribución, para ver lo que las cartas y los astros tienen para ti.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Realizar Pago',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.makePayment();
      }
    });
  } */

  showPopup(): void {
    this.router.navigate(['/informacion']);
  }

  closePopup(): void {
    this.showPopupFlag = false;
  }
 /*  makePayment(): void {
    // Guardar los datos en el almacenamiento local
    const paymentData = {
      descriptionsText: this.selectedCards,
      selectedCards: this.selectedCards,
    };
    console.log('Payment Data:', paymentData);
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(paymentData),
      this.encryptionKey
    ).toString();
    localStorage.setItem('paymentData', encryptedData);

    this.http
      .post<{ id: string }>('http://localhost:3010/create-order', {})
      .subscribe((response) => {
        const paymentUrl = `https://www.mercadopago.com.co/checkout/v1/redirect?preference-id=${response.id}`;
        window.location.href = paymentUrl;
      });
  } */
}
