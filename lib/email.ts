export function getTransactionalEmailSender() {
  return {
    apiKey: process.env.RESEND_API_KEY ?? "",
  };
}
