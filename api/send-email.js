const tls = require('tls');

function sendTlsEmail(options) {
  return new Promise((resolve, reject) => {
    const isNotification = options.type === 'notification';

    // Selección dinámica de cuenta según el servicio
    const user = isNotification
      ? (process.env.NOTIF_EMAIL_USER || process.env.EMAIL_USER || 'tadeocdu@gmail.com')
      : (process.env.AUTH_EMAIL_USER || process.env.EMAIL_USER || 'tadeocdu@gmail.com');

    const pass = isNotification
      ? (process.env.NOTIF_EMAIL_PASS || process.env.EMAIL_PASS || 'wpmnkgexoasjunas')
      : (process.env.AUTH_EMAIL_PASS || process.env.EMAIL_PASS || 'wpmnkgexoasjunas');

    const fromName = isNotification
      ? (process.env.NOTIF_EMAIL_FROM_NAME || 'ApexPredict Alertas F1')
      : (process.env.AUTH_EMAIL_FROM_NAME || 'ApexPredict Seguridad');

    const to = options.to;
    const socket = tls.connect(465, 'smtp.gmail.com', () => {});
    socket.setEncoding('utf8');

    let step = 0;
    const timeout = setTimeout(() => {
      try { socket.destroy(); } catch {}
      reject(new Error('Tiempo de espera agotado al conectar con el servidor de correo Gmail.'));
    }, 15000);

    socket.on('data', (data) => {
      if (data.startsWith('220') && step === 0) {
        step = 1;
        socket.write('EHLO apexpredict.local\r\n');
      } else if (step === 1 && data.includes('250 ')) {
        step = 2;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 2 && data.startsWith('334')) {
        step = 3;
        socket.write(Buffer.from(user).toString('base64') + '\r\n');
      } else if (step === 3 && data.startsWith('334')) {
        step = 4;
        socket.write(Buffer.from(pass).toString('base64') + '\r\n');
      } else if (step === 4 && data.startsWith('235')) {
        step = 5;
        socket.write(`MAIL FROM:<${user}>\r\n`);
      } else if (step === 5 && data.startsWith('250')) {
        step = 6;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (step === 6 && data.startsWith('250')) {
        step = 7;
        socket.write('DATA\r\n');
      } else if (step === 7 && data.startsWith('354')) {
        step = 8;

        let subject = '';
        let htmlContent = '';

        if (isNotification) {
          subject = options.subject || '🏁 Alerta de Gran Premio - ApexPredict F1';
          const title = options.title || 'Recordatorio de Pronósticos F1';
          const message = options.message || 'Se acerca el cierre del Lock Time para la próxima carrera. ¡Cargá tus pronósticos ahora!';
          
          htmlContent = [
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #0b0e14; color: #ffffff; padding: 32px; border-radius: 12px; max-width: 520px; margin: 20px auto; border: 1px solid #ff8000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">',
            '<div style="text-align: center; margin-bottom: 24px;">',
            '<h1 style="color: #ff8000; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; font-family: monospace;">🏎️ APEXPREDICT</h1>',
            '<p style="color: #64748b; font-size: 11px; margin: 4px 0 0; letter-spacing: 1.5px; text-transform: uppercase;">Notificaciones de Carrera & Alertas</p>',
            '</div>',
            `<h2 style="color: #f8fafc; font-size: 18px; margin: 0 0 14px;">${title}</h2>`,
            `<p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">${message}</p>`,
            '<div style="text-align: center; margin: 28px 0;">',
            '<a href="https://dacs-nine.vercel.app/dashboard" style="background: #e10600; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 800; font-size: 13px; letter-spacing: 0.5px; display: inline-block;">INGRESAR A APEXPREDICT →</a>',
            '</div>',
            '<p style="color: #64748b; font-size: 11px; line-height: 1.4; margin: 20px 0 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; text-align: center;">ApexPredict F1 Community · Podés desactivar alertas desde tu perfil.</p>',
            '</div>'
          ].join('\r\n');
        } else {
          // Servicio de Seguridad / Códigos
          const code = options.code || '';
          subject = `Tu código de seguridad ApexPredict: ${code}`;
          htmlContent = [
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #0b0e14; color: #ffffff; padding: 32px; border-radius: 12px; max-width: 520px; margin: 20px auto; border: 1px solid #e10600; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">',
            '<div style="text-align: center; margin-bottom: 24px;">',
            '<h1 style="color: #e10600; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; font-family: monospace;">🏎️ APEXPREDICT</h1>',
            '<p style="color: #64748b; font-size: 11px; margin: 4px 0 0; letter-spacing: 1.5px; text-transform: uppercase;">Seguridad & Autenticación F1</p>',
            '</div>',
            '<p style="color: #e2e8f0; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">Has solicitado restablecer tu contraseña o verificar tu identidad. Utilizá el siguiente código de seguridad de 6 dígitos para continuar:</p>',
            '<div style="background: rgba(18, 23, 34, 0.9); border: 2px dashed #00f2fe; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">',
            `<span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #00f2fe; font-family: monospace; text-shadow: 0 0 12px rgba(0, 242, 254, 0.4);">${code}</span>`,
            '</div>',
            '<p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">⏱️ Este código expira en <strong>15 minutos</strong>.</p>',
            '<p style="color: #64748b; font-size: 12px; line-height: 1.4; margin: 16px 0 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">Si no solicitaste este cambio, podés ignorar este correo; tu cuenta permanece completamente segura.</p>',
            '</div>'
          ].join('\r\n');
        }

        const body = [
          `From: "${fromName}" <${user}>`,
          `To: <${to}>`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          htmlContent,
          '',
          '.',
          ''
        ].join('\r\n');

        socket.write(body);
      } else if (step === 8 && data.startsWith('250')) {
        clearTimeout(timeout);
        socket.end('QUIT\r\n');
        resolve(true);
      } else if (data.startsWith('5')) {
        clearTimeout(timeout);
        socket.end('QUIT\r\n');
        reject(new Error(`Error del servidor de correo Gmail: ${data.trim()}`));
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'apexpredict-email-dispatcher' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  const { to, code, type, subject, title, message } = body || {};

  if (!to) {
    return res.status(400).json({ error: 'Falta el destinatario requerido: to' });
  }

  if (type !== 'notification' && !code) {
    return res.status(400).json({ error: 'Falta el código de seguridad para correos de autenticación' });
  }

  try {
    await sendTlsEmail({
      to: to.trim(),
      type: type || 'auth',
      code: code ? String(code).trim() : '',
      subject,
      title,
      message
    });
    return res.status(200).json({ success: true, message: 'Correo enviado con éxito' });
  } catch (err) {
    console.error('Error al enviar correo:', err);
    return res.status(500).json({ error: err.message || 'No se pudo enviar el correo' });
  }
};
