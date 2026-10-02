/**
 * Email delivery abstraction (REQUIREMENT.md §78).
 *
 * Providers are configured purely by env vars. `console` is the default so the
 * app is fully functional locally without a mail account — nothing is faked:
 * the console provider really just logs, and README says so.
 */

import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** A rendered template; callers supply the recipient address. */
export type EmailTemplate = {
  subject: string;
  text: string;
  html?: string;
};

export type EmailProvider = {
  name: string;
  send(message: EmailMessage): Promise<void>;
};

const consoleProvider: EmailProvider = {
  name: "console",
  async send(message) {
    console.info(
      `[email:console] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  },
};

const resendProvider: EmailProvider = {
  name: "resend",
  async send(message) {
    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey) throw new Error("EMAIL_API_KEY is required for the resend provider");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "PickleNepal <no-reply@picklenepal.com>",
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
    }
  },
};

const providers: Record<string, EmailProvider> = {
  console: consoleProvider,
  resend: resendProvider,
};

export function getEmailProvider(): EmailProvider {
  const configured = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();
  return providers[configured] ?? consoleProvider;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const provider = getEmailProvider();
  try {
    await provider.send(message);
  } catch (error) {
    console.error(`[email:${provider.name}] delivery failed`, error);
  }
}

export const EMAIL_TEMPLATES = {
  welcome: (name: string): EmailTemplate => ({
    subject: "Welcome to PickleNepal",
    text: `Hi ${name},\n\nWelcome to PickleNepal — the home of pickleball in Nepal.\n\nFinish your profile so players in your city can find you, then head to Find a Game.\n\nFind your people. Find your game.`,
  }),
  passwordReset: (name: string, resetUrl: string): EmailTemplate => ({
    subject: "Reset your PickleNepal password",
    text: `Hi ${name},\n\nUse this link to choose a new password. It expires in one hour.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
  }),
  verificationResult: (name: string, approved: boolean, note?: string): EmailTemplate => ({
    subject: approved ? "Your PickleNepal verification was approved" : "PickleNepal verification update",
    text: approved
      ? `Hi ${name},\n\nYour verification request has been approved. Your profile now shows a verification badge.\n\n${note ?? ""}`
      : `Hi ${name},\n\nYour verification request was not approved at this time.\n\n${note ?? "You can submit a new request with more detail."}`,
  }),
  gameJoined: (name: string, gameTitle: string, when: string): EmailTemplate => ({
    subject: `${name} joined your game`,
    text: `${name} joined "${gameTitle}" (${when}).`,
  }),
  gameCancelled: (name: string, gameTitle: string, reason?: string): EmailTemplate => ({
    subject: `Game cancelled: ${gameTitle}`,
    text: `Your game "${gameTitle}" has been cancelled.${reason ? `\n\nReason: ${reason}` : ""}`,
  }),
  tournamentRegistration: (name: string, tournamentName: string): EmailTemplate => ({
    subject: `You're registered for ${tournamentName}`,
    text: `Hi ${name},\n\nYour registration for ${tournamentName} is confirmed. We'll remind you before the draw.`,
  }),
  eventReminder: (name: string, eventTitle: string, when: string): EmailTemplate => ({
    subject: `${eventTitle} is coming up`,
    text: `Hi ${name},\n\n${eventTitle} starts ${when}. See you there.`,
  }),
} as const;

export function activeEmailProviderName(): string {
  return getEmailProvider().name;
}