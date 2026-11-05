import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("careerlens.email")


class EmailService:
    @staticmethod
    def _create_reset_html(to_email: str, reset_link: str, user_name: Optional[str] = None) -> str:
        greeting_name = user_name.strip() if user_name else to_email.split("@")[0]
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your CareerLens AI Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; text-align: left;">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 32px 32px 20px; background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 6px 12px; border-radius: 8px; color: #ffffff; font-weight: 700; font-size: 16px; letter-spacing: -0.5px;">
                      CareerLens <span style="background-color: #10b981; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 11px;">AI</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      Password Reset Request
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #334155;">
                Hello <strong>{greeting_name}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #475569;">
                We received a request to reset your CareerLens AI password. Click the secure button below to set a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="{reset_link}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 12px; line-height: 18px; color: #64748b;">
                This link is valid for <strong>1 hour</strong>. If the button above does not work, copy and paste this link into your browser:
              </p>
              <div style="background-color: #f1f5f9; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-all; font-size: 11px; font-family: monospace; color: #2563eb; margin-bottom: 24px;">
                <a href="{reset_link}" style="color: #2563eb; text-decoration: underline;">{reset_link}</a>
              </div>

              <div style="padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 18px;">
                <p style="margin: 0;">
                  If you did not request this password reset, you can safely ignore this email. Your account remains secure and no changes have been made.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
              CareerLens AI &bull; Resume Intelligence, ATS Verification & Application Tracking<br>
              End-to-End Privacy First
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    @classmethod
    def _send_smtp_sync(cls, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.info(
                f"[DEV MOCK EMAIL] No SMTP credentials configured. To: {to_email} | Subject: {subject}"
            )
            return False

        sender_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
        sender_name = settings.EMAILS_FROM_NAME or "CareerLens AI"

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{sender_email}>"
        msg["To"] = to_email
        msg.set_content(text_content)
        msg.add_alternative(html_content, subtype="html")

        try:
            if settings.SMTP_PORT == 465:
                # SSL
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                # TLS (default 587)
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                    server.ehlo()
                    if settings.SMTP_TLS:
                        server.starttls()
                        server.ehlo()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)

            logger.info(f"Successfully dispatched email to {to_email} via SMTP ({settings.SMTP_HOST})")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
            return False

    @classmethod
    async def send_password_reset_email(
        cls,
        to_email: str,
        reset_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        frontend_base = settings.FRONTEND_URL.rstrip("/")
        reset_link = f"{frontend_base}/?reset_token={reset_token}"

        subject = "Reset Your CareerLens AI Password"
        text_content = (
            f"Hello {user_name or to_email},\n\n"
            f"We received a request to reset your CareerLens AI password.\n\n"
            f"Reset your password by opening this link in your browser:\n"
            f"{reset_link}\n\n"
            f"This link is valid for 1 hour. If you did not request this, you can ignore this email.\n\n"
            f"— The CareerLens AI Team"
        )
        html_content = cls._create_reset_html(to_email, reset_link, user_name)

        # Output reset link directly in dev console when credentials not yet configured
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            print("\n" + "=" * 70)
            print(" [CAREERLENS AI EMAIL SERVICE - DEV MOCK]")
            print(f" Recipient : {to_email}")
            print(f" Subject   : {subject}")
            print(f" Reset Link: {reset_link}")
            print(" (Configure SMTP_USER & SMTP_PASSWORD in backend/.env for real email delivery)")
            print("=" * 70 + "\n")
            return False

        # Run blocking network socket I/O in worker thread
        return await asyncio.to_thread(
            cls._send_smtp_sync,
            to_email,
            subject,
            html_content,
            text_content
        )


email_service = EmailService()
