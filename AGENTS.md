# APEXPREDICT — REGLAS DEL PROYECTO & WORKFLOW DEL AGENTE

## Deploy Automático en Producción (Obligatorio)
- **Instrucción:** Cada vez que se completen cambios de código, estilos, esquemas de base de datos o correcciones solicitadas por el usuario:
  1. Validar la compilación y pruebas (`npm run build` en `frontend/apexpredict`, y validación en backend si corresponde).
  2. Ejecutar **automáticamente** el deploy:
     - Realizar `git add` de los archivos modificados.
     - Realizar `git commit` descriptivo (ej: `fix(...)`, `feat(...)` o `deploy X.XXX.XXX`).
     - Realizar `git push origin main`.
  3. Esto dispara de forma inmediata el despliegue automático en producción en:
     - **Vercel**: Frontend Angular (`https://dacs-nine.vercel.app`).
     - **Render**: Servicios backend (BFF, Domain Service, F1 Connector).
     - **GitHub Actions**: Workflow de Keep-Alive y verificación.
  4. Informar al usuario del hash del commit y la confirmación del push a `main`.
