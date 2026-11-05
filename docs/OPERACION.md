# Operación, pruebas y solución de problemas

Todos los comandos se ejecutan en `plataforma-bd/` (PowerShell). **No hay Node instalado en el equipo**: todo corre en Docker.

## Levantar / detener
```powershell
docker compose up -d --build        # construye y levanta web + db + sandbox
docker compose up -d --build web    # reconstruir solo la aplicación tras cambiar código
docker compose logs -f web          # ver registros
docker compose down                 # detener (los datos se conservan en volúmenes)
```
Aplicación: http://localhost:8300 (`WEB_PORT` en `.env`). Puertos ya usados en este equipo por otros proyectos: 3306, 3307, 8080, 8081, 8090, 8091, 8200, 8501.

## Configuración (`.env`, no se versiona)
`AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `SANDBOX_MYSQL_PASSWORD`, `WEB_PORT`.
El administrador se crea una sola vez al iniciar (`prisma/seed.mjs`); cambiar `ADMIN_PASSWORD` en `.env` después no cambia la clave ya creada.
Para cambiar la clave del administrador (probado):
```powershell
$js = "const {PrismaClient}=require('@prisma/client');const b=require('bcryptjs');const p=new PrismaClient();(async()=>{await p.user.update({where:{email:process.env.ADMIN_EMAIL},data:{passwordHash:await b.hash(process.env.NUEVA,12)}});console.log('clave actualizada');await p.`$disconnect()})()"
docker exec -e NUEVA='la-nueva-clave' bdplat-web node -e $js
```
Las claves de estudiantes se cambian desde `/admin/estudiantes`. Si se pierde `.env`, los volúmenes siguen usando las claves antiguas:
recrea `.env` con las mismas o elimina los volúmenes (se pierden los datos).

## Pruebas automáticas
### Autoprueba de contenido y correctores (rápida, ~1 min)
Corre en un contenedor Node sobre la red de compose para alcanzar el MySQL real (necesita las claves del sandbox y la de root para cargar las bases de ejemplo):
```powershell
$envs = @{}; Get-Content .env | ForEach-Object { $k,$v = $_ -split '=',2; $envs[$k]=$v }
docker run --rm --network plataforma-bd_default -v "${PWD}:/app" -v bdplat_nm:/app/node_modules -w /app `
  -e SANDBOX_MYSQL_HOST=sandbox -e SANDBOX_MYSQL_PASSWORD=$($envs['SANDBOX_MYSQL_PASSWORD']) -e SANDBOX_MYSQL_ROOT_PASSWORD=$($envs['MYSQL_ROOT_PASSWORD']) -e DATABASE_URL=postgresql://x:x@localhost/x `
  node:22-slim sh -c "apt-get update -qq && apt-get install -y -qq openssl ca-certificates >/dev/null 2>&1; npm install --no-audit --no-fund >/dev/null 2>&1; npx prisma generate >/dev/null 2>&1; npx tsc --noEmit; npx --yes tsx scripts/selftest.ts"
```
Debe imprimir `N comprobaciones correctas, 0 fallidas` y `tsc` sin errores. Verifica: 15 ejercicios por semana, slugs únicos, modelos E/R
consistentes, cada solución E/R dibujada = 100 %, **cada opción de transformación** = 100 %, síntesis 3FN = 100 % en normalización,
divisor de sentencias del laboratorio y los 15 ejercicios DDL ejecutados en MySQL real. El volumen `bdplat_nm` guarda `node_modules` para acelerar.

### Prueba de humo en navegador (Playwright en Docker)
```powershell
$pw = ((Get-Content .env | Where-Object { $_ -like 'ADMIN_PASSWORD=*' }) -split '=',2)[1]
docker run --rm -v "${PWD}\scripts\e2e:/e2e" -v "${PWD}\scripts\e2e\out:/shots" -w /e2e -e BASE=http://host.docker.internal:8300 -e PW=$pw `
  --add-host host.docker.internal:host-gateway mcr.microsoft.com/playwright:v1.49.1-jammy sh -c "npm init -y >/dev/null && npm i playwright@1.49.1 >/dev/null 2>&1 && node smoke.mjs"
```
Registra un estudiante, recorre semanas/ejercicios, ejecuta los ejemplos del Laboratorio (incluye procedimiento y función), verifica aislamiento,
exporta PNG del lienzo y revisa el admin; imprime un JSON con contadores y errores de consola (debe venir `"errors": []`) y guarda capturas.
Nota: crea un estudiante de prueba cada vez (bórralo desde Postgres si molesta).

## Bases de ejemplo (plantillas SQL)
Regenerar los `.sql` de `src/lib/sqltemplates/` (los del profesor se leen de `Material Ejercicios`; el resto es sintético y determinista):
```powershell
docker run --rm -v "${PWD}:/app" -v "C:\Users\enavarro\Desktop\Proyectos\Prof Eduardo\Material Ejercicios:/mat:ro" python:3.12-slim python /app/scripts/templates/build_templates.py
```
Después correr el selftest (comprueba que las 11 plantillas cargan completas) y `docker compose up -d --build web`.
**Cambios en `--lower-case-table-names`** (u otras opciones de inicialización de MySQL) exigen recrear el volumen: `docker compose down; docker volume rm plataforma-bd_bdplat_mysql; docker compose up -d --build`
(se pierden las bases del Laboratorio de los estudiantes; el usuario `sandbox` se vuelve a crear con `docker/mysql-init/01-sandbox.sh`).

## Respaldo
```powershell
docker exec bdplat-db pg_dump -U bdplat bdplat > respaldo.sql                      # datos de la plataforma
docker exec bdplat-sandbox mysqldump -uroot -p$MYSQL_ROOT_PASSWORD --all-databases > laboratorio.sql   # bases del Laboratorio
```

## Limpiar datos de prueba
```powershell
'DELETE FROM "Intento"; DELETE FROM "User" WHERE email LIKE ''%@test.cl'';' | docker exec -i bdplat-db psql -U bdplat -d bdplat
```
Las bases del Laboratorio de un estudiante se borran con «Restablecer mi espacio» (o `DROP DATABASE sbx_u<id>_…` como root).

## Problemas conocidos y soluciones
| Síntoma | Causa / solución |
|---|---|
| `You do not have the SUPER privilege and binary logging is enabled` al crear función/trigger | El servicio `sandbox` debe iniciar con `--log-bin-trust-function-creators=1` (ya está en `docker-compose.yml`). |
| Estudiante no puede registrarse: «No hay periodos habilitados» | El admin debe crear/activar un periodo en `/admin`. |
| Error de hidratación React #418 con fechas | Mostrar fechas con `suppressHydrationWarning` y zona `America/Santiago` (ya aplicado). |
| `docker run -v` con rutas Windows falla en Git Bash | Usar PowerShell; en el entorno de Claude Code la herramienta Bash puede no estar disponible. |
| El lienzo no dibuja líneas entre formas | `ReactFlow` necesita `connectionMode={ConnectionMode.Loose}` también en `ErView` (nodos con handles `source`). |
| En el editor las conexiones atributo–entidad se rechazan | Los pares se ordenan alfabéticamente (`attribute|entity`); la validación debe usar ese orden. |


## Pruebas añadidas (2026-10-25)
- `scripts/selftest.ts` ahora con `SANDBOX_MYSQL_ROOT_PASSWORD` y `SANDBOX_MYSQL_PASSWORD` corre también cada `SQL_WORK` (≈1.915 comprobaciones; tarda unos minutos).
- Navegador: `docker run … node nuevo.mjs` (mismo comando que `smoke.mjs`, cambiando el script) valida semanas 6–13, corrección SQL, «Ver respuesta» (bloqueo, 403 por API) y bases de ejemplo. Capturas en `scripts/e2e/out/`.
- La tabla `RespuestaVista` se crea sola al arrancar (`prisma db push`). Para «desbloquear» a un estudiante: borrar su fila en `RespuestaVista` (psql en el contenedor `bdplat-db`).