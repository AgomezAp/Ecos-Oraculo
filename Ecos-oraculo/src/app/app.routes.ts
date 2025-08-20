import { Routes } from '@angular/router';
import { BienvenidaComponent } from './components/bienvenida/bienvenida.component';
import { CalculadoraAmorComponent } from './components/calculadora-amor/calculadora-amor.component';
import { SignificadoSuenosComponent } from './components/significado-suenos/significado-suenos.component';
import { InformacionZodiacoComponent } from './components/informacion-zodiaco/informacion-zodiaco.component';
import { MapaVocacionalComponent } from './components/mapa-vocacional/mapa-vocacional.component';
import { AnimalInteriorComponent } from './components/animal-interior/animal-interior.component';
import { TablaNacimientoComponent } from './components/tabla-nacimiento/tabla-nacimiento.component';
import { ZodiacoChinoComponent } from './components/zodiaco-chino/zodiaco-chino.component';
import { LecturaNumerologiaComponent } from './components/lectura-numerologia/lectura-numerologia.component';
import { WelcomeComponent } from './components/tarot/welcome/welcome.component';
import { CardsComponent } from './components/tarot/cards/cards.component';
import { DescriptionComponent } from './components/tarot/description/description.component';
import { AdditionalInfoComponent } from './components/tarot/additional-info/additional-info.component';
import { ParticlesComponent } from './shared/particles/particles.component';
import { AgradecimientoComponent } from './components/tarot/agradecimiento/agradecimiento.component';
import { TerminosCondicionesComponent } from './components/tarot/terminos-condiciones/terminos-condiciones.component';
import { TerminosCondicionesEcos } from './components/terminos-condiciones/terminos-condiciones.component';
import { CookiesComponent } from './components/cookies/cookies.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'bienvenida',
    pathMatch: 'full',
  },
  {
    path: 'bienvenida',
    component: BienvenidaComponent,
  },
  {
    path: 'significado-sueños',
    component: SignificadoSuenosComponent,
  },
  {
    path: 'Informacion-zodiaco',
    component: InformacionZodiacoComponent,
  },
  {
    path: 'lectura-numerologia',
    component: LecturaNumerologiaComponent,
  },
  {
    path: 'mapa-vocacional',
    component: MapaVocacionalComponent,
  },
  {
    path: 'animal-interior',
    component: AnimalInteriorComponent,
  },
  {
    path: 'tabla-nacimiento',
    component: TablaNacimientoComponent,
  },
  {
    path: 'horoscopo',
    component: ZodiacoChinoComponent,
  },
  {
    path: 'calculadora-amor',
    component: CalculadoraAmorComponent,
  },
  {
    path: 'calculadora-amor',
    component: CalculadoraAmorComponent,
  },
  {
    path: 'lectura-tarot',
    component: WelcomeComponent,
  },
  {
    path: 'cartas/:theme',
    component: CardsComponent,
  },
  {
    path: 'descripcion-cartas',
    component: DescriptionComponent,
  },
  {
    path: 'informacion',
    component: AdditionalInfoComponent,
  },
  {
    path: 'particulas',
    component: ParticlesComponent,
  },
  {
    path: 'agradecimiento',
    component: AgradecimientoComponent,
  },
  {
    path: 'terminos-y-condiciones',
    component: TerminosCondicionesComponent,
  },
  {
    path:'terminos-condiciones-ecos',
    component: TerminosCondicionesEcos
  },
  {
    path:'politicas-cookies',
    component:CookiesComponent
  }
];
