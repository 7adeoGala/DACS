<#import "template.ftl" as layout>
<@layout.emailLayout>
  <h1 style="margin:0 0 12px;font-size:20px;color:#ffffff;">Restablecé tu contraseña</h1>
  <p style="margin:0 0 16px;">Recibimos una solicitud para cambiar la contraseña de tu cuenta en <strong>ApexPredict</strong>. Hacé clic en el siguiente botón para elegir una nueva clave:</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#e10600;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;">
      Restablecer contraseña
    </a>
  </p>
  <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;">Este enlace expira en ${linkExpirationFormatter(linkExpiration)}.</p>
  <p style="margin:0;font-size:13px;color:#94a3b8;">Si no solicitaste restablecer tu contraseña, ignorá este correo y tu clave permanecerá sin cambios.</p>
</@layout.emailLayout>
