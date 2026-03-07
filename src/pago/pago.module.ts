import { Global, Module } from '@nestjs/common';
import { PagoService } from './pago.service';

@Global()
@Module({
  providers: [PagoService],
  exports: [PagoService],
})
export class PagoModule {}
