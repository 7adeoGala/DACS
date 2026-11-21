<#macro emailLayout>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ApexPredict</title>
</head>
<body style="margin:0;padding:0;background-color:#090b0e;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#090b0e;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#111622;border:1px solid #222938;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:2px solid #e10600;background-color:#0d1118;">
              <span style="font-size:20px;font-weight:800;letter-spacing:1px;color:#ffffff;">APEX</span>
              <span style="font-size:20px;font-weight:800;letter-spacing:1px;color:#e10600;"> PREDICT</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;line-height:1.6;font-size:15px;color:#e2e8f0;">
              <#nested>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background-color:#0d1118;border-top:1px solid #1e2433;font-size:12px;color:#94a3b8;">
              ApexPredict · Plataforma oficial de pronósticos de Fórmula 1. Este correo fue generado automáticamente.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
</#macro>
