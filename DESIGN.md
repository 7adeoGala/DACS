# APEXPREDICT — DESIGN SYSTEM & FRONTEND SPECIFICATION (DESIGN.md)
> **Versión:** 2.0.0  
> **Estado:** Activo / En Producción  
> **Target:** Frontend Angular 21 (Standalone Components + Signals + Vanilla CSS)  
> **Integraciones:** Jolpica F1 API (Datos Oficiales F1) + Spring Boot BFF / Domain Service (PostgreSQL Supabase) + Keycloak OIDC  
> **Zona Horaria Oficial:** `America/Argentina/Buenos_Aires` (`ART` / `UTC-3` / `hs (Arg)`)

---

## 1. VISIÓN Y FILOSOFÍA DE DISEÑO

### 1.1. Concepto: "Minimalist Telemetry / High-Tech Paddock"
ApexPredict no es un juego genérico ni una interfaz gamer recargada de luces RGB chillonas. Su estética se inspira en las consolas de telemetría de los garajes de Fórmula 1 (Mercedes AMG Petronas, Ferrari Mission Control, F1 TV Pro y Aston Martin Telemetry):
- **Minimalismo de Alto Rendimiento:** Fondos oscuros profundos, líneas ultrafinas de 1px con opacidades sutiles, tipografía geométrica de alta legibilidad y jerarquía estricta.
- **Glassmorphism Funcional:** Tarjetas con fondos translúcidos (`rgba(20, 24, 34, 0.75)`), desenfoque de fondo (`backdrop-filter: blur(16px)`), y bordes con degradados de luz sutiles que aportan profundidad sin distraer.
- **Data-Dense pero Aireado:** La gran cantidad de datos de F1 (tiempos de vuelta, sectores, sesiones de libres, clasificaciones, puntos y pronósticos) se organiza en tarjetas modulares, grillas limpias y píldoras compactas (*badges*).
- **Acentos de Competición:** El color principal es el **Apex Red** (`#e10600`), complementado por tonos de telemetría: **Electric Cyan** (`#00f2fe`) para tecnología/DRS, **Podium Gold** (`#ffd166`), **Track Green** (`#10b981`) y tonos metálicos para el podio.

---

## 2. SISTEMA DE DISEÑO (DESIGN TOKENS)

Todas las pantallas deben consumir exclusivamente los tokens de variables CSS definidos en `:root`:

```css
:root {
  /* FONDOS Y SUPERFICIES (DARK PALETTE) */
  --bg: #090b0e;                /* Lienzo base global */
  --bg-subtle: #0f131a;         /* Fondos secundarios, subbarras */
  --surface: #141822;          /* Contenedores y secciones */
  --surface-card: #181d2a;     /* Tarjetas principales de contenido */
  --surface-hover: #1e2434;    /* Estados hover en filas y tarjetas */
  --surface-elevated: #242c3d; /* Modales, tooltips y menús flotantes */

  /* LÍNEAS Y BORDES */
  --line: rgba(255, 255, 255, 0.08);       /* Separadores y bordes estándar */
  --line-strong: rgba(255, 255, 255, 0.16);/* Bordes al foco o activos */
  --line-accent: rgba(225, 6, 0, 0.35);    /* Resaltados con el color de marca */

  /* COLORES DE IDENTIDAD F1 */
  --red: #e10600;              /* Rojo oficial F1 / Apex */
  --red-bright: #ff1801;       /* Hover y estados activos de botones primarios */
  --red-glow: rgba(225, 6, 0, 0.28); /* Resplandor difuso */
  --cyan: #00f2fe;             /* Telemetría, sesiones activas, DRS */
  --green: #10b981;            /* Éxito, guardado, liga abierta, sesión en vivo */
  --green-glow: rgba(16, 185, 129, 0.25);
  --purple: #8b5cf6;           /* Vuelta rápida (Fastest Lap) */

  /* METALES DEL PODIO */
  --gold: #ffd166;             /* P1 / Primer Lugar / Pole */
  --silver: #cbd5e1;           /* P2 / Segundo Lugar */
  --bronze: #cd7f32;           /* P3 / Tercer Lugar */

  /* TIPOGRAFÍA */
  --text-main: #f8fafc;        /* Texto principal (alto contraste) */
  --text-muted: #94a3b8;       /* Etiquetas, metadatos y subtítulos */
  --text-dim: #64748b;         /* Placeholders y marcas secundarias */

  /* FUENTES */
  --font-ui: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;

  /* RADIOS Y ELEVACIONES */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* SOMBRAS Y BLUR */
  --glass-blur: blur(14px);
  --glass-bg: rgba(20, 24, 34, 0.72);
  --glass-border: 1px solid rgba(255, 255, 255, 0.08);
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.45);
  --shadow-glow: 0 0 24px rgba(225, 6, 0, 0.2);
}
```

### 2.1. Reglas Tipográficas
1. **Titulares y Textos UI (`--font-ui` - Outfit):**
   - H1 de Pantalla / Hero: `2.25rem` a `2.75rem`, `font-weight: 800`, `letter-spacing: -0.02em`.
   - H2 de Sección / Módulos: `1.5rem` a `1.75rem`, `font-weight: 700`, `letter-spacing: -0.01em`.
   - H3 de Tarjetas: `1.15rem` a `1.25rem`, `font-weight: 600`.
   - Body regular: `0.95rem`, `line-height: 1.5`, `font-weight: 400` o `500`.
2. **Números, Cronómetros y Telemetría (`--font-mono` - JetBrains Mono):**
   - Cuenta regresiva del Gran Premio: `font-size: 2rem` a `2.5rem`, `font-weight: 700`, números tabulares (`font-variant-numeric: tabular-nums`).
   - Horarios de sesiones (ART): `0.9rem`, `font-weight: 600`.
   - Códigos de pilotos (`VER`, `NOR`, `LEC`, `HAM`): `font-weight: 700`, mayúsculas obligatorias.
   - Posiciones de tabla (`P1`, `P2`, `P3`): `font-weight: 700`.

---

## 3. ARQUITECTURA DE PANTALLAS Y NAVEGACIÓN

La aplicación cuenta con una navegación horizontal persistente tipo "Cockpit Bar" superior y navegación por pestañas de acceso rápido:

```
+---------------------------------------------------------------------------------------------------------+
| [⚡ APEXPREDICT]   (R18/24: AUSTIN GP)   [🕒 15:42:10 hs ART]          [🏆 1.240 pts | @tadeogala7] [SALIR]|
+---------------------------------------------------------------------------------------------------------+
| [ 🏁 GP ACTUAL ]  [ 🎯 PREDICCIONES ]  [ 🏆 MIS LIGAS ]  [ 📅 CALENDARIO ]  [ 📊 POSICIONES ]  [ 👤 PERFIL ]|
+---------------------------------------------------------------------------------------------------------+
```

### 3.1. Barra Superior Persistente (App Header)
- **Logotipo:** Icono de rayo/vértice estilizado en `--red` con texto `APEX` (blanco) `PREDICT` (rojo).
- **Context Pill del Gran Premio Actual:** Muestra la bandera del país, el nombre del GP y el número de ronda (`Ronda 18/24: Austin`).
- **Reloj Oficial Argentino en Vivo:** Cronómetro en tiempo real formateado como `HH:mm:ss hs (Arg)`.
- **Badge de Usuario:** Avatar miniatura, nombre de usuario y píldora con puntaje acumulado en oro (`🏆 1.240 pts`).
- **Acción:** Botón de cierre de sesión minimalista con icono de desconexión.

---

## 4. ESPECIFICACIÓN DETALLADA DE MÓDULOS

---

### MÓDULO 1: CENTRO DE MANDO / HERO DEL GRAN PREMIO (TAB 0)
**Propósito:** Es la primera impresión del usuario al ingresar. Informa el estado exacto del próximo fin de semana de carreras, la cuenta regresiva en tiempo real y el circuito.

```
+---------------------------------------------------------------------------------------------------------+
|  BANDERA + CIRCUITO HERO                                                    CUENTA REGRESIVA            |
|  [ 🇺🇸 USA ] ROUND 18 / 24                                                   TIEMPO RESTANTE PARA CARRERA |
|  CIRCUIT OF THE AMERICAS                                                    +----+  +----+  +----+  +----+  |
|  Austin, Estados Unidos                                                     | 02 |  | 14 |  | 35 |  | 19 |  |
|                                                                             |DÍAS|  | HS |  |MIN |  |SEG |  |
|  [ Trazado SVG del Circuito con DRS ]                                       +----+  +----+  +----+  +----+  |
|  Longitud: 5.513 km | Vueltas: 56 | Récord: 1:36.169 (Leclerc)               [ 🎯 EDITAR MI PRONÓSTICO ]  |
+---------------------------------------------------------------------------------------------------------+
|  CRONOGRAMA DEL FIN DE SEMANA (HORA ARGENTINA UTC-3)                                                     |
|  +--------------------+ +--------------------+ +--------------------+ +-------------------------------+ |
|  | PRÁCTICA LIBRE 1    | | CLASIFICACIÓN SPRINT| | CARRERA SPRINT     | | GRAN PREMIO OFICIAL (CARRERA) | |
|  | Viernes 14:30 hs   | | Viernes 18:30 hs   | | Sábado 15:00 hs    | | Domingo 16:00 hs            | |
|  | [ FINALIZADA ✓ ]   | | [ EN VIVO 🔴 ]     | | [ PRÓXIMAMENTE ]   | | [ 🔒 CIERRA EN 2d 14h ]      | |
|  +--------------------+ +--------------------+ +--------------------+ +-------------------------------+ |
+---------------------------------------------------------------------------------------------------------+
```

#### Elementos Clave del Módulo:
1. **Hero GP Card:**
   - Background con imagen oscurecida del circuito y gradiente de negro a transparente.
   - Badge con bandera oficial en alta resolución y texto de ronda.
   - Nombre oficial del evento (`Formula 1 Pirelli United States Grand Prix 2026`).
2. **Visualizador del Circuito SVG:**
   - Trazado vectorial limpio en blanco puro (`stroke: 3px`) sobre fondo oscuro.
   - Sectores destacados: Zonas DRS en `--cyan` con pequeñas etiquetas "DRS 1" y "DRS 2".
   - Ficha técnica: Longitud, curvas totales, récord de vuelta y piloto poseedor.
3. **Cronómetro Regresivo Dinámico:**
   - 4 cajas numéricas (`Días`, `Horas`, `Minutos`, `Segundos`) en fuente monospace.
   - Código de colores de urgencia:
     - > 24 horas: borde blanco sutil (`--line-strong`).
     - < 24 horas: borde ámbar (`--gold`).
     - < 2 horas: borde rojo pulsante (`--red`).
     - Sesión comenzada: badge `[ EN VIVO ]` en verde brillante o `[ BLOQUEADO ]` en rojo.
4. **Timeline de Sesiones en Horario Argentino:**
   - Convierte automáticamente todas las fechas UTC provenientes de la API de Jolpica al huso horario `America/Argentina/Buenos_Aires`.
   - Formato requerido: `Día de la semana + Hora` (ej: `Viernes 14:30 hs (Arg)`).
   - Estado de cada sesión: `Pasada` (gris atenuado), `Siguiente` (destacada en cian), `En Vivo` (pulso verde).

---

### MÓDULO 2: MOTOR DE PREDICCIONES (TAB 1)
**Propósito:** Permite al usuario pronosticar los resultados clave de la carrera antes de que comience el período de bloqueo oficial.

```
+---------------------------------------------------------------------------------------------------------+
| 🎯 PREDICCIÓN OFICIAL: ROUND 18 — AUSTIN GP                     [ 🔒 CIERRA: Sábado 15:55 hs (Arg) ]    |
| Estado: [ ✓ GUARDADO EN BASE DE DATOS ]                                    Puntaje estimado: +125 pts    |
+---------------------------------------------------------------------------------------------------------+
| 1. POLE POSITION (SÁBADO)                         | 4. VUELTA RÁPIDA (FASTEST LAP)                      |
| [ 🏁 Seleccionar Piloto: Max Verstappen (RBR) ▼ ] | [ 🟣 Seleccionar Piloto: Lando Norris (MCL)     ▼ ] |
+---------------------------------------------------+-----------------------------------------------------+
| 2. PODIO OFICIAL (DOMINGO)                                                                              |
|    +----------------------------+  +----------------------------+  +----------------------------+       |
|    | P1 — GANADOR (🥇 25 pts)   |  | P2 — SEGUNDO (🥈 18 pts)   |  | P3 — TERCERO (🥉 15 pts)   |       |
|    | [ 🇳🇱 Max Verstappen   ▼ ]  |  | [ 🇬🇧 Lando Norris     ▼ ]  |  | [ 🇲🇨 Charles Leclerc  ▼ ]  |       |
|    +----------------------------+  +----------------------------+  +----------------------------+       |
+---------------------------------------------------------------------------------------------------------+
| 3. PREGUNTAS CLAVE DE CARRERA                                                                           |
|    ¿Saldrá el Safety Car (Auto de Seguridad)?           Piloto del Día (Driver of the Day)              |
|    ( o ) SÍ (+10 pts)     (   ) NO (+10 pts)            [ 🏎️ Franco Colapinto (ALP)                  ▼ ]|
+---------------------------------------------------------------------------------------------------------+
| [ 💾 GUARDAR MI PREDICCIÓN ]      [ ↺ RESTABLECER VALORES ]    Última actualización: Hoy a las 02:15 hs |
+---------------------------------------------------------------------------------------------------------+
```

#### Reglas de UI e Interacción:
1. **Selector de Piloto Premium:**
   - Cada opción en los menús desplegables o tarjetas de selección debe mostrar:
     - Bandera del país del piloto (`🇳🇱`, `🇬🇧`, `🇲🇨`, `🇦🇷`).
     - Nombre completo y código de 3 letras (`Max Verstappen (VER)`).
     - Color oficial de la escudería en el borde izquierdo (Red Bull: Azul/Amarillo `#3671c6`, Ferrari: Rojo `#e8002d`, McLaren: Papaya `#ff8000`, Mercedes: Turquesa `#27f4d2`, Aston Martin: Verde `#229971`, Williams: Azul `#041e42`, Alpine: Rosa/Azul `#0093cc`, etc.).
2. **Selector de Podio Visual (P1, P2, P3):**
   - Tarjetas con bordes metalizados distintivos: Oro (`--gold`), Plata (`--silver`), Bronce (`--bronze`).
   - Validación cruzada automática: No se puede seleccionar al mismo piloto en dos posiciones del podio a la vez. Si el usuario intenta duplicarlo, se intercambian las posiciones o se muestra una alerta visual.
3. **Persistencia y Feedback Visual:**
   - Botón de guardado con 3 estados:
     - `Inactivo / Sin cambios`: Opacidad reducida.
     - `Guardando...`: Spinner de carga con texto "Sincronizando con base de datos...".
     - `Éxito`: Badge verde animado `✓ Predicción Confirmada en Servidor`.
     - `Error`: Banner rojo con mensaje legible retornado por el BFF/Dominio.
4. **Bloqueo Inteligente:**
   - Si la hora actual es posterior al límite establecido (inicio de Qualy o Carrera), todos los inputs se transforman a modo solo lectura (`disabled`) con una marca de agua translúcida: `🔒 PREDICCIONES BLOQUEADAS PARA ESTA SESIÓN`.

---

### MÓDULO 3: SISTEMA DE LIGAS PRIVADAS Y SOCIAL (TAB 2)
**Propósito:** Fomentar la competencia entre amigos y comunidades mediante ligas con clave de acceso, enlaces de invitación y tablas de posiciones.

```
+---------------------------------------------------------------------------------------------------------+
| 🏆 SISTEMA DE LIGAS                                                                                     |
| [ 👥 Mis Ligas (3) ]   [ 🔍 Explorar Ligas Privadas ]   [ ➕ Crear Nueva Liga ]   [ 🔗 Unirse por Clave ] |
+---------------------------------------------------------------------------------------------------------+
|  BUSCADOR DE LIGAS PRIVADAS                                                                             |
|  [ 🔎 Buscar por nombre de liga...                                             ]  [ Filtrar: Todas ▼ ]  |
+---------------------------------------------------------------------------------------------------------+
|  +---------------------------------------------------------------------------------------------------+  |
|  | ESCUDERÍA AMIGOS VIP                              👥 14 miembros | Creador: @martin               |  |
|  | Liga privada de fanáticos de F1 en Argentina.      🔒 Requiere Contraseña                           |  |
|  | [ 🔑 INGRESAR CLAVE PARA UNIRSE ]                                                                 |  |
|  +---------------------------------------------------------------------------------------------------+  |
|  | LIGA PÚBLICA LATAM F1                             👥 158 miembros | Creador: @apexadmin           |  |
|  | Competencia abierta para la temporada 2026.        🌐 Acceso Libre                                  |  |
|  | [ ➕ UNIRME AHORA ]                                                                               |  |
+---------------------------------------------------------------------------------------------------------+
|  TABLA DE POSICIONES: "ESCUDERÍA AMIGOS VIP"                                                            |
|  POS  PILOTO / USUARIO            PUNTOS ÚLTIMO GP       TOTAL PTS    TENDENCIA      ACCIÓN            |
|  🥇 1  @tadeogala7 (TÚ)           85 pts                 1.240 pts     ▲ (+1)        [ Ver Perfil ]    |
|  🥈 2  @martin                    70 pts                 1.195 pts     ▼ (-1)        [ Ver Perfil ]    |
|  🥉 3  @geroalu                   65 pts                 1.140 pts     ―             [ Ver Perfil ]    |
|   4   @franco_f1                 40 pts                   980 pts     ▲ (+2)        [ Ver Perfil ]    |
+---------------------------------------------------------------------------------------------------------+
|  ENLACE DE INVITACIÓN RÁPIDA:                                                                           |
|  https://apexpredict.app/join/APEX-VIP-7721                  [ 📋 COPIAR ENLACE DE INVITACIÓN ]        |
+---------------------------------------------------------------------------------------------------------+
```

#### Especificación de Seguridad e Interacción de Ligas:
1. **Modal de Creación de Liga:**
   - Campos:
     - Nombre de la liga (requerido, 3-50 caracteres).
     - Descripción o bio (opcional, hasta 200 caracteres).
     - Contraseña de ingreso (opcional: si se deja vacía la liga es de acceso libre `🌐`; si se define, pasa a ser privada `🔒`).
2. **Modal de Ingreso con Contraseña:**
   - Diálogo minimalista de foco automático (`autofocus`).
   - Campo de contraseña enmascarada con botón para mostrar/ocultar ojo.
   - Mensaje de validación instantáneo: `❌ Contraseña incorrecta. Consulta al administrador de la liga.`
3. **Flujo de Invitación por Enlace (`/join/:inviteCode`):**
   - Si el usuario accede mediante el enlace de invitación:
     - Si la liga no tiene contraseña: Se une con 1 clic directo.
     - Si la liga tiene contraseña: El sistema abre el modal precargando el nombre de la liga y solicitando la clave.
4. **Tabla de Posiciones (Leaderboard):**
   - Podio destacado con colores oro, plata y bronce en las primeras 3 posiciones.
   - Fila del usuario actual destacada con fondo sutil `--surface-elevated` y borde rojo fino a la izquierda.
   - Indicador de tendencia con flechas de color: Subió posiciones (▲ verde), bajó (▼ rojo), igual (- gris).

---

### MÓDULO 4: CALENDARIO DE TEMPORADA F1 (TAB 3)
**Propósito:** Ofrece la vista completa del calendario 2026 consumido desde Jolpica F1 API, mostrando fechas, sedes, estado de carreras y horarios argentinos de cada sesión.

```
+---------------------------------------------------------------------------------------------------------+
| 📅 CALENDARIO F1 2026 — 24 GRANDES PREMIOS                                                              |
| Progreso de la temporada: [ Carrera 18 de 24 | Restan: 6 carreras ]              [ Filtro: Todas ▼ ]    |
+---------------------------------------------------------------------------------------------------------+
| R17 | 🏁 GP DE AZERBAIYÁN (Bakú)         | 15-17 Sep 2026 | Ganador: 🇦🇺 Oscar Piastri    | [ FINALIZADO ] |
+-----+------------------------------------+----------------+------------------------------+--------------+
| R18 | 🇺🇸 GP DE ESTADOS UNIDOS (Austin)   | 18-20 Oct 2026 | Formato Sprint | Horas ART   | [ PRÓXIMO 🔴 ]|
|     | FP1: Vie 14:30 | Sprint Qualy: Vie 18:30 | Sprint: Sáb 15:00 | Carrera: Dom 16:00 hs (Arg)        |
+-----+------------------------------------+----------------+------------------------------+--------------+
| R19 | 🇲🇽 GP DE MÉXICO (Ciudad de México) | 25-27 Oct 2026 | Próxima semana               | [ PROGRAMADO]|
+-----+------------------------------------+----------------+------------------------------+--------------+
| R20 | 🇧🇷 GP DE BRASIL (Interlagos)       | 01-03 Nov 2026 | Formato Sprint               | [ PROGRAMADO]|
+---------------------------------------------------------------------------------------------------------+
```

#### Especificación Técnica del Calendario:
1. **Contador de Carreras Restantes:**
   - Calcula dinámicamente: `Carreras Restantes = Total (24) - Carreras Finalizadas`.
   - Se actualiza en base a la fecha actual y la fecha de finalización de cada GP.
2. **Distintivo Sprint:**
   - Si el Gran Premio cuenta con formato Sprint, se añade una insignia especial violeta: `⚡ SPRINT WEEKEND`.
3. **Conversión de Fechas y Sesiones:**
   - Cada tarjeta del calendario se puede expandir para ver el desglose completo de las 5 sesiones del fin de semana (Libres, Clasificación, Sprint y Carrera), todas formateadas al huso horario argentino.

---

### MÓDULO 5: CLASIFICACIONES EN VIVO WDC & WCC (TAB 4)
**Propósito:** Tablas de posiciones oficiales del Campeonato Mundial de Pilotos y Constructores, sincronizadas en tiempo real desde la API de Jolpica.

```
+---------------------------------------------------------------------------------------------------------+
| 📊 CLASIFICACIÓN MUNDIAL F1 2026                                                                        |
| [ 🏎️ Campeonato de Pilotos (WDC) ]               [ 🛠️ Campeonato de Constructores (WCC) ]               |
+---------------------------------------------------------------------------------------------------------+
| POS  PILOTO                     ESCUDERÍA         NAC   PUNTOS     VICTORIAS   PODIOS    DIFERENCIA     |
|  1   🇳🇱 Max Verstappen (VER)    Red Bull Racing   NED   331 pts        8         14        LÍDER        |
|  2   🇬🇧 Lando Norris (NOR)      McLaren           GBR   279 pts        4         11        -52 pts      |
|  3   🇲🇨 Charles Leclerc (LEC)   Ferrari           MON   245 pts        2          9        -86 pts      |
|  4   🇦🇺 Oscar Piastri (PIA)     McLaren           AUS   237 pts        2          7        -94 pts      |
| ...                                                                                                     |
| 16   🇦🇷 Franco Colapinto (COL)  Alpine            ARG    12 pts        0          0       -319 pts      |
+---------------------------------------------------------------------------------------------------------+
```

#### Reglas de Visualización:
1. Barra lateral del equipo con el color oficial (`border-left: 4px solid var(--team-color)`).
2. Formato tabular con espaciado uniforme y números monospace para puntajes.
3. Indicador de nacionalidad con bandera emoji o SVG oficial.

---

### MÓDULO 6: PERFIL DE USUARIO Y TELEMETRÍA DE ACIERTOS (TAB 5)
**Propósito:** Dashboard personal donde el usuario visualiza su historial de pronósticos, precisión y evolución.

```
+---------------------------------------------------------------------------------------------------------+
| 👤 PERFIL DE PILOTO: @tadeogala7                                                                        |
| Miembro desde: Octubre 2026 | Ligas activas: 3 | Posición Global: #142 de 4.820 participantes           |
+---------------------------------------------------------------------------------------------------------+
| TELEMETRÍA DE RENDIMIENTO                                                                               |
| +-----------------------+ +-----------------------+ +-----------------------+ +-----------------------+ |
| | PUNTAJE TOTAL         | | EFECTIVIDAD EN POLE   | | EFECTIVIDAD EN PODIO  | | VUELTAS RÁPIDAS       | |
| | 1.240 pts             | | 72% (13/18)           | | 58% (31/54)           | | 4 aciertos            | |
| +-----------------------+ +-----------------------+ +-----------------------+ +-----------------------+ |
+---------------------------------------------------------------------------------------------------------+
| HISTORIAL DE PREDICCIONES POR GRAN PREMIO                                                               |
| GP                    MI PRONÓSTICO (P1/P2/P3)              RESULTADO REAL           PTS OBTENIDOS      |
| 🇸🇬 GP de Singapur     VER / NOR / LEC                       NOR / VER / PIA          +65 pts            |
| 🇦🇿 GP de Azerbaiyán   LEC / PIA / PER                       PIA / LEC / RUS          +45 pts            |
+---------------------------------------------------------------------------------------------------------+
```

---

## 5. REGLAS DE NEGOCIO Y CÁLCULO DE PUNTOS

El sistema de cálculo de puntos para el ranking de ligas y global opera bajo la siguiente tabla de valoración oficial:

| Pronóstico Realizado | Condición de Acierto | Puntos Otorgados |
| :--- | :--- | :--- |
| **Pole Position** | Acierto exacto del piloto que larga en P1 el domingo | **+20 puntos** |
| **Ganador de Carrera (P1)** | Acierto exacto del ganador | **+25 puntos** |
| **Segundo Lugar (P2)** | Acierto exacto del 2° puesto | **+18 puntos** |
| **Tercer Lugar (P3)** | Acierto exacto del 3° puesto | **+15 puntos** |
| **Podio Invertido / En Desorden** | Piloto en el podio pero en distinta posición | **+5 puntos** c/u |
| **Vuelta Rápida Oficial** | Acierto exacto del piloto con vuelta rápida | **+10 puntos** |
| **Safety Car (Sí/No)** | Acierto si hubo o no auto de seguridad físico | **+10 puntos** |
| **Piloto del Día (DotD)** | Acierto de la votación oficial de la F1 | **+10 puntos** |
| **Pleno de Podio (Bonus)** | Acertar P1, P2 y P3 exactos | **+15 puntos extra** |

---

## 6. MAPEO DE APIS Y MODELOS DE DATOS

### 6.1. Jolpica F1 API (Endpoints de Consumo Público)
- **Base URL:** `https://api.jolpica.com/ergast/f1`
- **Próxima Carrera:** `GET /current/next.json`  
  *Extrae: nombre de carrera, circuito, coordenadas, fechas UTC de FP1, FP2, FP3, Qualy, Sprint y Race.*
- **Calendario Completo:** `GET /current.json`  
  *Extrae: lista de 24 carreras con circuitos y fechas.*
- **Tabla de Pilotos:** `GET /current/driverStandings.json`  
  *Extrae: puntos, posición, victorias, escudería y nacionalidad.*
- **Tabla de Constructores:** `GET /current/constructorStandings.json`  
  *Extrae: puntos de escuderías.*

### 6.2. Backend ApexPredict (BFF & Domain Service)
- **Base URL BFF:** `https://dacs-2-crv9.onrender.com/bff` (o relativo `/bff` en proxy)
- **Identidad:** `GET /bff/me` (retorna perfil de usuario autenticado vía Keycloak).
- **Predicciones:**
  - `GET /bff/predictions/session/{sessionId}` -> Obtiene la predicción guardada para esa carrera.
  - `POST /bff/predictions` -> Guarda/actualiza picks de predicción en Supabase PostgreSQL.
- **Ligas Privadas:**
  - `GET /bff/leagues` -> Lista las ligas donde el usuario participa.
  - `GET /bff/leagues/search?query={texto}` -> Busca ligas por nombre. Retorna `hasPassword: true/false`.
  - `POST /bff/leagues` -> Crea una liga (con campo opcional `password`).
  - `POST /bff/leagues/{id}/join` -> Se une a una liga específica enviando `{ "password": "..." }`.
  - `POST /bff/leagues/join/{inviteCode}` -> Se une por código de enlace con validación de contraseña si corresponde.

---

## 7. PROMPT MAESTRO PARA GENERAR PANTALLAS CON OTRA IA

Usa el siguiente prompt exacto cuando quieras pedirle a cualquier modelo de IA (Claude, GPT, Gemini, etc.) que desarrolle una pantalla o componente específico para ApexPredict:

```text
Actúa como un desarrollador Senior Frontend y Diseñador UI/UX especializado en Angular 21 y diseño automovilístico de alta gama.
Debes diseñar e implementar un componente de pantalla para la aplicación "ApexPredict" (plataforma de pronósticos y telemetría de Fórmula 1).

RESTRICCIONES TÉCNICAS ESTRICTAS:
1. Framework: Angular 21 con Standalone Components, Signals (signal, computed, effect) y Native Control Flow (@if, @for, @switch).
2. Estilos: Pure Vanilla CSS encapsulado en el componente o consumiendo variables de diseño globales. PROHIBIDO usar TailwindCSS.
3. Tokens de Diseño: Usa estrictamente las variables de estilos globales:
   - Fondos: var(--bg), var(--surface), var(--surface-card), var(--surface-elevated).
   - Acentos: var(--red) [#e10600], var(--cyan) [#00f2fe], var(--gold) [#ffd166], var(--green) [#10b981], var(--purple) [#8b5cf6].
   - Líneas y Bordes: var(--line) [rgba(255,255,255,0.08)], var(--line-strong), var(--glass-border).
   - Tipografía: var(--font-ui) ['Outfit'] para textos y títulos, var(--font-mono) ['JetBrains Mono'] para métricas, tiempos, cuentas regresivas y posiciones.
4. Zona Horaria: Todos los horarios mostrados deben estar explicitados en Huso Horario de Argentina (ART / UTC-3), con sufijo "hs (Arg)".
5. Integración: Debe estar tipado y preparado para consumir datos de Jolpica F1 API (para datos de carreras y pilotos) y del backend BFF de ApexPredict (para usuarios, ligas con contraseña y predicciones persistentes en PostgreSQL).

ESTÉTICA Y EXPERIENCIA DE USUARIO:
- Estilo: "Minimalist Telemetry / High-Tech Paddock".
- Sensación de sala de control de F1: tarjetas oscuras con glassmorphism suave (backdrop-filter: blur(14px)), microinteracciones sutiles al hover, estados de carga optimistas y manejo claro de errores de red.
- Cero elementos genéricos o infantiles; presentación sobria, premium y elegante.

OBJETIVO ESPECÍFICO DE ESTA SOLICITUD:
[INSERTAR AQUÍ LA PANTALLA O MÓDULO A GENERAR: ej. "Modal de creación y búsqueda de Ligas Privadas con Contraseña y Enlaces de Invitación" o "Constructor de Predicciones del Gran Premio con Podio Visual"]

Por favor proporciona:
1. El código TypeScript del componente Angular 21 (lógica, signals, validaciones).
2. El template HTML con la sintaxis moderna (@if, @for).
3. Los estilos CSS modernos y pulidos que cumplan al 100% con la estética especificada.
```

---

## 8. LISTA DE VERIFICACIÓN DE CALIDAD UI/UX (CHECKLIST)

Antes de considerar una pantalla o componente listo para producción en ApexPredict, verifica:
- [ ] ¿Los horarios de sesiones están convertidos a Hora Argentina (`hs (Arg)`)?
- [ ] ¿Se utilizan las fuentes `Outfit` para UI y `JetBrains Mono` para datos numéricos/cronómetros?
- [ ] ¿Las tarjetas utilizan el fondo con desenfoque de cristal (`var(--surface-card)` con `backdrop-filter`)?
- [ ] ¿El selector de podio tiene los colores metalizados oro, plata y bronce?
- [ ] ¿Las ligas privadas indican claramente si requieren contraseña (`🔒`) o si son de acceso libre (`🌐`)?
- [ ] ¿Los botones de acción tienen estados claros de carga (`disabled` + spinner) y confirmación de guardado?
- [ ] ¿La interfaz es 100% responsiva (se adapta con soltura en teléfonos de 375px y monitores de 1440px+)?
