# Comandos rápidos desde Visual Studio Code

Abrir la carpeta raíz `D:\AGENTES PT\lumen-checkout`, no solamente `apps/api`. En **Terminal → Nuevo terminal**, elegir PowerShell. Estos comandos son para Windows.

## Iniciar

```powershell
Set-Location 'D:\AGENTES PT\lumen-checkout'
npm.cmd run dev
```

Inicia frontend y API juntos. La primera compilación de la API puede tardar unos segundos. Producto: <http://localhost:5173/>. Swagger: <http://localhost:3001/api/docs>. Salud: <http://localhost:3001/api/health>.

**Si ya están corriendo en esos puertos, no ejecutar otra instancia.** Basta editar y guardar: Vite recarga la UI y la API recompila. `Ctrl+C` detiene una instancia iniciada en esa terminal. Para pasar una instancia iniciada fuera de VS Code al editor, detener primero su proceso de origen; no matar un puerto sin identificar el proceso.

Alternativa: **F5 → Lumen: iniciar API y web**. O `Ctrl+Shift+P` → **Tasks: Run Task** → **Lumen: iniciar API y web**. Elegir una sola forma de inicio. Para una tarea usar **Tasks: Terminate Task**; para una sesión de depuración usar su botón Detener.

Si necesitas separar consolas, usar estas dos en terminales distintas y no ejecutar a la vez el comando combinado:

```powershell
# Terminal de API
npm.cmd run dev -w apps/api
```

```powershell
# Terminal de web
npm.cmd run dev -w apps/web
```

## Validar y compilar

```powershell
npm.cmd run typecheck
npm.cmd run test:coverage
npm.cmd run build
```

Revisar el resultado de cada comando antes de continuar. Compilar no publica en AWS. `Ctrl+Shift+B` ejecuta la tarea de build predeterminada. Las tareas de tipos y cobertura están en **Tasks: Run Task**.

Prueba rápida de backend o frontend:

```powershell
npm.cmd run test -w apps/api -- --runTestsByPath test/checkout.spec.ts
npm.cmd run test -w apps/web -- --runTestsByPath src/validation.test.ts
```

La suite completa de navegador requiere build API, navegadores instalados y puertos 5174/3002 libres:

```powershell
npm.cmd run test:e2e
```

## Carpeta API en rojo

`Ctrl+Shift+M` muestra **Problemas**. Se identificó una diferencia de versiones: VS Code 1.138 trae TypeScript 6.0.3, que marca `moduleResolution=node10` como deprecado. Se reprodujo ese diagnóstico con el compilador del editor. El TypeScript 5.9.3 del proyecto pasa `npm.cmd run typecheck -w apps/api` sin errores. La captura mostraba un diagnóstico en `apps/api/tsconfig.json`.

El proyecto usa TypeScript **5.9.3**. Se añadió `.vscode/settings.json` con la ruta al TypeScript instalado. Si el editor usa otra versión: abrir un `.ts`, `Ctrl+Shift+P` → **TypeScript: Select TypeScript Version** → **Use Workspace Version**; después **TypeScript: Restart TS Server**. No ocultar errores ni desactivar validación para quitar el color. Si persiste, leer el primer diagnóstico concreto.

## Git y AWS desde la terminal integrada

En esta computadora, cargar los alias locales sin mostrar credenciales:

```powershell
. 'D:\AGENTES PT\entrega\preparar-terminal.ps1'
git status --short
```

Renovar el perfil de origen de AWS si sigue pendiente:

```powershell
aws login --profile trama-login --region us-east-1 --remote
aws sts get-caller-identity --profile trama --region us-east-1
```

El enlace/código del login se completa personalmente; pegar el código únicamente en la terminal. El perfil `trama` delega credenciales y no se debe reemplazar. El modo remoto es una alternativa al callback local, no una garantía de resolver cualquier HTTP 400.

Antes de publicar: prueba, revisa diff, commit del cambio real, push/PR y verifica CI. Para despliegue y reversión usar [el procedimiento paso a paso](live-demo-runbook.md); GitHub Actions valida, no despliega automáticamente.

[Guía completa y preguntas](interview-guide.md) · [Portal local](http://127.0.0.1:5180/).

Referencias oficiales: [TypeScript del workspace](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-newer-typescript-versions) y [depuración Node](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).
