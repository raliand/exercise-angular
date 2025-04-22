import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoginFlowComponent } from './login-flow.component';

@Component({
  selector: 'app-login-page',
  template: `
    @defer {
      <section class="flex justify-center w-full h-screen bg-gray-100">
        <app-login-flow />
      </section>
    } @loading (after 80ms) {
      <mat-progress-bar mode="indeterminate" />
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressBarModule, LoginFlowComponent],
})
export class LoginPageComponent { }
