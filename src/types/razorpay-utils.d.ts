declare module 'razorpay/dist/utils/razorpay-utils' {
  export function validateWebhookSignature(
    body: string,
    signature: string,
    secret: string,
  ): boolean
  export function validatePaymentVerification(
    params: Record<string, string>,
    signature: string,
    secret: string,
  ): boolean
}
