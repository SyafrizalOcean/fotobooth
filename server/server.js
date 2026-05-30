/* ============================================
   NAILONG PHOTOBOOTH - Backend Server
   Express + Resend untuk kirim email dengan attachment
   ============================================ */

const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Increase JSON limit because we send base64 attachments (could be a few MB)
app.use(express.json({ limit: '25mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============ EMAIL ENDPOINT ============
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, name, message, kind, filename, attachment, mimeType } = req.body;

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
        error: 'RESEND_API_KEY belum di-set. Tambahkan ke file .env di folder server/'
      });
    }

    // Email content (HTML)
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

    // Send via Resend API
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

    res.json({ success: true, id: data.id });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!RESEND_API_KEY,
    fromEmail: FROM_EMAIL
  });
});

// Helper: HTML escape
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.listen(PORT, () => {
  console.log('');
  console.log('  🐲 Nailong Photobooth running!');
  console.log('  ─────────────────────────────');
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  API key:  ${RESEND_API_KEY ? '✓ configured' : '✗ MISSING (edit .env)'}`);
  console.log(`  From:     ${FROM_EMAIL}`);
  console.log('');
});
