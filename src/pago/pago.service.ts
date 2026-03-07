import { Injectable } from '@nestjs/common';

/** UC11 - Procesar pago. Backend llama al sistema de pago (simulado). */
@Injectable()
export class PagoService {
  async procesarPago(payload: {
    pedidoId: number;
    total: number;
    metodo: string;
  }): Promise<{ aprobado: boolean; referencia: string }> {
    await new Promise((r) => setTimeout(r, 50));
    return {
      aprobado: true,
      referencia: `pay-${payload.pedidoId}-${Date.now()}`,
    };
  }
}
