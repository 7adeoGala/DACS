# Validacion · 24/09/2026

## Verificado

| Comprobacion | Resultado |
| --- | --- |
| Spring Boot 4.0.8 / Java 21, Maven verify | 19 tests, 0 fallos |
| Angular, ng test --watch=false | 7 tests, 0 fallos |
| Infraestructura, scripts/smoke-test.mjs | 8/8 |
| Integracion, scripts/integration-test.mjs | 7/7 |
| Dependencias de pantallas y core | Correctas |
| ng build --configuration=production --base-href=/apexpredict/ | Correcto; 299.21 kB iniciales, 84.66 kB estimados de transferencia |
| Nginx, nginx -t | Correcto |
| Docker Compose | 5 servicios saludables |
| ng serve | Activo en http://localhost:4200, compilacion de desarrollo correcta |

La integracion comprobo login de player, admin y observer mediante Authorization
Code + PKCE, validacion de los JWT en el BFF, perfil idempotente, persistencia y
aislamiento de ligas, 401/403, CORS en https://localhost:8080 y calendario/resultados
reales de Jolpica. Las pruebas criptograficas tambien rechazaron firmas adulteradas,
issuer incorrecto, otra audiencia y tokens vencidos.

## Pendiente de confirmacion de Windows

La interfaz de desarrollo se renderiza, pero Chrome devuelve
`net::ERR_CERT_AUTHORITY_INVALID` al conectar a los servicios HTTPS. Windows mantiene
abierta la ventana **Advertencia de seguridad** de `scripts/trust-browser-cert.ps1`.
La importacion al almacen `CurrentUser\Root` espera la aceptacion del usuario.

No se desactivo la validacion de certificados. Las pruebas Node confian en el PEM
explicito y por eso pudieron verificar TLS y autenticacion de extremo a extremo.
Todavia no se da por aprobado el login desde la interfaz del navegador.

Despues de aceptar la advertencia:

1. Recargar http://localhost:4200 y confirmar calendario e inicio de sesion.
2. Ingresar como `demo-player` (password en `.local/dev-users.json`).
3. Comprobar Mis ligas y rechazo al ingresar manualmente a `/admin`.
4. Repetir con `demo-admin` y verificar el acceso administrativo.
5. Verificar el mismo flujo en https://dacs2026.local/apexpredict/.

La herramienta de navegador integrada no pudo iniciar por un error de su entorno.
Se utilizo `agent-browser` con Chrome local para verificar el renderizado y obtener
el error TLS. La captura de esa comprobacion esta en `.local/dev-home.png`.
