# Validacion · 29/09/2026

## Arranque y registro verificados el 29/09

| Comprobacion | Resultado |
| --- | --- |
| `start.ps1 -Demo` | Arranque completo correcto; repetible sin reemplazar contrasenas ni datos |
| Docker Compose | 5 servicios saludables |
| Certificado en Windows y Chrome | HTTPS verificado; resuelta la confirmacion pendiente del 24/09 |
| Frontend compilado | Publicado en https://dacs2026.local/apexpredict/ |
| Angular | 9 pruebas aprobadas, incluidas 2 regresiones del formulario de ligas |
| Infraestructura | 8/8 comprobaciones; registro visible y rol player predeterminado |
| Integracion | 7/7; login PKCE, perfiles, persistencia, roles, CORS y Jolpica |
| Limites entre core y features | Correctos |
| Navegador: registro | Alta desde Iniciar sesion > Registrarse en espanol y retorno a Mis ligas |
| Navegador: reingreso | Cierre de sesion e ingreso con la cuenta recien creada |
| Navegador: ligas | Creacion desde el formulario y persistencia despues de recargar |
| Navegador: autorizacion | Jugador redirigido a acceso denegado al abrir /admin |
| Desarrollo en http://localhost:4200/ | Angular activo; calendario, sesion SSO y ligas persistidas verificados en Chrome, sin errores de JavaScript |

Se corrigio un problema detectado en la prueba visual: el formulario de ligas no
tenia un `FormGroup` asociado y el navegador recargaba la pagina al enviarlo.
Ahora el envio lo maneja Angular; las pruebas comprueban que no navega ni duplica
la peticion mientras espera la respuesta.

La cuenta creada para verificar el registro tiene sus credenciales unicamente en
`.local/registration-user.json` y conserva una `Liga de registro verificado`. Es una
cuenta de prueba: el usuario puede crear su cuenta propia desde el login. Se comprobo
ademas contra el BFF que el perfil es idempotente y esa cuenta recibe 403 en administracion.

La herramienta de navegador integrada sigue sin poder conectarse por un error de
su entorno; la verificacion se completo con `agent-browser` y Chrome local, sin
desactivar TLS. Captura: `.local/registro-verificado.png`.

La guia operativa esta en [arranque.md](arranque.md).

## Referencia de la ejecucion inicial del 24/09

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

## Incidencia del 24/09: resuelta el 29/09

El 24/09 Chrome devolvia `net::ERR_CERT_AUTHORITY_INVALID` porque faltaba completar
la confirmacion de Windows para importar el certificado al almacen `CurrentUser\Root`.
El 29/09 se comprobo que el certificado ya estaba confiado y se completo el recorrido
de registro e ingreso en Chrome con HTTPS verificado.

Las pruebas Node siguen usando el PEM explicito y verifican TLS sin excepciones.
