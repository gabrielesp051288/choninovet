# Instalación self-hosted en VPS Ubuntu

Esta guía explica cómo instalar choninovet en un VPS/VM con Ubuntu Server sin Docker. Cada negocio usa su propia API y su propia base de datos MySQL.

La red local sigue siendo útil para pruebas o uso interno, pero para clientes accediendo desde internet se recomienda VPS con IP pública, dominio y HTTPS.

## Arquitectura

```text
Celular / navegador
  -> API choninovet
      -> MySQL del negocio
```

La app móvil/web no se conecta directamente a MySQL. Solo se conecta a la API.

## Requisitos mínimos

- Node.js 22 o compatible.
- npm.
- MySQL 8 o compatible.
- Ubuntu Server o VM Linux equivalente.
- Dominio o subdominio para la API.
- Acceso SSH al servidor.
- Puerto HTTPS público.

Componentes recomendados en VPS:

- Node.js y npm.
- MySQL Server.
- PM2 o systemd para mantener la API corriendo.
- Nginx como proxy reverso.
- Certbot/Let's Encrypt para HTTPS.
- UFW para firewall.
- `mysqldump` para backups.

## Arquitectura recomendada para internet

```text
Clientes / navegador / APK
  -> https://api.tudominio.com/api
      -> API choninovet en VPS Ubuntu
          -> MySQL del negocio
```

La app web puede estar en Vercel o servirse desde el mismo VPS. En ambos casos debe consumir la API pública:

```text
https://api.tudominio.com/api
```

## Instalación base en Ubuntu Server

Instalar paquetes base:

```bash
sudo apt update
sudo apt install -y git curl nginx mysql-server
```

Instalar Node.js LTS compatible con el proyecto según el método que prefieras para tu servidor. Verificar:

```bash
node -v
npm -v
```

## Instalación de MySQL

Instalar y preparar MySQL en el VPS.

Crear una base de datos vacía:

```sql
CREATE DATABASE choninovet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Crear o elegir un usuario MySQL con permisos sobre esa base.

Ejemplo orientativo:

```sql
CREATE USER 'choninovet'@'localhost' IDENTIFIED BY 'password_seguro';
GRANT ALL PRIVILEGES ON choninovet.* TO 'choninovet'@'localhost';
FLUSH PRIVILEGES;
```

No exponer MySQL públicamente salvo necesidad real.

## Configurar API

Clonar el repositorio y entrar a la carpeta del backend:

```bash
git clone https://github.com/gabrielesp051288/choninovet.git
cd choninovet/api
npm install
```

Crear `api/.env`:

```env
DATABASE_URL="mysql://choninovet:password_seguro@localhost:3306/choninovet"
JWT_SECRET="cambiar-por-un-secreto-largo"
PORT=3000
```

`JWT_SECRET` es la clave privada que usa la API para firmar sesiones. No es una contraseña de usuario y no se ingresa en la app.

Para generar un valor seguro en Ubuntu:

```bash
openssl rand -hex 32
```

Copiar el resultado en `api/.env`:

```env
JWT_SECRET="resultado_generado"
```

Aplicar migraciones:

```bash
npx prisma migrate deploy
npx prisma generate
```

Compilar:

```bash
npm run build
```

Iniciar en producción con PM2:

```bash
sudo npm install -g pm2
pm2 start dist/main.js --name choninovet-api
pm2 save
pm2 startup
```

La API debe responder localmente:

```text
http://localhost:3000/api/health
```

## Nginx y HTTPS

Configurar Nginx como proxy hacia la API.

Ejemplo para `api.tudominio.com`:

```nginx
server {
  server_name api.tudominio.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Activar HTTPS con Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.tudominio.com
```

Verificar:

```text
https://api.tudominio.com/api/health
```

## Firewall

Permitir SSH, HTTP y HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

No abrir MySQL públicamente si MySQL corre en el mismo VPS.

## Instalación local o red interna

Para pruebas en una PC local o red interna, también se puede ejecutar manualmente:

```powershell
cd api
npm install
```

Crear `api/.env`:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/choninovet"
JWT_SECRET="cambiar-por-un-secreto-largo"
PORT=3000
```

`JWT_SECRET` es la clave privada que usa la API para firmar sesiones. No es una contraseña de usuario y no se ingresa en la app.

Para generar un valor seguro en PowerShell:

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

Copiar el resultado en `api/.env`:

```env
JWT_SECRET="resultado_generado"
```

Si se cambia `JWT_SECRET`, las sesiones abiertas dejan de ser válidas y los usuarios deben iniciar sesión nuevamente.

Aplicar migraciones:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Iniciar API:

```powershell
npm run start:dev
```

En producción se puede usar:

```powershell
npm run build
npm run start:prod
```

## Scripts de ayuda para Windows

Desde la raíz del proyecto se pueden usar estos scripts PowerShell:

```powershell
.\scripts\windows\instalar-api.ps1
.\scripts\windows\instalar-app.ps1
.\scripts\windows\migrar-api.ps1
.\scripts\windows\iniciar-api.ps1
.\scripts\windows\iniciar-web.ps1
```

Qué hace cada uno:

- `instalar-api.ps1`: instala dependencias del backend en `api`.
- `instalar-app.ps1`: instala dependencias de la app en `app`.
- `migrar-api.ps1`: ejecuta `prisma migrate deploy` y `prisma generate`.
- `iniciar-api.ps1`: inicia la API en modo desarrollo.
- `iniciar-web.ps1`: inicia la app web con Expo.

El script `crear-admin.ps1` existe solo como ayuda de desarrollo. En una instalación normal, el administrador inicial se crea desde la app.

Si PowerShell bloquea la ejecución de scripts, ejecutar una sola vez en esa terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Verificar API

Abrir:

```text
http://localhost:3000/api/health
```

Debe responder:

```json
{
  "status": "ok",
  "service": "choninovet-api"
}
```

También se puede consultar el estado de instalación:

```text
http://localhost:3000/api/setup/status
```

Ese endpoint indica si la API tiene base configurada, si pudo conectarse, si las migraciones están aplicadas y si ya existe un administrador inicial.

## Setup inicial por API

Para instalaciones nuevas, el backend expone endpoints de setup. La app usa estos endpoints para completar el primer arranque sin ejecutar seed manual.

Configurar y validar base de datos:

```http
POST /api/setup/database
```

Body:

```json
{
  "host": "localhost",
  "port": 3306,
  "database": "choninovet",
  "username": "usuario",
  "password": "password"
}
```

La API prueba la conexión MySQL, ejecuta `prisma migrate deploy`, guarda `DATABASE_URL` en `api/.env` y responde si se requiere reiniciar el backend.

Crear administrador inicial desde la app:

```http
POST /api/setup/admin
```

Body:

```json
{
  "email": "admin@choninovet.local",
  "password": "Cambiar1234"
}
```

Por seguridad, este endpoint solo crea el administrador si todavía no existe ninguna cuenta administradora. La pantalla `Crear administrador inicial` aparece automáticamente después de configurar la URL de API.

Después de existir un administrador, los endpoints de escritura de setup requieren token de una cuenta con rol `ADMIN`. Esto evita que alguien cambie la base de datos desde fuera del panel administrativo.

Si se usa desde celulares en la misma red, reemplazar `localhost` por la IP de la PC/servidor:

```text
http://192.168.1.50:3000/api/health
```

## Configurar app web

En otra terminal:

```powershell
cd app
npm install
npm run web
```

La app web quedará disponible en el puerto que indique Expo.

Al abrir la app por primera vez, se debe configurar la URL de API. La app valida esa URL contra `/api/health` antes de guardarla.

Ejemplo en la misma PC:

```text
http://localhost:3000/api
```

Ejemplo desde celulares en red local:

```text
http://192.168.1.50:3000/api
```

La URL también se puede cambiar luego desde el menú hamburguesa, opción `Servidor`.

Si la API no tiene administrador inicial, la app muestra automáticamente la pantalla `Crear administrador inicial`. No hace falta cargar `ADMIN_EMAIL`, `ADMIN_PASSWORD` ni ejecutar `npm run seed`.

Desde una cuenta administradora, el panel `Sistema` permite ver el estado de la API, la conexión MySQL, migraciones aplicadas y administrador inicial. También permite probar conexión y cambiar la base de datos como acción avanzada con confirmación.

## Distribución sin Play Store

choninovet puede distribuirse sin Play Store de tres formas:

- como web app dentro de una red local;
- como web app publicada desde un VPS;
- como APK Android instalado manualmente.

En todos los casos, la app debe apuntar a una API choninovet accesible. La app no incluye la base de datos; la base MySQL vive en el servidor de cada negocio.

## Uso como web app en red local

Este modo sirve para un negocio que usa una PC o servidor dentro del local.

Condiciones necesarias:

- la PC/servidor debe estar encendida;
- MySQL debe estar corriendo;
- la API debe estar corriendo;
- la app web debe estar corriendo si se usa por navegador;
- el firewall debe permitir el puerto de API, por defecto `3000`;
- conviene fijar una IP local para la PC/servidor;
- los celulares y otras PCs deben usar la IP local, no `localhost`.

Ejemplo de API para configurar en celulares:

```text
http://192.168.1.50:3000/api
```

Ejemplo de verificación:

```text
http://192.168.1.50:3000/api/health
```

Si responde `status: ok`, la API es accesible desde la red.

## Uso desde VPS

Este modo sirve para acceder desde fuera del local o desde varias sucursales.

Recomendaciones mínimas:

- publicar la API en un dominio o subdominio;
- usar HTTPS;
- no exponer MySQL públicamente si no es necesario;
- abrir solo el puerto de la API o el proxy web;
- cambiar siempre `JWT_SECRET`;
- usar un usuario MySQL específico para choninovet;
- configurar backups periódicos.

Ejemplo de URL de API para configurar en la app:

```text
https://api.midominio.com/api
```

Para este modo, el APK o la web app deben apuntar a una API accesible por internet.

## Generar APK instalable

Para distribuir sin Play Store, se puede generar un APK con Expo/EAS. El APK se instala manualmente en dispositivos Android y luego se configura con la URL de API del negocio.

Instalar EAS si no está instalado:

```powershell
npm install -g eas-cli
```

Desde `app`:

```powershell
eas build -p android --profile preview
```

El archivo generado se puede instalar manualmente en dispositivos Android. En el dispositivo puede ser necesario habilitar la instalación desde orígenes desconocidos.

Cuando se abre la app por primera vez, ingresar la URL de API:

```text
http://192.168.1.50:3000/api
```

o, si se usa VPS:

```text
https://api.midominio.com/api
```

La URL también se puede cambiar luego desde el menú hamburguesa, opción `Servidor`.

## Configuración de URL de API en celulares

Usar `localhost` solo cuando la app y la API corren en la misma máquina. En celulares, `localhost` apunta al propio teléfono, no a la PC del negocio.

Ejemplos correctos:

```text
http://192.168.1.50:3000/api
https://api.midominio.com/api
```

Ejemplos incorrectos en celulares:

```text
http://localhost:3000/api
http://127.0.0.1:3000/api
```

## Red local, IP fija y firewall

Para evitar que la app deje de conectar:

- asignar IP fija a la PC/servidor desde el router o desde Windows;
- mantener el puerto de API estable, por ejemplo `3000`;
- permitir el puerto en el firewall de Windows;
- verificar que celulares y PC estén en la misma red Wi-Fi/LAN;
- probar desde el celular abriendo `http://IP_DEL_SERVIDOR:3000/api/health`.

Regla de firewall orientativa en PowerShell ejecutado como administrador:

```powershell
New-NetFirewallRule -DisplayName "choninovet API 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## Backup mínimo de MySQL

Hacer backups periódicos antes de actualizaciones o cambios de servidor.

Exportar backup:

```powershell
mysqldump -u usuario -p choninovet > choninovet_backup.sql
```

Restaurar backup:

```powershell
mysql -u usuario -p choninovet < choninovet_backup.sql
```

Recomendación mínima: guardar al menos una copia diaria y una copia antes de aplicar migraciones o cambiar de base.

## Seguridad mínima self-hosted

- No guardar credenciales MySQL en la app móvil/web.
- Guardar `DATABASE_URL` solo en el servidor donde corre la API.
- No compartir `api/.env`.
- Cambiar siempre `JWT_SECRET` antes de usar una instalación real.
- Generar un `JWT_SECRET` distinto para cada instalación.
- Usar HTTPS si se accede desde internet o VPS.
- No exponer MySQL públicamente salvo que sea estrictamente necesario.
- Usar un usuario MySQL exclusivo para choninovet.
- Revisar que el panel `Sistema` solo sea accesible con cuenta administradora.
- Para cambiar la base desde el panel `Sistema`, la app exige confirmación escribiendo `CAMBIAR BASE`.
- Los endpoints de setup no devuelven passwords ni URLs MySQL completas con secreto.

## Notas importantes

- Las credenciales MySQL viven solo en el servidor API.
- La app móvil/web no debe guardar credenciales MySQL.
- Cada negocio puede tener su propia API y su propia base.
- La migración base del proyecto permite crear una base nueva desde cero con `npx prisma migrate deploy`.
- Si se cambia `api/prisma/schema.prisma`, ejecutar siempre `npx prisma generate` y luego `npx prisma migrate deploy` desde `api/`.
- Si aparece un error TypeScript como `Property 'photoUrl' does not exist`, o MySQL indica que una columna no existe, revisar primero que Prisma Client haya sido regenerado y que las migraciones pendientes hayan sido aplicadas.
