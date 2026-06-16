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

export type DigestRow = {
  name: string;
  store: string;
  total: number;
  buyUrl: string;
  message: string;
};

// One digest email listing each due item with its chosen store, total, and a
// "Buy at {store}" button that hands the owner off to the store.
export function digestHtml(rows: DigestRow[]): string {
  const blocks = rows
    .map(
      (r) => `
    <div style="margin: 0 0 28px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
      <p style="margin: 0 0 8px;">${escapeHtml(r.message)}</p>
      <p style="margin: 0 0 12px; color: #555;">Total: $${r.total.toFixed(2)}</p>
      <a href="${r.buyUrl}"
         style="background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Buy ${escapeHtml(r.name)} at ${escapeHtml(r.store)}
      </a>
    </div>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
    <h1 style="font-size: 18px;">${BRAND}: ${rows.length} item${rows.length === 1 ? "" : "s"} to reorder</h1>
    ${blocks}
    <p style="color: #888; font-size: 13px;">Tapping a Buy button hands you off to the store and resets that item's clock.</p>
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
