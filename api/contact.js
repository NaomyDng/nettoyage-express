// /api/contact.js — version sans SDK, 100% compatible Vercel
const OWNER_EMAIL  = process.env.OWNER_EMAIL  || 'info@nettoyageexpress.be';
// TEMP tant que ton domaine n'est pas Verified dans Resend : laisse onboarding@resend.dev
// Quand Resend passe en "Verified", mets no-reply@nettoyageexpress.be dans Vercel et redeploie
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

const IGNORE_KEYS = new Set(['g-recaptcha-response','captcha','token','_redirect','_subject','form-name','bot-field']);

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
const looksLikePhone = (s) => /[0-9]{6,}/.test((s || '').replace(/\D/g, ''));

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

async function sendEmail({ to, subject, html, replyTo }) {
  const r = await fetch('https://api.resend.com/emails', {
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
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Resend ${r.status}: ${t}`);
  }
}

module.exports = async (req, res) => {
  // GET -> ping pour vérifier vite fait dans le navigateur
  if (req.method !== 'POST') {
    return res.status(200).json({
      ok: true,
      hint: 'POST only. Use the form.',
      env: { hasKey: !!process.env.RESEND_API_KEY, owner: OWNER_EMAIL, sender: SENDER_EMAIL }
    });
  }

  try {
    // Supporte body en string ou objet
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch {}
    }

    // rétro-compat : si "contact" existe, on devine si c'est email ou téléphone
    if (payload.contact && !payload.email && !payload.phone) {
      if (looksLikeEmail(payload.contact)) payload.email = payload.contact;
      else payload.phone = payload.contact;
    }

    const { name, email, phone } = payload;
    const nonEmpty = Object.values(payload).filter(v => (v ?? '').toString().trim() !== '');

    // nom + (email OU téléphone) requis
    if (!name || (!email && !phone) || nonEmpty.length < 2) {
      return res.status(400).json({ ok:false, error:'Missing required fields (need name + email or phone)' });
    }

    const table = buildTable(payload);

    const htmlOwner = `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:24px">
        <img src="https://nettoyageexpress.be/assets/img/logo.webp" alt="Nettoyage Express" height="40" style="display:block;margin-bottom:16px">
        <h2 style="margin:0 0 8px">Nouveau devis — Nettoyage Express</h2>
        <p style="margin:0 0 16px;color:#555">Demande reçue depuis le formulaire du site.</p>
        ${table}
        <p style="margin-top:24px;color:#777;font-size:12px">Cliquez “Répondre” pour répondre au visiteur (si email fourni).</p>
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

    // 1) Notification propriétaire (+ Reply-To si email fourni)
    await sendEmail({
      to: OWNER_EMAIL,
      subject: '🧹 Nouveau devis — Nettoyage Express',
      html: htmlOwner,
      replyTo: looksLikeEmail(email) ? email : undefined
    });

    // 2) Accusé au visiteur si email valide
    if (looksLikeEmail(email)) {
      await sendEmail({
        to: email,
        subject: '✅ Demande bien reçue — Nettoyage Express',
        html: htmlVisitor
      });
    }

    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};
