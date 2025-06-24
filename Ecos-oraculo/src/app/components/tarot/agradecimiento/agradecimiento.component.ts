import { Component } from '@angular/core';
import { ParticlesComponent } from '../../../shared/particles/particles.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agradecimiento',
  imports: [],
  templateUrl: './agradecimiento.component.html',
  styleUrl: './agradecimiento.component.css'
})
export class AgradecimientoComponent {
 constructor(private router:Router) {}
  redirigir(){
    this.router.navigate(['/welcome']);
  }
}
