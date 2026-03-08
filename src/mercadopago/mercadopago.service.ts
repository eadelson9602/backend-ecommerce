import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Order, Payment, Preference } from 'mercadopago';

/** Detalle de un pago (para mostrar motivo de rechazo al usuario) */
export interface PaymentDetail {
  status?: string;
  status_detail?: string;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
}

/** Item para Checkout Pro (preferencia) */
export interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

/** Parámetros para crear preferencia (Checkout Pro) */
export interface CreatePreferenceParams {
  items: PreferenceItem[];
  external_reference: string;
  back_urls: { success: string; failure: string; pending: string };
  notification_url?: string;
  auto_return?: 'approved' | 'all';
}

/** Parámetros para crear una orden (Checkout API vía Orders) */
export interface CreateOrderParams {
  total_amount: number;
  token: string;
  payment_method_id: string;
  installments: number;
  payer: { email: string };
  external_reference: string;
  statement_descriptor?: string;
  issuer_id?: number;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig | null = null;
  private orderClient: Order | null = null;
  private paymentClient: Payment | null = null;
  private preferenceClient: Preference | null = null;

  private getConfig(): MercadoPagoConfig {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado.');
    if (!this.client) {
      this.client = new MercadoPagoConfig({ accessToken: token });
    }
    return this.client;
  }

  private getOrderClient(): Order {
    if (!this.orderClient) this.orderClient = new Order(this.getConfig());
    return this.orderClient;
  }

  private getPaymentClient(): Payment {
    if (!this.paymentClient) this.paymentClient = new Payment(this.getConfig());
    return this.paymentClient;
  }

  private getPreferenceClient(): Preference {
    if (!this.preferenceClient)
      this.preferenceClient = new Preference(this.getConfig());
    return this.preferenceClient;
  }

  /**
   * Crea una preferencia para Checkout Pro. El usuario es redirigido a init_point para pagar en Mercado Pago.
   */
  async createPreference(params: CreatePreferenceParams): Promise<{
    preferenceId: string;
    initPoint: string;
  }> {
    const backUrls = {
      success: String(params.back_urls.success ?? '').trim(),
      failure: String(params.back_urls.failure ?? '').trim(),
      pending: String(params.back_urls.pending ?? '').trim(),
    };
    if (!backUrls.success) {
      throw new Error(
        'back_urls.success es obligatorio para Checkout Pro (define MERCADOPAGO_SUCCESS_URL o MERCADOPAGO_FRONTEND_URL).',
      );
    }
    const body = {
      items: params.items.map((it) => ({
        id: it.id,
        title: it.title.substring(0, 256),
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
      })),
      external_reference: params.external_reference,
      back_urls: {
        success: backUrls.success,
        failure: backUrls.failure,
        pending: backUrls.pending,
      },
      ...(params.notification_url
        ? { notification_url: params.notification_url }
        : {}),
    };
    // No enviar auto_return: en algunos entornos la API exige back_url.success de forma estricta y falla.
    const res = await this.getPreferenceClient().create({
      body: body as Parameters<Preference['create']>[0]['body'],
    });
    const preferenceId = (res as { id?: string }).id ?? '';
    const initPoint =
      (res as { sandbox_init_point?: string }).sandbox_init_point ??
      (res as { init_point?: string }).init_point ??
      '';
    return { preferenceId, initPoint };
  }

  /** Extrae un mensaje legible de errores del SDK (evita "[object Object]"). */
  private getErrorMessage(err: unknown): string {
    if (err == null) return 'Error desconocido';
    if (typeof err === 'string') return err;
    if (typeof err === 'number' || typeof err === 'boolean') return String(err);
    if (typeof err !== 'object') return 'Error desconocido';
    const o = err as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === 'string' && msg) return msg;
    if (typeof msg === 'number') return String(msg);
    const cause = o.cause;
    if (cause != null) {
      let causeStr: string | null = null;
      if (typeof cause === 'string') causeStr = cause;
      else if (
        typeof cause === 'object' &&
        cause !== null &&
        'message' in cause
      ) {
        const m = (cause as { message?: unknown }).message;
        causeStr = typeof m === 'string' ? m : JSON.stringify(m);
      }
      if (causeStr && causeStr !== '[object Object]') return causeStr;
    }
    const response = o.response as Record<string, unknown> | undefined;
    const body = response?.data ?? response?.body;
    if (
      body &&
      typeof body === 'object' &&
      body !== null &&
      'message' in body
    ) {
      const bodyMsg = (body as { message?: unknown }).message;
      return typeof bodyMsg === 'string' ? bodyMsg : JSON.stringify(bodyMsg);
    }
    if (typeof msg === 'string' || typeof msg === 'number') return String(msg);
    return JSON.stringify(o).slice(0, 500) || 'Error desconocido';
  }

  /**
   * Crea una orden con Checkout API (Orders API). Tarjeta tokenizada.
   * Doc: https://www.mercadopago.com.co/developers/es/docs/checkout-api-orders/overview
   */
  async createOrder(params: CreateOrderParams): Promise<{
    orderId: string;
    paymentId?: string;
    status: string;
    status_detail?: string;
  }> {
    // Orders API: total_amount y amount deben ser string. Algunas regiones exigen entero sin decimales (ej. "129990").
    const amountNum = Number(params.total_amount);
    const amountStr = Number.isInteger(amountNum)
      ? String(amountNum)
      : String(amountNum.toFixed(2));
    // En sandbox MP exige email que contenga @testuser.com; usar MERCADOPAGO_TEST_PAYER_EMAIL si está definido.
    const payerEmail =
      process.env.MERCADOPAGO_TEST_PAYER_EMAIL?.trim() ||
      params.payer.email ||
      'test_user@testuser.com';
    const body = {
      type: 'online' as const,
      processing_mode: 'automatic' as const,
      total_amount: amountStr,
      external_reference: params.external_reference,
      payer: { email: payerEmail },
      transactions: {
        payments: [
          {
            amount: amountStr,
            payment_method: {
              id: params.payment_method_id,
              type: 'credit_card' as const,
              token: params.token,
              installments: Number(params.installments) || 1,
              ...(params.statement_descriptor
                ? {
                    statement_descriptor: params.statement_descriptor.substring(
                      0,
                      13,
                    ),
                  }
                : {}),
            },
          },
        ],
      },
    };
    try {
      const res = await this.getOrderClient().create({ body });
      const orderId = String((res as { id?: string }).id ?? '');
      type OrderRes = {
        payments?: { id?: string; status?: string; status_detail?: string }[];
      };
      const payments = (res as OrderRes).payments;
      const firstPayment = Array.isArray(payments) ? payments[0] : undefined;
      const status =
        firstPayment?.status ??
        (res as { status?: string }).status ??
        'unknown';
      const status_detail = firstPayment?.status_detail;
      const paymentId = firstPayment?.id;
      return {
        orderId,
        paymentId,
        status,
        status_detail,
      };
    } catch (err: unknown) {
      // Si la API devolvió la orden con status failed (ej. rejected_by_issuer), devolver resultado en vez de lanzar.
      const orderFromError = this.getOrderFromErrorResponse(err);
      if (orderFromError) {
        this.logger.warn(
          `Orden MP creada pero pago fallido: ${orderFromError.status_detail ?? orderFromError.status}`,
        );
        return orderFromError;
      }
      const msg = this.getErrorMessage(err);
      this.logger.error(`Error creando orden MP: ${msg}`);
      throw new Error(`Mercado Pago: ${msg}`);
    }
  }

  /**
   * Si el error incluye el body de la API con la orden (status failed), extrae orderId, status y status_detail.
   */
  private getOrderFromErrorResponse(err: unknown): {
    orderId: string;
    paymentId?: string;
    status: string;
    status_detail?: string;
  } | null {
    if (err == null || typeof err !== 'object') return null;
    const o = err as Record<string, unknown>;
    const body = o.response
      ? (o.response as Record<string, unknown>).data
      : (o.data ?? o.body);
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    const data = b.data as Record<string, unknown> | undefined;
    if (!data?.id || data.status !== 'failed') return null;
    const errors = b.errors as Array<{ details?: string[] }> | undefined;
    const firstDetail = errors?.[0]?.details?.[0];
    const statusDetail = firstDetail?.includes('rejected_by_issuer')
      ? 'rejected_by_issuer'
      : ((data.status_detail as string) ?? 'failed');
    const transactions = data.transactions as
      | { payments?: Array<{ id?: string }> }
      | undefined;
    const payments =
      transactions?.payments ??
      (data.payments as Array<{ id?: string }> | undefined);
    const firstPayment = Array.isArray(payments) ? payments[0] : undefined;
    const rawId = data.id;
    const orderId =
      typeof rawId === 'string'
        ? rawId
        : typeof rawId === 'number'
          ? String(rawId)
          : '';
    return {
      orderId,
      paymentId: firstPayment?.id != null ? String(firstPayment.id) : undefined,
      status: 'failed',
      status_detail: statusDetail,
    };
  }

  async getPaymentById(paymentId: string): Promise<PaymentDetail | null> {
    try {
      const res = await this.getPaymentClient().get({ id: paymentId });
      return {
        status: res.status,
        status_detail: (res as { status_detail?: string }).status_detail,
        external_reference: res.external_reference ?? undefined,
        payment_method_id: (res as { payment_method_id?: string })
          .payment_method_id,
        payment_type_id: (res as { payment_type_id?: string }).payment_type_id,
      };
    } catch (err) {
      this.logger.warn(`Error obteniendo pago ${paymentId}: ${err}`);
      return null;
    }
  }

  static statusDetailMessage(statusDetail: string | undefined): string {
    if (!statusDetail) return 'No se pudo procesar el pago.';
    const messages: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Revisa el número de tarjeta.',
      cc_rejected_bad_filled_date: 'Revisa la fecha de vencimiento.',
      cc_rejected_bad_filled_security_code:
        'Revisa el código de seguridad (CVV).',
      cc_rejected_bad_filled_other: 'Revisa los datos ingresados.',
      cc_rejected_insufficient_amount: 'Fondos insuficientes en la tarjeta.',
      cc_rejected_card_disabled: 'La tarjeta debe estar habilitada.',
      cc_rejected_max_attempts:
        'Límite de intentos alcanzado. Prueba más tarde.',
      cc_rejected_invalid_installments:
        'Este medio no acepta las cuotas elegidas.',
      cc_rejected_duplicated_payment: 'Transacción duplicada.',
      cc_rejected_call_for_authorize: 'Debes autorizar el pago con tu banco.',
      cc_rejected_high_risk: 'El pago fue rechazado por seguridad.',
      cc_rejected_blacklist: 'No se pudo procesar el pago con este medio.',
      cc_rejected_other_reason: 'El banco rechazó el pago.',
      cc_rejected_3ds_challenge: 'Falló la verificación de seguridad.',
      cc_rejected_3ds_mandatory: 'Se requiere verificación de seguridad.',
      bank_error: 'Error del banco. Intenta con otro medio.',
    };
    return messages[statusDetail] ?? `Motivo: ${statusDetail}`;
  }
}
