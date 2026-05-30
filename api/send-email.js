// ============================================
// VERCEL SERVERLESS FUNCTION
// Endpoint: POST /api/send-email
// ============================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Vercel automatically parses JSON body, but we need to bump limit for base64 attachments
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req, res) {
  // Allow CORS for local testing (Vercel handles this for same-origin automatically)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { to, name, message, kind, filename, attachment, mimeType } = req.body || {};

    // Validation
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, error: 'Invalid recipient email' });
    }
    if (!attachment) {
      return res.status(400).json({ success: false, error: 'No attachment' });
    }
    if (!RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'RESEND_API_KEY belum di-set di Vercel Environment Variables'
      });
    }

    const recipientName = name || 'there';
    const userMessage = message || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; background:#fff5d6; padding: 20px;">
        <div style="max-width: 540px; margin: 0 auto; background:#fffdf5; border: 3px solid #1a1a1a; border-radius: 20px; padding: 30px;">
          <h1 style="font-family: cursive; color: #1a1a1a; text-align:center;">
            🐲 Nailong Photobooth
          </h1>
          <p style="font-size: 16px; line-height: 1.5;">
            Hai <strong>${escapeHtml(recipientName)}</strong>! 👋
          </p>
          <p style="font-size: 15px; line-height: 1.5;">
            Kamu dapat kiriman <strong>${escapeHtml(kind)}</strong> dari Nailong Photobooth.
            File-nya udah dilampirkan di email ini, tinggal di-download aja!
          </p>
          ${userMessage ? `
            <div style="background:#fff5d6; border-left: 4px solid #ff4081; padding: 14px 18px; margin: 20px 0; border-radius: 8px;">
              <p style="margin:0; font-style: italic;">"${escapeHtml(userMessage)}"</p>
            </div>
          ` : ''}
          <p style="font-size: 13px; color: #666; text-align: center; margin-top: 30px;">
            Made with ♥ by Syafrizal
          </p>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Nailong Photobooth <${FROM_EMAIL}>`,
        to: [to],
        subject: `🐲 ${kind} dari Nailong Photobooth!`,
        html,
        attachments: [{
          filename,
          content: attachment // base64 string
        }]
      })
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({
        success: false,
        error: data.message || 'Resend API error'
      });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
