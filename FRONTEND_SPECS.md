# APEXPREDICT — ESPECIFICACIÓN TÉCNICA DEL FRONTEND (FRONTEND_SPECS.md)
> **Documento maestro para diseño, componentes y estilos del frontend.**  
> Diseñado para que cualquier herramienta o IA genere vistas y hojas de estilo (CSS) 100% compatibles y modulares que puedan ser integradas directamente sin romper lógica ni contratos de API.

---

## 1. STACK TECNOLÓGICO Y ARQUITECTURA

| Capa | Tecnología / Versión | Descripción / Restricciones |
| :--- | :--- | :--- |
| **Framework** | **Angular 21** (`21.2.24`) | Standalone Components (`standalone: true`), sin `NgModule`. |
| **Reactividad** | **Angular Signals** | `signal()`, `computed()`, sin observables manuales en plantillas. |
| **Control Flow** | **Built-in Control Flow** | `@if (...) {} @else {}`, `@for (item of items(); track item.id) {}`, `@switch`. |
| **Estilos** | **Vanilla CSS Puro** | **NO TailwindCSS**, NO Bootstrap. Variables CSS nativas en `:root`. |
| **Tipografía** | **Outfit** + **JetBrains Mono** | Cargadas desde Google Fonts en `styles.css`. |
| **Autenticación** | **Keycloak OIDC PKCE** (`keycloak-js 26.2.4`) | Roles: `player` (usuario común prode) y `admin` (administrador). |
| **Zona Horaria** | `America/Argentina/Buenos_Aires` | Todo cronograma y fecha oficial se formatea a hora de Argentina (`ART` / `UTC-3`). |
| **APIs** | BFF Spring Boot + Jolpica Ergast + Open-Meteo | Endpoints REST JSON seguros con JWT Bearer Token. |

---

## 2. SISTEMA DE DISEÑO (DESIGN TOKENS & VARIABLES CSS)

Todos los estilos de las pantallas deben basarse exclusivamente en los tokens globales definidos en `src/styles.css`:

```css
:root {
  /* FONDOS Y SUPERFICIES (Dark Paddock Telemetry) */
  --bg: #090b0e;                /* Fondo principal de la app */
  --bg-subtle: #0f131a;         /* Fondo secundario, barras auxiliares */
  --surface: #141822;          /* Contenedores y secciones */
  --surface-card: #181d2a;     /* Tarjetas de contenido principal */
  --surface-hover: #1e2434;    /* Hover de elementos interactivos */
  --surface-elevated: #242c3d; /* Modales, popups y dropdowns */

  /* BORDES Y LÍNEAS */
  --line: rgba(255, 255, 255, 0.08);        /* Bordes estándar de 1px */
  --line-strong: rgba(255, 255, 255, 0.16); /* Bordes activos o seleccionados */
  --line-accent: rgba(225, 6, 0, 0.35);     /* Bordes con tinte de marca */

  /* IDENTIDAD F1 Y TELEMETRÍA */
  --red: #e10600;              /* Rojo oficial F1 / Apex */
  --red-bright: #ff1801;       /* Hover de botones principales */
  --red-glow: rgba(225, 6, 0, 0.3);
  --cyan: #00f2fe;             /* Telemetría, sesiones activas, DRS, datos técnicos */
  --green: #10b981;            /* Éxito, guardado, sesión en vivo */
  --green-glow: rgba(16, 185, 129, 0.25);
  --purple: #8b5cf6;           /* Vuelta rápida (Fastest Lap) */

  /* METALES DEL PODIO */
  --gold: #f5b000;             /* P1 / Oro / Ganador / Pole */
  --gold-glow: rgba(245, 176, 0, 0.35);
  --silver: #cbd5e1;           /* P2 / Plata */
  --silver-glow: rgba(203, 213, 225, 0.3);
  --bronze: #cd7f32;           /* P3 / Bronce */
  --bronze-glow: rgba(205, 127, 50, 0.3);

  /* TIPOGRAFÍA */
  --text-main: #f8fafc;        /* Texto blanco de alto contraste */
  --text-muted: #94a3b8;       /* Texto gris secundario, subtítulos */
  --text-dim: #64748b;         /* Placeholders y metadatos sutiles */

  /* FUENTES */
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace; /* Para cronómetros, horarios, puntos y códigos */

  /* RADIOS */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}
```

### Clases Utilitarias Reutilizables Ya Existentes en `styles.css`
* `.button`: Botón rojo de acento principal (`background: var(--red)`).
* `.button.small`: Botón compacto para acciones secundarias.
* `.button.quiet`: Botón transparente o gris con borde sutil para cancelar o acciones secundarias.
* `.badge`: Píldora de estado con texto pequeño.
* `.round-badge`: Píldora redondeada con borde (`border-radius: var(--radius-full)`).
* `.spotlight-card`: Tarjeta principal con fondo `var(--surface-card)`, borde `1px solid var(--line)` y padding generoso.
* `.form-card`: Tarjeta de formulario con bordes sutiles y padding.
* `.notice.success`: Alerta verde de éxito (`background: rgba(16, 185, 129, 0.15)`).
* `.notice.error`: Alerta roja de error (`background: rgba(225, 6, 0, 0.15)`).

---

## 3. MAPA DE PANTALLAS Y DETALLE TÉCNICO

### PANTALLA 0: SHELL GLOBAL (Header & Footer)
* **Archivo:** `src/app/app.component.html` y `src/app/app.component.ts`.
* **Componentes visuales:**
  * **Brand Logo:** `APEXPREDICT` (A roja estilizada).
  * **Navbar Horizontal:**
    * Link a `Calendario` (`/` - Inicio).
    * Link a `Mis ligas` (`/dashboard` - Solo visible si `auth.hasRole('player', 'admin')`).
    * Link a `Administración` (`/admin` - Solo visible si `auth.hasRole('admin')`).
  * **Acciones de Usuario:**
    * Si está deslogueado: Botón `Iniciar sesión ↗` (`auth.login()`).
    * Si está logueado: Botón `Salir · @username` (`auth.logout()`).
  * **Footer Oficial:** Créditos de datos a Jolpica F1 y Proyecto DACS.

---

### PANTALLA 1: GP ACTUAL & TELEMETRÍA (Landing / Home)
* **Ruta:** `/`
* **Componente:** `GpSpotlightComponent` (`src/app/features/home/gp-spotlight.component.ts`, `.html`, `.css`).
* **Propósito:** Mostrar la información oficial en tiempo real del próximo Gran Premio de F1, cronograma con zona horaria argentina, circuito vectorial, meteorología en vivo del autódromo y un teaser del prode (duelo directo).
* **Comportamiento según Autenticación:**
  * **No autenticado (Invitado):** Landing completa con todos los datos reales de la F1. El botón de pronóstico o duelo redirige a `auth.login()`. NO se muestran datos falsos ni paneles de usuario inexistente.
  * **Autenticado:** Muestra el voto actual del usuario si ya predijo el duelo y botón directo `Ingresar al Cockpit (Dashboard)`.
* **Módulos y Elementos:**
  1. **Barra Superior de Estado (Paddock Bar):**
     * Indicador pulsante en verde `FIN DE SEMANA DE CARRERA // FIA GRADE 1`.
     * Ubicación del circuito: Ciudad y País real.
     * `CRONOMETRAJE OFICIAL (ART / UTC-3)`.
  2. **Hero Header del Gran Premio:**
     * Chips: `ROUND 18 / 24`, `SPRINT WEEKEND` o `GRAND PRIX WEEKEND`.
     * Título principal: Bandera del país + Nombre del Gran Premio (ej: `🇺🇸 United States Grand Prix // COTA`).
     * Tarjeta de Bloqueo: Estado `PRONÓSTICOS ABIERTOS` o `PRONÓSTICOS BLOQUEADOS` y horario exacto en Argentina (`EEE d MMM · HH:mm hs (Arg)`).
  3. **Columna Izquierda: Cronograma Oficial ART:**
     * Lista de sesiones dinámicas (FP1, FP2, FP3 o Sprint Shootout, Sprint, Clasificación y Carrera).
     * Estados calculados automáticamente: `✓ FINALIZADA`, `🔴 EN VIVO`, `PRÓXIMA` o `PROGRAMADA`.
     * Widget de Meteorología Real: Consumido desde Open-Meteo API con coordenadas GPS reales del circuito. Muestra: Temp. Asfalto, Temp. Ambiente, Humedad, Viento, Riesgo de Lluvia y Estado del Radar.
  4. **Columna Central: Circuito Vectorial SVG & Telemetría:**
     * Trazado oficial en SVG del autódromo (`svgPath`).
     * Ficha técnica: Longitud (km), Cantidad de Vueltas, Récord de Pista y Piloto que lo ostenta, Zonas DRS.
  5. **Columna Derecha: Countdown & Duelo de Pilotos:**
     * Cuenta regresiva en tiempo real con 4 relojes (`DÍAS`, `HORAS`, `MINUTOS`, `SEGUNDOS`) en tipografía monoespaciada tabular.
     * Widget Duelo Directo (ej: `Lando Norris` vs `Max Verstappen`):
       * Porcentaje de votación comunitaria y barras de progreso por escudería.
       * Si no está logueado: botón `Iniciá sesión para pronosticar`.
  6. **Mini Leaderboard del Paddock (Top 4):**
     * Muestra las 4 primeras posiciones del prode global con puntajes acumulados en tiempo real.
  7. **Tabla Oficial de Posiciones de Pilotos F1 (Jolpica Ergast API):**
     * Posición en el Campeonato Mundial, Piloto, Escudería, Puntos reales y Victorias.

---

### PANTALLA 2: DASHBOARD / COCKPIT DE PRONÓSTICOS Y LIGAS
* **Ruta:** `/dashboard` (y `/join/:inviteCode`)
* **Acceso:** Protegido con `requireRole('player', 'admin')`.
* **Componente:** `DashboardComponent` (`src/app/features/dashboard-view/dashboard.component.ts`).
* **Estructura de Pestañas Principales:**

```
[ 🎯 Pronóstico GP ]   [ 🏆 Mis Ligas & Podios ]   [ 📊 Tabla Global ]   [ 📜 Historial & Puntos ]
```

#### PESTAÑA A: `🎯 Pronóstico GP`
* **Propósito:** Permitir al usuario enviar o editar su pronóstico para el Gran Premio activo antes de que comience la sesión (`isLocked === false`).
* **Campos del Pronóstico:**
  1. **Podio Top 3 de la Carrera:**
     * **P1 (Oro / Ganador):** Selector de piloto entre los 20 pilotos oficiales de F1 2026.
     * **P2 (Plata):** Selector de piloto.
     * **P3 (Bronce):** Selector de piloto.
     * *(Validación: P1, P2 y P3 deben ser seleccionados y diferentes entre sí).*
  2. **Pole Position:** Selector del piloto que obtendrá la Pole Position el sábado.
  3. **Duelo Directo Fin de Semana:** Selección entre los dos pilotos designados para la fecha (ej: Norris vs Verstappen).
  4. **Telemetría de Carrera (Sliders / Contadores numéricos):**
     * **Safety Cars:** Número estimado de apariciones del coche de seguridad (0 a 10).
     * **Abandonos (DNFs):** Número estimado de coches que no terminarán la carrera (0 a 20).
* **Acciones:**
  * Botón `🏁 Enviar Pronóstico Oficial` / `Actualizar Pronóstico`.
  * Guarda o actualiza en la base de datos PostgreSQL vía `POST /predictions/session/{sessionId}`.
  * Si la carrera ya inició (`isLocked === true`), los controles quedan deshabilitados en modo solo lectura (`disabled`).

#### PESTAÑA B: `🏆 Mis Ligas & Podios` (LIGAS PRIVADAS)
* **REGLA DE ORO DE PRIVACIDAD (CRÍTICO):**
  * **Las ligas privadas son 100% invisibles y confidenciales:** NO se pueden buscar públicamente, NO hay listado de exploración, y NO se expone cuántas ligas existen en el sistema.
  * **El usuario SOLO ve las ligas a las que pertenece** (`leagues().length`).
  * **Formas de acceso:** Únicamente creándola o uniéndose mediante Link de Invitación o Código UUID compartido por el creador.
* **Sub-Navegación Interna:**
  1. **Sub-Tab `🏆 Mis Ligas (N)`:**
     * Píldoras selectoras de ligas del usuario (`league-pill`).
     * Si no pertenece a ninguna: Pantalla vacía invitando a "Crear Liga" o "Unirme por Link".
     * Si selecciona una liga:
       * Encabezado con Nombre, Descripción y Badge `🔒 Protegida con Contraseña` o `🌐 Acceso Libre`.
       * **Caja de Invitación Oficial:** URL generada (`https://.../join/{inviteCode}`) con botones `🔗 Copiar Link` y `📋 Código`.
       * **Podio Top 3 de la Liga:** Tarjeta con 3 columnas en pedestales (Oro P1 con corona 👑, Plata P2, Bronce P3).
       * **Tabla de Clasificación de la Liga:** Posición (`#1`, `#2`), Jugador / Escudería, Puntos Totales y Cantidad de Carreras Pronosticadas.
  2. **Sub-Tab `➕ Crear Nueva Liga`:**
     * Formulario:
       * Nombre de la liga (obligatorio, 1-100 caracteres).
       * Descripción (opcional).
       * 🔒 Contraseña de Acceso (opcional): Si se define, nadie podrá unirse sin conocer la clave.
     * Botón `🏁 Crear Liga y Persistir en Base de Datos`.
  3. **Sub-Tab `🔗 Unirse por Link / Clave`:**
     * Campo para pegar Link completo (`https://.../join/UUID`) o Código UUID.
     * Campo Contraseña (si la liga la requiere).
     * Botón `🚀 Unirme a la Liga`.
     * *(Si el usuario ingresa a la app mediante `/join/:inviteCode`, el código se auto-completa y abre esta pestaña directamente).*

#### PESTAÑA C: `📊 Tabla Global`
* **Propósito:** Clasificación general en tiempo real de todos los usuarios registrados en ApexPredict.
* **Componentes:**
  * Podio Top 3 Global (P1 Oro, P2 Plata, P3 Bronce con puntajes acumulados).
  * Tabla completa de posiciones: Puesto, Nombre de Usuario, Puntos Totales, Pronósticos Realizados.

#### PESTAÑA D: `📜 Historial & Puntos`
* **Propósito:** Mostrar los resultados de pronósticos anteriores de Grandes Premios ya puntuados.
* **Componentes:**
  * Tarjetas por carrera con desglose de puntos obtenidos:
    * Aciertos en Podio (+X pts).
    * Acierto en Pole (+X pts).
    * Acierto en Duelo (+X pts).
    * Acierto en Safety Cars (+X pts).
    * Acierto en DNFs (+X pts).
    * Puntaje total de la fecha.

---

### PANTALLA 3: ADMINISTRACIÓN
* **Ruta:** `/admin`
* **Acceso:** Solo usuarios con rol Keycloak `admin`.
* **Componente:** `AdminComponent` (`src/app/features/admin/admin.component.ts`).
* **Propósito:** Verificación de conexión y estado del backend.

---

### PANTALLA 4: ACCESO RESTRINGIDO (403 Forbidden)
* **Ruta:** `/forbidden`
* **Componente:** `ForbiddenComponent` (`src/app/features/forbidden/forbidden.component.ts`).
* **Propósito:** Aviso cuando un usuario sin rol administrativo intenta entrar a `/admin`. Botón para volver al inicio.

---

## 4. CATÁLOGO DE PILOTOS Y CIRCUITOS (DATOS ESTÁTICOS Y OFICIALES)

### Pilotos F1 Oficiales (`F1_DRIVERS` en `api.models.ts`)
Cada piloto cuenta con `id`, `name`, `code`, `number`, `team`, y `teamColor`:
* `verstappen`: Max Verstappen (#1, Red Bull Racing, `#3671C6`)
* `norris`: Lando Norris (#4, McLaren, `#FF8000`)
* `leclerc`: Charles Leclerc (#16, Ferrari, `#E80020`)
* `hamilton`: Lewis Hamilton (#44, Ferrari, `#E80020`)
* `piastri`: Oscar Piastri (#81, McLaren, `#FF8000`)
* `russell`: George Russell (#63, Mercedes, `#27F4D2`)
* `antonelli`: Kimi Antonelli (#12, Mercedes, `#27F4D2`)
* `sainz`: Carlos Sainz (#55, Williams, `#64C4FF`)
* `alonso`: Fernando Alonso (#14, Aston Martin, `#229971`)
* `stroll`: Lance Stroll (#18, Aston Martin, `#229971`)
* `lawson`: Liam Lawson (#30, Red Bull Racing, `#3671C6`)
* `albon`: Alexander Albon (#23, Williams, `#64C4FF`)
* `gasly`: Pierre Gasly (#10, Alpine, `#0093CC`)
* `doohan`: Jack Doohan (#7, Alpine, `#0093CC`)
* `colapinto`: Franco Colapinto (#43, Alpine, `#0093CC`)
* `tsunoda`: Yuki Tsunoda (#22, Racing Bulls, `#6692FF`)
* `hadjar`: Isack Hadjar (#6, Racing Bulls, `#6692FF`)
* `hulkenberg`: Nico Hülkenberg (#27, Stake Sauber, `#52E252`)
* `bortoleto`: Gabriel Bortoleto (#5, Stake Sauber, `#52E252`)
* `ocon`: Esteban Ocon (#31, Haas, `#B6BABD`)
* `bearman`: Oliver Bearman (#87, Haas, `#B6BABD`)

---

## 5. MAPEO COMPLETO DE ENDPOINTS DE LA API (BFF / BACKEND)

Todos los endpoints son servidos a través del BFF (`environment.apiUrl`):

| Método | Endpoint | Rol Requerido | Payload (Request Body) | Retorno (Response) | Uso en Frontend |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/calendar/{season}` | Público | Ninguno | `Race[]` | Calendario oficial de carreras |
| `GET` | `/sessions/next` | Público | Ninguno | `NextSession` | Datos del próximo GP, fecha y bloqueo |
| `PUT` | `/me` | `player` / `admin` | `{}` | `Profile` | Sincroniza y retorna el usuario actual |
| `GET` | `/predictions/current` | `player` / `admin` | Ninguno | `PredictionDetail` | Pronóstico del usuario para el GP actual |
| `POST` | `/predictions/session/{id}` | `player` / `admin` | `SubmitPrediction` | `PredictionDetail` | Envía o actualiza pronóstico de la fecha |
| `GET` | `/predictions/history` | `player` / `admin` | Ninguno | `PredictionHistoryItem[]`| Historial de puntos y pronósticos del user |
| `GET` | `/leagues` | `player` / `admin` | Ninguno | `League[]` | **Solo retorna las ligas del usuario logueado** |
| `POST` | `/leagues` | `player` / `admin` | `{ name, description, password }` | `League` | Crea una nueva liga privada |
| `POST` | `/leagues/join/{inviteCode}`| `player` / `admin` | `{ password? }` | `League` | Unirse a liga con código y contraseña |
| `GET` | `/leagues/{id}/leaderboard`| `player` / `admin` | Ninguno | `LeaderboardEntry[]`| Tabla de puntos interna de una liga |
| `GET` | `/leaderboard/global` | Público | Ninguno | `LeaderboardEntry[]`| Tabla de clasificación general de todos |
| `GET` | `/admin/status` | `admin` | Ninguno | `{ status: string }` | Estado administrativo del servicio |

---

## 6. INSTRUCCIONES PARA GENERAR O APLICAR ESTILOS

Cuando diseñes o generes HTML y CSS con otra IA o herramienta:
1. **Mantener selectores y nombres de clases:** Utilizá clases semánticas (`.gp-hero-header`, `.telemetry-main-grid`, `.sidebar-schedule`, `.meteo-widget`, `.podium-container`, `.leaderboard-table`, `.dashboard-tabs`, etc.).
2. **Utilizar Variables CSS:** En lugar de colores hardcodeados como `#121212` o `rgba(...)`, usá siempre `var(--bg)`, `var(--surface-card)`, `var(--red)`, `var(--cyan)`, `var(--line)`.
3. **No eliminar Signals ni Bindings Angular:** Las directivas `[class.active]`, `@if`, `@for`, `(click)`, `formControlName` y las llamadas a señales como `leagues()`, `selectedLeague()`, `session()` deben conservarse intactas para que la lógica de la aplicación continúe funcionando a la perfección.
4. **Respetar la Privacidad de Ligas:** No crear interfaces de "búsqueda pública de ligas" ni contadores totales de ligas de la plataforma. La navegación en ligas debe contener exclusivamente: **Mis Ligas**, **Crear Nueva Liga**, y **Unirse por Link o Código**.
