import { Resend } from "resend"

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/e98abe5e-1ecf-45e8-bcf9-9333b078fd84',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5788ba'},body:JSON.stringify({sessionId:'5788ba',runId:'pre-fix',hypothesisId:'H3',location:'lib/email/resend.ts:6',message:'resend_client_initialization_attempt',data:{hasApiKey:!!apiKey},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY")
  }
  return new Resend(apiKey)
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "FriendSpace <no-reply@friendspace.app>"
}

export async function sendVerificationEmail(args: { to: string; verifyUrl: string }) {
  const resend = getResendClient()
  const { to, verifyUrl } = args

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "Verify your FriendSpace account",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Verify your account</h2>
        <p>Welcome to FriendSpace. Click the button below to verify your email.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">
            Verify email
          </a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(args: { to: string; resetUrl: string }) {
  const resend = getResendClient()
  const { to, resetUrl } = args

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject: "Reset your FriendSpace password",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Password reset requested</h2>
        <p>Click the button below to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">
            Reset password
          </a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `,
  })
}
