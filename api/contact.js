// /api/contact.js — version sans SDK (HTTP direct)
const IGNORE_KEYS = new Set(['g-recaptcha-response','captcha','token','_redirect','_subject','form-name','bot-field']);

const OWNER_EMAIL  = process.env.OWNER_EMAIL  || 'info@nettoyageexpress.be';
// TEMP tant que le domaine n'est pas vérifié chez Resend
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
const table = (payload) => {
  const rows = Object.entries(payload)
    .filter(([k, v]) => v != null && String(v).trim() !== '' && !IGNORE_KEYS.has(k))
    .map(([k, v]) => `<tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:600">${esc(k)}</td>
                      <td style="padding:8px 12px;border:1px solid #eee;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border:1px solid #eee"><tbody>${
    rows || `<tr><td style="padding:12px">Aucun champ transmis.</td></tr>`
  }</tbody></table>`;
};

async function sendEmail({ to, subject, html, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `Nettoyage Express <${SENDER_EMAIL}>`,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${errText}`);
  }
  return res.json();
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      // ping simple pour tester depuis le navigateur
      return res.status(200).json({ ok: true, hint: 'POST only. Use the form.', env: {
        hasKey: Boolean(process.env.RESEND_API_KEY),
        owner: OWNER_EMAIL,
        sender: SENDER_EMAIL
      }});
    }

    // Support body string OU object
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch {}
    }

    const { name, contact } = payload;
    const nonEmpty = Object.values(payload).filter(v => (v ?? '').toString().trim() !== '');
    if (!name || !contact || nonEmpty.length < 2) {
      return res.status(400).json({ ok:false, error:'Missing required fields (need name + contact)' });
    }

    const contactIsEmail = looksLikeEmail(contact);
    const t = table(payload);

    const htmlOwner = `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:24px">
        <img src="https://nettoyageexpress.be/assets/img/logo.webp" alt="Nettoyage Express" height="40" style="display:block;margin-bottom:16px">
        <h2 style="margin:0 0 8px">Nouveau devis — Nettoyage Express</h2>
        <p style="margin:0 0 16px;color:#555">Reçu depuis le formulaire du site.</p>
        ${t}
        <p style="margin-top:24px;color:#777;font-size:12px">Cliquez “Répondre” pour répondre au visiteur.</p>
      </div>
    `;
    const htmlVisitor = `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:24px">
        <img src="https://nettoyageexpress.be/assets/img/logo.webp" alt="Nettoyage Express" height="40" style="display:block;margin-bottom:16px">
        <h2 style="margin:0 0 8px">Nous avons bien reçu votre demande</h2>
        <p>Bonjour ${esc(name)}, merci pour votre message. Réponse sous 24&nbsp;h (jours ouvrables).</p>
        <p style="margin:16px 0 8px;font-weight:600">Récapitulatif</p>
        ${t}
        <p style="margin-top:24px;color:#777;font-size:12px">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>
      </div>
    `;

    // 1) vers le propriétaire
    await sendEmail({
      to: OWNER_EMAIL,
      subject: '🧹 Nouveau devis — Nettoyage Express',
      html: htmlOwner,
      replyTo: contactIsEmail ? contact : undefined
    });

    // 2) accusé au visiteur (si email valide)
    if (contactIsEmail) {
      await sendEmail({
        to: contact,
        subject: '✅ Demande bien reçue — Nettoyage Express',
        html: htmlVisitor
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || String(e)
    });
  }
};
