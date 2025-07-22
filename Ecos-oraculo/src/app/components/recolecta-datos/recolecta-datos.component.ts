import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecolectaService } from '../../services/recolecta.service';
import { Datos } from '../../interfaces/datos';

@Component({
  selector: 'app-recolecta-datos',
  imports: [CommonModule, FormsModule],
  templateUrl: './recolecta-datos.component.html',
  styleUrl: './recolecta-datos.component.css',
})
export class RecolectaDatosComponent {
  // ✅ Eventos de salida
  @Output() onDataSubmitted = new EventEmitter<any>();
  @Output() onModalClosed = new EventEmitter<void>();
  constructor(private recolecta: RecolectaService) {}
  // ✅ Propiedades de datos
  userData: any = {
    NIF: '',
    numero_pasapote: '',
    pais: '',
    nombre: '',
    apellido: '',
    direccion: '',
    calle: '',
    codigo_postal: '',
    ciudad: '',
    provincia: '',
    comunidad_autonoma: '',
    importe: 5.0,
    email: '',
  };
  aceptaTerminos = false;
  showTerminosError = false;
  datosVeridicos = false;
  showDatosVeridicosError = false;
  emailNotifications = false;
  // ✅ Control de formulario
  dataFormErrors: { [key: string]: string } = {};
  isValidatingData: boolean = false;
  attemptedDataSubmission: boolean = false;

  // ✅ Listas de opciones
  countries = [
    'España',
    'México',
    'Argentina',
    'Colombia',
    'Chile',
    'Perú',
    'Venezuela',
    'Ecuador',
    'Bolivia',
    'Paraguay',
    'Uruguay',
    'Costa Rica',
    'Panamá',
    'Nicaragua',
    'Honduras',
    'El Salvador',
    'Guatemala',
    'República Dominicana',
    'Cuba',
    'Puerto Rico',
    'Estados Unidos',
    'Canadá',
    'Brasil',
    'Francia',
    'Italia',
    'Alemania',
    'Reino Unido',
    'Portugal',
    'Otros',
  ];

  comunidadesAutonomas = [
    'Andalucía',
    'Aragón',
    'Asturias',
    'Baleares',
    'Canarias',
    'Cantabria',
    'Castilla-La Mancha',
    'Castilla y León',
    'Cataluña',
    'Comunidad Valenciana',
    'Extremadura',
    'Galicia',
    'Madrid',
    'Murcia',
    'Navarra',
    'País Vasco',
    'La Rioja',
  ];

  // ✅ Método para validar datos
  validateUserData(): boolean {
    this.dataFormErrors = {};
    let isValid = true;

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.userData.email.trim()) {
      this.dataFormErrors['email'] = 'El email es obligatorio';
      isValid = false;
    } else if (!emailRegex.test(this.userData.email)) {
      this.dataFormErrors['email'] = 'Ingresa un email válido';
      isValid = false;
    }

    // Validar nombre
    if (!this.userData.nombre.trim()) {
      this.dataFormErrors['nombre'] = 'El nombre es obligatorio';
      isValid = false;
    } else if (this.userData.nombre.trim().length < 2) {
      this.dataFormErrors['nombre'] =
        'El nombre debe tener al menos 2 caracteres';
      isValid = false;
    }

    // Validar apellido
    if (!this.userData.apellido.trim()) {
      this.dataFormErrors['apellido'] = 'El apellido es obligatorio';
      isValid = false;
    } else if (this.userData.apellido.trim().length < 2) {
      this.dataFormErrors['apellido'] =
        'El apellido debe tener al menos 2 caracteres';
      isValid = false;
    }

    // Validar país
    if (!this.userData.pais.trim()) {
      this.dataFormErrors['pais'] = 'Selecciona tu país';
      isValid = false;
    }

    // Validar dirección
    if (!this.userData.direccion.trim()) {
      this.dataFormErrors['direccion'] = 'La dirección es obligatoria';
      isValid = false;
    }

    // Validar código postal
    if (!this.userData.codigo_postal.trim()) {
      this.dataFormErrors['codigo_postal'] = 'El código postal es obligatorio';
      isValid = false;
    }

    // Validar ciudad
    if (!this.userData.ciudad.trim()) {
      this.dataFormErrors['ciudad'] = 'La ciudad es obligatoria';
      isValid = false;
    }

    // Validar NIF o Pasaporte (al menos uno)
    if (!this.userData.NIF.trim() && !this.userData.numero_pasapote.trim()) {
      this.dataFormErrors['NIF'] =
        'Debes proporcionar NIF o número de pasaporte';
      this.dataFormErrors['numero_pasapote'] =
        'Debes proporcionar NIF o número de pasaporte';
      isValid = false;
    }

    return isValid;
  }

  // ✅ Método para verificar errores
  hasError(field: string): boolean {
    return this.attemptedDataSubmission && !!this.dataFormErrors[field];
  }

  async submitUserData(): Promise<void> {
    console.log('🔍 Iniciando submitUserData...'); // DEBUG

    this.attemptedDataSubmission = true;

    // Validar formulario
    if (!this.validateUserData()) {
      console.log('❌ Validación fallida:', this.dataFormErrors); // DEBUG
      return;
    }

    // Validar términos y condiciones
    this.showTerminosError = false;
    this.showDatosVeridicosError = false;

    if (!this.aceptaTerminos) {
      this.showTerminosError = true;
      console.log('❌ Términos no aceptados'); // DEBUG
      return;
    }

    if (!this.datosVeridicos) {
      this.showDatosVeridicosError = true;
      console.log('❌ Datos verídicos no confirmados'); // DEBUG
      return;
    }

    this.isValidatingData = true;
    console.log('✅ Todas las validaciones pasaron, enviando datos...'); // DEBUG

    try {
      // Crear objeto según tu interfaz
      const datosToSend: Datos = {
        NIF: this.userData.NIF,
        numero_pasapote: this.userData.numero_pasapote,
        pais: this.userData.pais,
        nombre: this.userData.nombre,
        apellido: this.userData.apellido,
        direccion: this.userData.direccion,
        calle: this.userData.calle,
        codigo_postal: this.userData.codigo_postal,
        ciudad: this.userData.ciudad,
        provincia: this.userData.provincia,
        comunidad_autonoma: this.userData.comunidad_autonoma,
        importe: this.userData.importe,
        email: this.userData.email,
      };

      console.log('📤 Datos a enviar:', datosToSend); // DEBUG

      // Llamar al servicio
      this.recolecta.createProduct(datosToSend).subscribe({
        next: (response: Datos) => {
          console.log('✅ Respuesta del backend:', response); // DEBUG
          this.isValidatingData = false;
          this.onDataSubmitted.emit(response);
        },
        error: (error: any) => {
          console.error('❌ Error del backend:', error); // DEBUG
          console.error('❌ Error completo:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            error: error.error,
          });
          this.dataFormErrors['general'] =
            'Error al guardar los datos. Por favor, inténtalo de nuevo.';
          this.isValidatingData = false;
        },
      });
    } catch (error) {
      console.error('❌ Error inesperado:', error); // DEBUG
      this.dataFormErrors['general'] =
        'Error inesperado. Por favor, inténtalo de nuevo.';
      this.isValidatingData = false;
    }
  }

  cancelDataModal(): void {
    this.onModalClosed.emit();
  }
}
