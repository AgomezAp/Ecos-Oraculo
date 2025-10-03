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
    importe: 4.0,
    email: '',
    telefono: '',
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

    console.log('🔍 Validando userData:', this.userData); // DEBUG

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.userData.email || !this.userData.email.toString().trim()) {
      this.dataFormErrors['email'] = 'El email es obligatorio';
      isValid = false;
    } else if (!emailRegex.test(this.userData.email.toString().trim())) {
      this.dataFormErrors['email'] = 'Ingresa un email válido';
      isValid = false;
    }

    // Validar nombre
    if (!this.userData.nombre || !this.userData.nombre.toString().trim()) {
      this.dataFormErrors['nombre'] = 'El nombre es obligatorio';
      isValid = false;
    } else if (this.userData.nombre.toString().trim().length < 2) {
      this.dataFormErrors['nombre'] =
        'El nombre debe tener al menos 2 caracteres';
      isValid = false;
    }

    // Validar apellido
    if (!this.userData.apellido || !this.userData.apellido.toString().trim()) {
      this.dataFormErrors['apellido'] = 'El apellido es obligatorio';
      isValid = false;
    } else if (this.userData.apellido.toString().trim().length < 2) {
      this.dataFormErrors['apellido'] =
        'El apellido debe tener al menos 2 caracteres';
      isValid = false;
    }

    // ❌ COMENTADO - Validar país
    // if (!this.userData.pais || !this.userData.pais.toString().trim()) {
    //   this.dataFormErrors['pais'] = 'Selecciona tu país';
    //   isValid = false;
    // }

    // ✅ Validar teléfono
    if (!this.userData.telefono || !this.userData.telefono.toString().trim()) {
      this.dataFormErrors['telefono'] = 'El teléfono es obligatorio';
      console.log('❌ Teléfono vacío o no existe');
      isValid = false;
    } else if (this.userData.telefono.toString().trim().length < 9) {
      this.dataFormErrors['telefono'] =
        'El teléfono debe tener al menos 9 dígitos';
      console.log(
        '❌ Teléfono muy corto:',
        this.userData.telefono.toString().trim().length
      );
      isValid = false;
    } else {
      console.log(
        '✅ Teléfono válido:',
        this.userData.telefono.toString().trim()
      );
    }

    // ❌ COMENTADO - Validar dirección
    // if (!this.userData.direccion || !this.userData.direccion.toString().trim()) {
    //   this.dataFormErrors['direccion'] = 'La dirección es obligatoria';
    //   isValid = false;
    // }

    // ❌ COMENTADO - Validar código postal
    // if (!this.userData.codigo_postal || !this.userData.codigo_postal.toString().trim()) {
    //   this.dataFormErrors['codigo_postal'] = 'El código postal es obligatorio';
    //   isValid = false;
    // }

    // ❌ COMENTADO - Validar ciudad
    // if (!this.userData.ciudad || !this.userData.ciudad.toString().trim()) {
    //   this.dataFormErrors['ciudad'] = 'La ciudad es obligatoria';
    //   isValid = false;
    // }

    // ❌ COMENTADO - Validar NIF o Pasaporte
    // const nif = this.userData.NIF ? this.userData.NIF.toString().trim() : '';
    // const pasaporte = this.userData.numero_pasapote ? this.userData.numero_pasapote.toString().trim() : '';
    //
    // if (!nif && !pasaporte) {
    //   this.dataFormErrors['NIF'] = 'Debes proporcionar NIF o número de pasaporte';
    //   this.dataFormErrors['numero_pasapote'] = 'Debes proporcionar NIF o número de pasaporte';
    //   isValid = false;
    // }

    console.log('🔍 Resultado de validación:', {
      isValid,
      errores: this.dataFormErrors,
    });

    return isValid;
  }

  // ✅ Método para verificar errores
  hasError(field: string): boolean {
    return this.attemptedDataSubmission && !!this.dataFormErrors[field];
  }

  async submitUserData(): Promise<void> {
    console.log('🔍 Iniciando submitUserData...'); // DEBUG
    console.log('🔍 Estado actual de userData:', this.userData); // DEBUG EXTRA

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
      // ✅ LIMPIAR Y NORMALIZAR DATOS ANTES DE ENVIAR
      const datosToSend: Datos = {
        NIF: '', // ❌ Campo comentado - enviar vacío
        numero_pasapote: '', // ❌ Campo comentado - enviar vacío
        pais: '', // ❌ Campo comentado - enviar vacío
        nombre: (this.userData.nombre || '').toString().trim(),
        apellido: (this.userData.apellido || '').toString().trim(),
        direccion: '', // ❌ Campo comentado - enviar vacío
        calle: '', // ❌ Campo comentado - enviar vacío
        codigo_postal: '', // ❌ Campo comentado - enviar vacío
        ciudad: '', // ❌ Campo comentado - enviar vacío
        provincia: '', // ❌ Campo comentado - enviar vacío
        comunidad_autonoma: '', // ❌ Campo comentado - enviar vacío
        importe: this.userData.importe || 5.0,
        email: (this.userData.email || '').toString().trim(),
        telefono: (this.userData.telefono || '').toString().trim(),
      };
      /*    const datosToSend: Datos = {
        NIF: (this.userData.NIF || '').toString().trim(),
        numero_pasapote: (this.userData.numero_pasapote || '')
          .toString()
          .trim(),
        pais: (this.userData.pais || '').toString().trim(),
        nombre: (this.userData.nombre || '').toString().trim(),
        apellido: (this.userData.apellido || '').toString().trim(),
        direccion: (this.userData.direccion || '').toString().trim(),
        calle: (this.userData.calle || '').toString().trim(),
        codigo_postal: (this.userData.codigo_postal || '').toString().trim(),
        ciudad: (this.userData.ciudad || '').toString().trim(),
        provincia: (this.userData.provincia || '').toString().trim(),
        comunidad_autonoma: (this.userData.comunidad_autonoma || '')
          .toString()
          .trim(),
        importe: this.userData.importe || 5.0,
        email: (this.userData.email || '').toString().trim(),
        telefono: (this.userData.telefono || '').toString().trim(), // ✅ ASEGURAR que telefono sea string
      }; */

      console.log('📤 Datos a enviar (limpios):', datosToSend); // DEBUG
      console.log('📞 Teléfono específico:', {
        original: this.userData.telefono,
        limpio: datosToSend.telefono,
        longitud: datosToSend.telefono.length,
      }); // DEBUG TELÉFONO

      // ✅ VALIDAR UNA VEZ MÁS LOS CAMPOS CRÍTICOS
      const camposCriticos = ['nombre', 'apellido', 'email', 'telefono'];
      const faltantes = camposCriticos.filter(
        (campo) => !datosToSend[campo as keyof Datos]
      );

      if (faltantes.length > 0) {
        console.error(
          '❌ Faltan campos críticos después de la limpieza:',
          faltantes
        );
        this.dataFormErrors[
          'general'
        ] = `Faltan campos obligatorios: ${faltantes.join(', ')}`;
        this.isValidatingData = false;
        return;
      }

      // Guardar en sessionStorage
      sessionStorage.setItem('userData', JSON.stringify(datosToSend));
      console.log('💾 Datos guardados en sessionStorage');

      // Verificar que se guardaron correctamente
      const verificacion = sessionStorage.getItem('userData');
      const datosGuardados = verificacion ? JSON.parse(verificacion) : null;
      console.log('🔍 Verificación sessionStorage:', datosGuardados);
      console.log('📞 Teléfono en sessionStorage:', datosGuardados?.telefono);

      // Llamar al servicio
      this.recolecta.createProduct(datosToSend).subscribe({
        next: (response: Datos) => {
          console.log('✅ Respuesta del backend:', response); // DEBUG
          this.isValidatingData = false;
          this.onDataSubmitted.emit(datosToSend); // ✅ EMITIR datosToSend en lugar de response
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

          // ✅ AUN ASÍ EMITIR LOS DATOS PARA CONTINUAR CON EL PAGO
          console.log(
            '⚠️ Error del backend, pero continuando con los datos locales'
          );
          this.isValidatingData = false;
          this.onDataSubmitted.emit(datosToSend); // ✅ EMITIR datos locales
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
