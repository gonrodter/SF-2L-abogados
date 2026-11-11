/**
 * Vercel serverless function: receives the contact form and emails it to the firm.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY  API key from https://resend.com
 *   CONTACT_TO      recipient. While testing: the developer's address; then sf2labogados@gmail.com
 *   CONTACT_FROM    verified sender, e.g. "Web SF 2L Abogados <web@dominio-del-despacho.es>"
 *                   (until a domain is verified in Resend: "Web SF 2L <onboarding@resend.dev>",
 *                   which only delivers to the Resend account owner's own address)
 */

const AREAS = ['Derecho Civil', 'Derecho Penal', 'Otro asunto'];
const LIMITS = { nombre: 80, telefono: 20, email: 120, mensaje: 1500 };

const clean = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const escape = (v = '') =>
  String(v).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

const phoneOk = (s) => {
  const d = s.replace(/[\s.\-()]/g, '');
  return /^(\+34|0034)?[6789]\d{8}$/.test(d) || /^(\+|00)[1-9]\d{7,14}$/.test(d);
};
const emailOk = (s) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(s);

// Same rules as the browser, so a hand-crafted request cannot skip them.
export function validate(body) {
  const data = {
    nombre: clean(body.nombre, LIMITS.nombre),
    telefono: clean(body.telefono, LIMITS.telefono),
    email: clean(body.email, LIMITS.email),
    area: AREAS.includes(body.area) ? body.area : 'Otro asunto',
    mensaje: clean(body.mensaje, LIMITS.mensaje)
  };
  const errors = {};
  if (data.nombre.length < 2) errors.nombre = 'Escribe tu nombre';
  if (!data.telefono && !data.email) errors.telefono = 'Déjanos un teléfono o un email para poder responderte';
  if (data.telefono && !phoneOk(data.telefono)) errors.telefono = 'Revisa el teléfono';
  if (data.email && !emailOk(data.email)) errors.email = 'Revisa el email';
  if (data.mensaje.length < 15) errors.mensaje = 'Cuéntanos un poco más';
  if (body.privacidad !== true && body.privacidad !== 'on') errors.privacidad = 'Necesitamos que aceptes la política de privacidad';
  return { data, errors };
}

export function buildEmail(data) {
  const rows = [
    ['Nombre', data.nombre],
    ['Teléfono', data.telefono || '—'],
    ['Email', data.email || '—'],
    ['Asunto', data.area]
  ];
  const html = `
<div style="font-family:Helvetica,Arial,sans-serif;color:#020202;max-width:560px">
  <p style="font-size:13px;color:#5e1219;margin:0 0 6px;text-transform:uppercase;letter-spacing:.06em">Nueva consulta desde la web</p>
  <h1 style="font-size:22px;margin:0 0 18px">${escape(data.nombre)} · ${escape(data.area)}</h1>
  <table style="border-collapse:collapse;font-size:15px;margin-bottom:18px">
    ${rows.map(([k, v]) => `<tr><td style="padding:4px 18px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><strong>${escape(v)}</strong></td></tr>`).join('')}
  </table>
  <div style="font-size:15px;line-height:1.5;white-space:pre-wrap;border-top:1px solid #ddd;padding-top:14px">${escape(data.mensaje)}</div>
  <p style="font-size:12px;color:#999;margin-top:24px">Enviado desde el formulario de contacto de la web de SF 2L Abogados. ${data.email ? 'Responder a este correo contesta directamente al cliente.' : 'El cliente no dejó email: llámale al teléfono indicado.'}</p>
</div>`;
  const text = [
    'Nueva consulta desde la web', '',
    ...rows.map(([k, v]) => `${k}: ${v}`), '',
    data.mensaje
  ].join('\n');
  return {
    subject: `Consulta web · ${data.area} · ${data.nombre}`,
    html,
    text
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ error: 'Datos no válidos' }); }
  }

  // Honeypot: bots fill the hidden "empresa" field. Pretend it worked and send nothing.
  if (body.empresa) return res.status(200).json({ ok: true });

  const { data, errors } = validate(body);
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Revisa los campos marcados', fields: errors });

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error('contact: missing RESEND_API_KEY, CONTACT_TO or CONTACT_FROM');
    return res.status(500).json({ error: 'El formulario no está configurado todavía' });
  }

  const mail = buildEmail(data);
  try {
    const send = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean),
        ...(data.email ? { reply_to: data.email } : {}),
        subject: mail.subject,
        html: mail.html,
        text: mail.text
      })
    });
    if (!send.ok) throw new Error(`Resend ${send.status}: ${await send.text()}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('contact: send failed', error);
    return res.status(502).json({ error: 'No hemos podido enviar el mensaje' });
  }
}
