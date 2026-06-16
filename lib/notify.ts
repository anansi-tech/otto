import { Resend } from "resend";
import { BRAND } from "@/lib/config";

// Resend requires a verified sender; override via FROM_EMAIL once a domain is set up.
const FROM = process.env.FROM_EMAIL ?? "Otto <onboarding@resend.dev>";

export async function sendNudge(email: string, subject: string, html: string) {
  // Instantiated per-call so the build doesn't need the API key at module load.
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html,
  });
}

// Wrap the agent's message + a prominent confirm button into an email body.
export function nudgeHtml(message: string, confirmUrl: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
    <p>${escapeHtml(message)}</p>
    <p style="margin: 24px 0;">
      <a href="${confirmUrl}"
         style="background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Confirm purchase
      </a>
    </p>
    <p style="color: #888; font-size: 13px;">Tapping confirm tells ${BRAND} you bought it and resets the clock.</p>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
