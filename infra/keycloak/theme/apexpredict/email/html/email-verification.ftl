<#import "template.ftl" as layout>
<@layout.emailLayout>
  <h1 style="margin:0 0 12px;font-size:20px;color:#ffffff;">Verificá tu correo electrónico</h1>
  <p style="margin:0 0 16px;">Gracias por registrarte en <strong>ApexPredict</strong>. Para activar tu cuenta y empezar a cargar tus pronósticos de Fórmula 1, hacé clic en el botón de abajo:</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#e10600;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;">
      Verificar mi cuenta
    </a>
  </p>
  <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;">Este enlace expira en ${linkExpirationFormatter(linkExpiration)}.</p>
  <p style="margin:0;font-size:13px;color:#94a3b8;">Si no creaste esta cuenta, podés ignorar este mensaje con seguridad.</p>
</@layout.emailLayout>
