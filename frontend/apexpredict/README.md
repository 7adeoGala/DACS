# Cliente ApexPredict

Angular 21 standalone. Ver el [README del proyecto](../../README.md) para infraestructura,
certificados, cuentas de prueba y el contrato de la API.

```powershell
npm ci
npm start
npm test -- --watch=false
npm run build -- --configuration=production --base-href=/apexpredict/
node ../../scripts/publish-frontend.mjs
```

`npm start` sirve en http://localhost:4200. El interceptor convierte la URL de API
de desarrollo a HTTPS antes de agregar credenciales. La compilacion de produccion
se sirve en https://dacs2026.local/apexpredict/.

Las pantallas estan bajo `src/app/features`, cargan mediante `loadComponent` y no
se importan entre si. `src/app/core` contiene modelos, servicios, guards y el
interceptor. Ejecutar `node ../../scripts/check-frontend-boundaries.mjs` verifica
esas dependencias.
