import tls from 'tls';

function sendTlsEmail(to, code) {
  return new Promise((resolve, reject) => {
    const user = 'tadeocdu@gmail.com';
    const pass = 'wpmnkgexoasjunas';

    const socket = tls.connect(465, 'smtp.gmail.com', () => {});
    socket.setEncoding('utf8');

    let step = 0;
    const timeout = setTimeout(() => {
      try { socket.destroy(); } catch {}
      reject(new Error('Tiempo de espera agotado al conectar con el servidor de correo.'));
    }, 12000);

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
        const subject = `Tu código de verificación ApexPredict: ${code}`;
        const body = [
          `From: "ApexPredict F1" <${user}>`,
          `To: <${to}>`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #0b0e14; color: #ffffff; padding: 32px; border-radius: 12px; max-width: 520px; margin: 20px auto; border: 1px solid #e10600; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">',
          '<div style="text-align: center; margin-bottom: 24px;">',
          '<h1 style="color: #e10600; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; font-family: monospace;">🏎️ APEXPREDICT</h1>',
          '<p style="color: #64748b; font-size: 11px; margin: 4px 0 0; letter-spacing: 1.5px; text-transform: uppercase;">Telemetría Oficial & Pronósticos F1</p>',
          '</div>',
          '<p style="color: #e2e8f0; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">Has solicitado restablecer tu contraseña. Utilizá el siguiente código de seguridad de 6 dígitos para continuar:</p>',
          '<div style="background: rgba(18, 23, 34, 0.9); border: 2px dashed #00f2fe; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">',
          `<span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #00f2fe; font-family: monospace; text-shadow: 0 0 12px rgba(0, 242, 254, 0.4);">${code}</span>`,
          '</div>',
          '<p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">⏱️ Este código expira en <strong>15 minutos</strong>.</p>',
          '<p style="color: #64748b; font-size: 12px; line-height: 1.4; margin: 16px 0 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">Si no solicitaste este cambio, podés ignorar este correo; tu cuenta permanece completamente segura.</p>',
          '</div>',
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
        reject(new Error(`Error del servidor de correo: ${data.trim()}`));
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { to, code } = req.body || {};

  if (!to || !code) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: to o code' });
  }

  try {
    await sendTlsEmail(to.trim(), code.trim());
    return res.status(200).json({ success: true, message: 'Correo enviado con éxito' });
  } catch (err) {
    console.error('Error al enviar correo:', err);
    return res.status(500).json({ error: err.message || 'No se pudo enviar el correo de verificación' });
  }
}
