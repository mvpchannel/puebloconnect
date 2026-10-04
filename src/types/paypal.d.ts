// Minimal ambient types for the PayPal JS SDK v6 global, covering only the
// shape this app actually uses (one-time payment buttons). Not an
// official PayPal type package — there isn't an npm one installed here
// (no new dependencies) — just enough so the code in
// src/components/membership/MembershipPlans.tsx type-checks. If PayPal's
// real shape differs in some untyped corner, this file is the one place
// to fix it.
export {};

declare global {
  interface Window {
    paypal?: {
      createInstance: (options: {
        clientId: string;
        components?: string[];
        pageType?: string;
      }) => Promise<PayPalSdkInstance>;
    };
  }
}

export type PayPalSdkInstance = {
  createPayPalOneTimePaymentSession: (options: {
    onApprove: (data: { orderId: string; payerId?: string }) => void | Promise<void>;
    onCancel?: (data: unknown) => void;
    onError?: (error: { code?: string; message?: string }) => void;
  }) => PayPalPaymentSession;
};

export type PayPalPaymentSession = {
  start: (
    options: { presentationMode?: "auto" | "popup" | "modal" | "redirect" },
    orderPromise: Promise<{ orderId: string }>
  ) => Promise<void>;
};
