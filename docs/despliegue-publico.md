# Correccion del despliegue publico - 16/10/2026

Objetivo: crear una cuenta o iniciar sesion en Vercel, volver a `/dashboard`
mediante Authorization Code + PKCE S256 y cargar el perfil y las ligas desde
Angular -> BFF -> servicio de dominio -> PostgreSQL.

Base local revisada: `fb240448de1c1845b58b58c117cc8037eb798f13` en `main`.
Los cambios de esta correccion aun no estan publicados. El commit desplegado en
Vercel/Render no pudo leerse desde los paneles; no se infiere a partir del checkout.

## Estado publico comprobado antes de cambiar configuracion

Pruebas HTTPS sin credenciales, con verificacion TLS y timeout de 45 segundos.

| Comprobacion | Resultado |
| --- | --- |
| `GET https://dacs-nine.vercel.app/` | 200 |
| Bundle publico `chunk-J6HU66EE.js` | Contiene `https://dacs-pmkx.onrender.com/bff` (incorrecto) |
| Discovery de `https://dacs-3-dswy.onrender.com/auth/realms/apexpredict` | 200; issuer HTTPS correcto |
| Login y registro con callback `https://dacs-nine.vercel.app/dashboard`, PKCE S256 | Ambos 400, `redirect_uri` invalido |
| Login y registro con callback `http://localhost:4200/dashboard`, PKCE S256 | Ambos 200; formularios presentes |
| `GET https://dacs-pmkx.onrender.com/backend/ping` | 200, `apexpredict-domain-service` |
| `GET https://dacs-pmkx.onrender.com/bff/ping` | 404 |
| `GET https://dacs-2-crv9.onrender.com/bff/ping` | 200, `apexpredict-bff` |
| `GET https://dacs-1-v4ik.onrender.com/conector/ping` | 200, `apexpredict-f1-connector` |
| BFF `/backendping` y `/conectorping` | Ambos 502; causa pendiente de logs y variables de Render |
| Preflight `OPTIONS /bff/me`, origen Vercel, metodo PUT, headers Authorization/Content-Type | 200, origen exacto permitido |
| Mismo preflight con `https://attacker.invalid` | 403, sin origen permitido |
| BFF `/leagues` y `/sessions/next` sin token | 401 |

El 200 de un ping no acredita conectividad con PostgreSQL. Los 502 no prueban
por si solos una URL incorrecta, falta de RAM o arranque en frio. Leer los logs
del mismo intento antes de decidir el cambio operativo.

## Cambios locales

- Produccion Angular apunta al BFF `https://dacs-2-crv9.onrender.com/bff`.
- El realm versionado permite el hostname concreto de Vercel en callbacks,
  origenes y cierre de sesion. Se conservan los destinos locales; se eliminan
  el comodin de hostname de Vercel y el origen derivado `+`.
- En BFF y dominio, los GET de `/sessions/next`, `/leaderboard/global`,
  `/predictions/current`, `/predictions/history`, `/predictions/session/{id}` y
  `/notifications`, y el POST de `/predictions/session/{id}`, exigen `player`
  o `admin`. Son datos del dashboard privado; no se habilita acceso anonimo.
  Metodos o rutas no enumerados siguen en `denyAll()`; administracion exige admin.
- Se mantienen firma, issuer, vencimiento y audiencias JWT. El Bearer se reenvia
  al dominio mediante la configuracion Feign exclusiva de `DomainClient`.
- `environment.local.ts` y `production,local` conservan API/Keycloak locales en
  `start.ps1`; `ng serve` sigue usando `environment.development.ts`.
- Las pruebas del formulario abren la pestaña de ligas y proporcionan los mocks
  de las consultas actuales del dashboard.

## Aplicar al cliente existente de Keycloak

Se necesita una sesion administrativa conectada. No usar las credenciales de
`.env` como si fueran las de Render. No borrar el realm, clientes ni usuarios.

1. Abrir `https://dacs-3-dswy.onrender.com/auth/admin/`, seleccionar el realm
   **apexpredict** y **Clients -> apexpredict-web -> Settings**.
2. Leer y registrar los valores persistidos antes del cambio. Conservar otros
   callbacks legitimos existentes. Reemplazar las entradas `https://*.vercel.app`
   y `https://*.vercel.app/*` por los destinos concretos de abajo. En Web origins,
   reemplazar `+` por los origenes explicitos autorizados si esta presente.
3. Preparar estos valores, conservando el desarrollo local:

| Campo | Entradas de esta aplicacion |
| --- | --- |
| Valid redirect URIs | `https://dacs-nine.vercel.app/*`, `https://dacs2026.local/apexpredict/*`, `http://localhost:4200/*`, `https://localhost:4200/*` |
| Web origins | `https://dacs-nine.vercel.app`, `https://dacs2026.local`, `http://localhost:4200`, `https://localhost:4200` |
| Valid post logout redirect URIs | Las mismas cuatro entradas de Valid redirect URIs |

4. Revisar el cambio y guardarlo cuando este autorizado. Volver a leer los campos
   para confirmar su persistencia.
5. Comprobar cliente publico (Client authentication desactivado), Standard flow
   activado, PKCE S256 requerido y Direct access grants desactivado. No introducir
   client secret en Angular.
6. En Client scopes / mappers del cliente, comprobar las audiencias de access
   token `apexpredict-bff` y `apexpredict-backend` y la emision de roles de realm.
   Comprobar el rol inicial player para registros nuevos; nunca admin.

Editar `infra/keycloak/apexpredict-realm.json` y reiniciar no actualiza el realm
persistido: `start --import-realm` omite realms existentes, segun la
[documentacion de Keycloak](https://www.keycloak.org/server/importExport).
`scripts/configure-keycloak.mjs` sigue siendo exclusivo del entorno local.

## Render: leer configuracion y logs antes de aplicar

Confirmar repositorio `7adeoGala/DACS`, rama y commit en cada servicio. Los
Dockerfiles locales son los siguientes; su seleccion real en Render queda pendiente.

| Host Render | Root directory | Dockerfile relativo |
| --- | --- | --- |
| `dacs-2-crv9.onrender.com` (BFF) | `backend/bff` | `Dockerfile` |
| `dacs-pmkx.onrender.com` (dominio) | `backend/domain-service` | `Dockerfile` |
| `dacs-1-v4ik.onrender.com` (conector) | `backend/f1-connector` | `Dockerfile` |
| `dacs-3-dswy.onrender.com` (Keycloak) | `infra/keycloak` | `Dockerfile` |

En BFF, comparar las variables reales con:

```text
CORS_ORIGINS=https://dacs-nine.vercel.app
DOMAIN_SERVICE_URL=https://dacs-pmkx.onrender.com/backend
F1_CONNECTOR_URL=https://dacs-1-v4ik.onrender.com/conector
KEYCLOAK_ISSUER=https://dacs-3-dswy.onrender.com/auth/realms/apexpredict
KEYCLOAK_JWK_SET_URI=https://dacs-3-dswy.onrender.com/auth/realms/apexpredict/protocol/openid-connect/certs
SERVER_SSL_ENABLED=false
```

`SERVER_SSL_ENABLED=false` corresponde al HTTP del contenedor cuando Render
termina TLS. El browser sigue usando HTTPS. Conservar el `PORT` provisto por
Render. La propiedad `server.ssl.key-store-password` referencia `CERT_PASSWORD`:
comprobar su resolucion sin imprimir su valor ni cambiarlo a ciegas.

En dominio, comprobar los mismos `KEYCLOAK_ISSUER` y `KEYCLOAK_JWK_SET_URI`, y los
secretos PostgreSQL `DB_URL`, `DB_USER`, **`APP_DB_PASSWORD`**. El codigo no lee
`DOMAIN_DB_PASSWORD`. Si hay un error de base, revisar SSL de JDBC, conectividad,
usuario y logs de Flyway. Hibernate debe conservar `ddl-auto: validate`. No borrar
tablas, volumenes ni historial Flyway para diagnosticar.

Guardar variables y desplegar BFF/dominio solo despues de revisar la diferencia
respecto de los valores actuales y autorizarla. Repetir `/bff/backendping` y
`/bff/conectorping`: ambos deben devolver 200 con la identidad de su dependencia.

## Compilar y publicar el frontend

Desde la raiz:

```powershell
npm --prefix frontend/apexpredict run build -- --configuration=production
```

`vercel.json` construye desde la raiz del repo y publica
`frontend/apexpredict/dist/apexpredict/browser`. El dominio es
`https://dacs-nine.vercel.app`, con base `/`; las rutas SPA vuelven a `index.html`.
Una variable arbitraria de Vercel no sustituye `environment.ts`.

Despues de autorizar la publicacion, confirmar equipo/proyecto DACS, publicar el
commit revisado y registrar el SHA que indica Vercel. Leer el `index.html`
publico y sus chunks vigentes: deben contener la API `https://dacs-2-crv9.onrender.com/bff`
y no `https://dacs-pmkx.onrender.com/bff`. No exigir un nombre de chunk fijo.

Para Nginx local, `start.ps1` usa este build y `publish-frontend.mjs` rechaza el
paquete de Vercel:

```powershell
npm --prefix frontend/apexpredict run build -- --configuration=production,local --base-href=/apexpredict/
node scripts/publish-frontend.mjs
```

## Validacion final pendiente en produccion

1. Login y Crear cuenta muestran los formularios de Keycloak sin 400, tambien
   en una sesion nueva del navegador.
2. Completar registro e ingreso, comprobar `response_type=code`,
   `code_challenge_method=S256`, retorno a `/dashboard` y canje de codigo sin CORS.
   No registrar el codigo ni los tokens en reportes.
3. El access token debe tener issuer Render, las dos audiencias y player/admin.
   Verificar en Network `PUT /bff/me` y `GET /bff/leagues` con respuesta 200.
4. Recargar y comprobar el mismo perfil/ligas; revisar persistencia en el dominio
   o PostgreSQL si las respuestas o logs dan un error. No crear datos ajenos.
5. Confirmar datos de sesion, ranking y predicciones. Un 404 por ausencia de
   proxima sesion no es un fallo de autenticacion; requiere datos de calendario.
6. Sin token, las rutas privadas dan 401; con token sin player/admin, 403;
   player recibe 403 en administracion y admin accede. No usar cuentas admin
   de infraestructura como jugadores.
7. Cerrar sesion vuelve al frontend. Los tokens siguen en memoria; no agregar
   almacenamiento de tokens ni credenciales al frontend.

## Limites de esta ejecucion

No hubo navegador conectado ni acceso al cliente persistido de Keycloak o a
variables/logs privados de Render. El conector de Vercel disponible no encontro
el proyecto DACS en su equipo conectado. No se modifico produccion, no se hizo
push ni deploy y no se crearon cuentas de prueba remotas.

Por eso no se acredita aun login/registro completo, canje de codigo, JWT real,
persistencia Supabase, datos del dashboard o logout en produccion. La aprobacion
final debe cubrir el cliente existente de Keycloak, los cambios concretos de
Render que resulten de su lectura y la publicacion del commit revisado.
