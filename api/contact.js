// /api/contact.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL  = process.env.OWNER_EMAIL  || 'info@nettoyageexpress.be';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@nettoyageexpress.be';

const IGNORE_KEYS = new Set(['g-recaptcha-response','captcha','token','_redirect','_subject','form-name','bot-field']);

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

function buildTable(payload) {
  const rows = Object.entries(payload)
    .filter(([k,v]) => v != null && String(v).trim() !== '' && !IGNORE_KEYS.has(k))
    .map(([k,v]) => `<tr>
      <td style="padding:8px 12px;border:1px solid #eee;font-weight:600">${esc(k)}</td>
      <td style="padding:8px 12px;border:1px solid #eee;white-space:pre-wrap">${esc(v)}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border:1px solid #eee"><tbody>${
    rows || `<tr><td style="padding:12px">Aucun champ transmis.</td></tr>`
  }</tbody></table>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' });

  try {
    const payload = req.body || {};
    const { name, contact } = payload;
    const nonEmpty = Object.values(payload).filter(v => (v ?? '').toString().trim() !== '');

    if (!name || !contact || nonEmpty.length < 2) {
      return res.status(400).json({ ok:false, error:'Missing required fields' });
    }

    const contactIsEmail = looksLikeEmail(contact);
    const table = buildTable(payload);

    const htmlOwner = `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:24px">
        <img src="https://nettoyageexpress.be/assets/img/logo.webp" alt="Nettoyage Express" height="40" style="display:block;margin-bottom:16px">
        <h2 style="margin:0 0 8px">Nouveau devis — Nettoyage Express</h2>
        <p style="margin:0 0 16px;color:#555">Demande reçue depuis le formulaire du site.</p>
        ${table}
        <p style="margin-top:24px;color:#777;font-size:12px">Cliquez “Répondre” pour répondre au visiteur.</p>
      </div>
    `;

    const htmlVisitor = `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:24px">
        <img src="https://nettoyageexpress.be/assets/img/logo.webp" alt="Nettoyage Express" height="40" style="display:block;margin-bottom:16px">
        <h2 style="margin:0 0 8px">Nous avons bien reçu votre demande</h2>
        <p style="margin:0 0 8px;color:#555">Bonjour ${esc(name)}, merci pour votre message.</p>
        <p>Notre équipe vous répond sous 24&nbsp;h (jours ouvrables).</p>
        <p style="margin:16px 0 8px;font-weight:600">Récapitulatif</p>
        ${table}
        <p style="margin-top:24px;color:#777;font-size:12px">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>
      </div>
    `;

    const sends = [];

    // → Propriétaire
    sends.push(resend.emails.send({
      from: `Nettoyage Express <${SENDER_EMAIL}>`,
      to: OWNER_EMAIL,
      subject: '🧹 Nouveau devis — Nettoyage Express',
      html: htmlOwner,
      ...(contactIsEmail ? { reply_to: contact } : {})
    }));

    // → Accusé au visiteur
    if (contactIsEmail) {
      sends.push(resend.emails.send({
        from: `Nettoyage Express <${SENDER_EMAIL}>`,
        to: contact,
        subject: '✅ Demande bien reçue — Nettoyage Express',
        html: htmlVisitor
      }));
    }

    await Promise.all(sends);
    return res.status(200).json({ ok:true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error:'Server error' });
  }
};
