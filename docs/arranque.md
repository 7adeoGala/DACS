# Iniciar ApexPredict y crear tu perfil

## En esta computadora: un solo comando

Abrir PowerShell en la carpeta del proyecto y ejecutar:

```powershell
cd C:\GitHub\DACS
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

El script inicia Docker Desktop si hace falta, instala las dependencias de Angular
la primera vez o cuando cambia el lockfile, compila y publica el frontend, construye
el BFF y levanta los cinco servicios. Espera a que estén saludables, configura el
registro de cuentas y ejecuta las comprobaciones de infraestructura. La primera
ejecución necesita Internet para descargar dependencias e imágenes.

Cuando aparezca **ApexPredict listo**, abrir:

**https://dacs2026.local/apexpredict/**

Podés cerrar la terminal al terminar el arranque normal: los contenedores siguen
funcionando mientras Docker Desktop esté abierto. No hace falta ejecutar Java,
PostgreSQL, Keycloak ni `ng serve` por separado para usar esta dirección.

## Crear una cuenta propia

1. En la portada, pulsar **Crear cuenta**. También podés ir a **Iniciar sesión**
   y seleccionar el enlace **Registrarse** del formulario.
2. Completar nombre, apellido, correo, nombre de usuario y contraseña de al menos
   **10 caracteres**, con su confirmación.
3. Enviar el formulario. La aplicación vuelve a **Mis ligas** con la sesión iniciada.
4. El perfil se guarda automáticamente en PostgreSQL. Podés crear tu primera liga.
5. Para volver a ingresar, usar el usuario o el correo y la contraseña elegida.

Las nuevas cuentas reciben el rol `player`; no reciben permisos de administrador.
Las contraseñas las administra Keycloak. En este entorno local no se envían correos
de verificación ni de recuperación; todavía no hay un servidor SMTP configurado.
Los usuarios y sus ligas se conservan al apagar y volver a iniciar el proyecto.

El alcance actual permite consultar el calendario, registrarse, ingresar y crear
ligas. La carga de predicciones y el cálculo de puntos son funcionalidades pendientes.

## Desarrollar con recarga automática

Para arrancar todo y además abrir el servidor de Angular:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1 -Dev
```

Abrir **http://localhost:4200/** y mantener esa terminal abierta. `Ctrl+C` detiene
Angular; los servicios Docker siguen activos. Las llamadas a Keycloak y al BFF
usan HTTPS, también desde el frontend de desarrollo.

Si la infraestructura ya está funcionando, alcanza con:

```powershell
cd C:\GitHub\DACS\frontend\apexpredict
npm start
```

Los cambios se ven automáticamente en el puerto 4200. Para publicarlos en
`https://dacs2026.local/apexpredict/`, volver a ejecutar `start.ps1` sin `-Dev`.

## Detener, revisar y volver a arrancar

Desde `C:\GitHub\DACS`:

```powershell
docker compose ps                         # Estado de los cinco servicios
docker compose logs --tail 80 bff nginx keycloak
docker compose stop                       # Apagar conservando usuarios y ligas
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

`docker compose down` también conserva los volúmenes. **No usar `down -v`** si
querés conservar usuarios, perfiles y ligas: esa opción borra los volúmenes.

## Preparar otra computadora: solo la primera vez

Requisitos: Windows, Docker Desktop con contenedores Linux, Node.js **22.12+ o
24+** compatible con Angular 21, Git con OpenSSL y Java con `keytool`.
El backend se compila con Java 21 dentro de Docker; solo necesitás JDK 21 en
Windows si querés compilarlo fuera de Docker.

En la raíz del repositorio:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-env.ps1
.\make-cert.bat
.\export-to-pem.bat
.\export-to-p12.bat
.\export-p12-to-jks.bat
```

En una terminal **como administrador**, desde la misma carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-hosts.ps1
.\import-to-java.bat
```

Esto configura `127.0.0.1 dacs2026.local` e importa el certificado al Java local.
Luego, desde la sesión de Windows con la que usarás el navegador:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/trust-browser-cert.ps1
```

Aceptar la confirmación de Windows para confiar en **dacs2026.local**. El script
importa únicamente el certificado de este proyecto al almacén del usuario actual.
Después ejecutar `start.ps1` como se indica arriba.

Los archivos `.env` y `infra/certs/generated/` se generan localmente; no se suben
a Git. Conservá el `.env` asociado a los volúmenes existentes: regenerar secretos
no cambia las contraseñas que PostgreSQL y Keycloak ya tienen guardadas.

## Cuentas de prueba y herramientas

El registro permite usar tu cuenta propia sin crear usuarios de demostración.
Para preparar las cuentas de las pruebas automatizadas:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1 -Demo
node scripts/integration-test.mjs
```

`demo-player`, `demo-admin` y `demo-observer` tienen sus credenciales locales en
`.local/dev-users.json`, excluido de Git. No hay contraseñas fijas en la documentación.

| Recurso | Dirección / credenciales |
| --- | --- |
| Aplicación | https://dacs2026.local/apexpredict/ |
| Frontend en desarrollo | http://localhost:4200/; requiere `-Dev` o `npm start` |
| Estado del BFF | https://dacs2026.local/api/health |
| Keycloak Admin | https://dacs2026.local/auth/admin/; `KEYCLOAK_ADMIN` y `KEYCLOAK_ADMIN_PASSWORD` de `.env` |
| pgAdmin | https://dacs2026.local/pgadmin/; `PGADMIN_EMAIL` y `PGADMIN_PASSWORD` de `.env` |

## Si algo no arranca

| Síntoma | Qué revisar |
| --- | --- |
| Docker no responde | Abrir Docker Desktop, esperar el motor Linux y repetir `start.ps1`. El diagnóstico queda en `.local/docker-start.log`. |
| Dominio no encontrado | Ejecutar `scripts/setup-hosts.ps1` como administrador. |
| Advertencia del certificado | Ejecutar `scripts/trust-browser-cert.ps1`, aceptar la confirmación y reiniciar el navegador. No desactivar la validación HTTPS. |
| Puerto 80, 443 u 8080 ocupado | Revisar qué servicio lo utiliza antes de iniciar Nginx; no cambiar el dominio ni los puertos sin actualizar las URLs de autenticación. |
| Angular no instala o compila | Ejecutar `start.ps1 -InstallDependencies`; utiliza npm 11.6.2 para evitar el error de npm 11.0.0. |
| `EPERM` al reemplazar `esbuild.exe` | Detener el `ng serve` del proyecto con `Ctrl+C` antes de reinstalar dependencias; luego repetir `start.ps1`. |
| No aparece Registrarse | Ejecutar `node scripts/configure-keycloak.mjs` y volver a abrir el login desde la aplicación. |
| Calendario no disponible | Revisar Internet y `docker compose logs --tail 80 bff`; los datos vienen de Jolpica. |
| Certificado vencido | Revisar `infra/certs/generated/`, renovar el certificado local y volver a importar la confianza de Java y Windows antes de recrear los servicios. |

El registro y la asignación de roles se apoyan en la
[configuración de usuarios de Keycloak](https://www.keycloak.org/docs/latest/server_admin/).
