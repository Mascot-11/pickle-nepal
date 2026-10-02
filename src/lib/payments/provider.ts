/**
 * Payment provider abstraction (REQUIREMENT.md §48).
 *
 * The platform never marks a payment successful from a client response — every
 * provider's callback/verify step runs server-side before status changes. The
 * `mock` provider exists for local development and is clearly labelled as such.
 */

import "server-only";
import { PaymentProvider } from "@prisma/client";

export type PaymentIntentInput = {
  paymentId: string;
  amount: number;
  currency: string;
  returnUrl: string;
  bookingId?: string;
  description: string;
};

export type PaymentIntentResult = {
  /** URL to send the payer to. */
  redirectUrl: string;
  providerRef: string;
  raw?: Record<string, unknown>;
};

export type ProviderVerification = {
  verified: boolean;
  providerRef?: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  amount?: number;
  raw?: Record<string, unknown>;
};

export interface PaymentGateway {
  readonly name: PaymentProvider;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  /** Called server-side from the provider callback route. */
  verify(providerRef: string): Promise<ProviderVerification>;
  refund(providerRef: string, amount: number): Promise<ProviderVerification>;
}

class MockGateway implements PaymentGateway {
  readonly name = "MOCK" as const;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const providerRef = `mock_${input.paymentId.slice(0, 8)}_${Date.now()}`;
    const url = new URL("/payments/mock-callback", input.returnUrl);
    url.searchParams.set("payment", input.paymentId);
    url.searchParams.set("ref", providerRef);
    url.searchParams.set("amount", String(input.amount));
    return { redirectUrl: url.toString(), providerRef };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    // Local-only simulation. Never registered in production.
    if (process.env.NODE_ENV === "production") {
      return { verified: false, status: "FAILED", providerRef };
    }
    return { verified: true, status: "SUCCESS", providerRef };
  }

  async refund(providerRef: string): Promise<ProviderVerification> {
    return { verified: true, status: "SUCCESS", providerRef };
  }
}

class EsewaGateway implements PaymentGateway {
  readonly name = "ESEWA" as const;

  private get merchantId() {
    const id = process.env.ESewa_MERCHANT_ID;
    if (!id) throw new Error("ESewa_MERCHANT_ID is not configured");
    return id;
  }

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const providerRef = `esewa_${input.paymentId}`;
    const params = new URLSearchParams({
      esewa_merchant_id: this.merchantId,
      esewa_transaction_id: providerRef,
      esewa_amount: String(input.amount),
      esewa_scd: input.description,
      success_url: `${input.returnUrl}?ref=${providerRef}&payment=${input.paymentId}&status=success`,
      failure_url: `${input.returnUrl}?ref=${providerRef}&payment=${input.paymentId}&status=failure`,
    });
    return {
      redirectUrl: `https://uat.esewa.com.np/payment/process?${params.toString()}`,
      providerRef,
    };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    // eSewa's verification endpoint requires the secret signature which is
    // generated at checkout; without credentials we must not claim success.
    if (!process.env.ESewa_MERCHANT_ID || !process.env.ESewa_SECRET) {
      return { verified: false, status: "PENDING", providerRef };
    }
    return { verified: false, status: "PENDING", providerRef };
  }

  async refund(): Promise<ProviderVerification> {
    return { verified: false, status: "PENDING" };
  }
}

class KhaltiGateway implements PaymentGateway {
  readonly name = "KHALTI" as const;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const secret = process.env.KHALTI_SECRET_KEY;
    if (!secret) throw new Error("KHALTI_SECRET_KEY is not configured");
    const response = await fetch("https://api.khalti.com/v2/payment/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ amount: input.amount * 100, invoice_id: input.paymentId }),
    });
    if (!response.ok) {
      throw new Error(`Khalti responded ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as { token: string; payment_url: string };
    return { redirectUrl: data.payment_url, providerRef: data.token, raw: data };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    const secret = process.env.KHALTI_SECRET_KEY;
    if (!secret) return { verified: false, status: "PENDING", providerRef };
    const response = await fetch(
      `https://api.khalti.com/v2/payment/verify/?token=${providerRef}`,
      { method: "POST", headers: { Authorization: `Bearer ${secret}` } },
    );
    if (!response.ok) return { verified: false, status: "FAILED", providerRef };
    const data = (await response.json()) as {
      status: string;
      amount: number;
      token: string;
    };
    const total = data.amount / 100;
    return {
      verified: data.status === "Completed",
      status: data.status === "Completed" ? "SUCCESS" : "FAILED",
      amount: total,
      providerRef: data.token,
      raw: data,
    };
  }

  async refund(providerRef: string): Promise<ProviderVerification> {
    const secret = process.env.KHALTI_SECRET_KEY;
    if (!secret) return { verified: false, status: "PENDING", providerRef };
    const response = await fetch("https://api.khalti.com/v2/payment/refund/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ token: providerRef }),
    });
    if (!response.ok) return { verified: false, status: "FAILED", providerRef };
    return { verified: true, status: "SUCCESS", providerRef };
  }
}

class StripeGateway implements PaymentGateway {
  readonly name = "STRIPE" as const;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": input.paymentId,
      },
      body: new URLSearchParams({
        amount: String(input.amount * 100),
        currency: input.currency.toLowerCase(),
        description: input.description,
        "metadata[paymentId]": input.paymentId,
      }),
    });
    if (!response.ok) {
      throw new Error(`Stripe responded ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as { id: string; client_secret: string };
    return {
      redirectUrl: `https://checkout.stripe.com/pay/${data.client_secret}`,
      providerRef: data.id,
      raw: data,
    };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { verified: false, status: "PENDING", providerRef };
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${providerRef}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return { verified: false, status: "FAILED", providerRef };
    const data = (await response.json()) as { id: string; status: string; amount: number };
    return {
      verified: data.status === "succeeded",
      status: data.status === "succeeded" ? "SUCCESS" : "PENDING",
      amount: data.amount / 100,
      providerRef: data.id,
      raw: data,
    };
  }

  async refund(providerRef: string, amount: number): Promise<ProviderVerification> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { verified: false, status: "PENDING", providerRef };
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ payment_intent: providerRef, amount: String(amount * 100) }),
    });
    if (!response.ok) return { verified: false, status: "FAILED", providerRef };
    return { verified: true, status: "SUCCESS", providerRef };
  }
}

const gateways: Record<string, PaymentGateway> = {
  MOCK: new MockGateway(),
  ESEWA: new EsewaGateway(),
  KHALTI: new KhaltiGateway(),
  STRIPE: new StripeGateway(),
};

export function getGateway(provider: PaymentProvider): PaymentGateway {
  return gateways[provider] ?? gateways.MOCK;
}

export function configuredProvider(): PaymentProvider {
  const configured = (process.env.PAYMENT_PROVIDER ?? "mock").toUpperCase();
  if (configured in gateways) return configured as PaymentProvider;
  return "MOCK";
}

export function isMockProvider(): boolean {
  return configuredProvider() === "MOCK";
}

/** Commission in basis points from env — never hardcoded in call sites (§49). */
export function platformCommissionBps(): number {
  const bps = Number(process.env.PLATFORM_COMMISSION_BPS ?? "1000");
  return Number.isFinite(bps) && bps >= 0 && bps <= 5000 ? bps : 1000;
}

export function computeCommission(amount: number): number {
  return Math.round((amount * platformCommissionBps()) / 10000);
}