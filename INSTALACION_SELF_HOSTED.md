# Instalación self-hosted sin Docker

Esta guía explica cómo instalar choninovet en una PC local, servidor de red o VPS sin Docker. Cada negocio usa su propia API y su propia base de datos MySQL.

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
- Acceso a terminal PowerShell, CMD o shell equivalente.
- Red local o VPS con puerto de API accesible.

## Instalación de MySQL

Instalar MySQL en la PC/servidor del negocio. En Windows se puede usar una instalación directa de MySQL Community Server o paquetes locales como Laragon/XAMPP si ya se usan en el entorno.

Crear una base de datos vacía:

```sql
CREATE DATABASE choninovet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Crear o elegir un usuario MySQL con permisos sobre esa base.

## Configurar API

Entrar a la carpeta del backend:

```powershell
cd api
npm install
```

Crear `api/.env`:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/choninovet"
JWT_SECRET="cambiar-por-un-secreto-largo"
PORT=3000
ADMIN_EMAIL="admin@choninovet.local"
ADMIN_PASSWORD="Cambiar1234"
```

Aplicar migraciones:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Crear administrador inicial:

```powershell
npm run seed
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
.\scripts\windows\crear-admin.ps1
.\scripts\windows\iniciar-api.ps1
.\scripts\windows\iniciar-web.ps1
```

Qué hace cada uno:

- `instalar-api.ps1`: instala dependencias del backend en `api`.
- `instalar-app.ps1`: instala dependencias de la app en `app`.
- `migrar-api.ps1`: ejecuta `prisma migrate deploy` y `prisma generate`.
- `crear-admin.ps1`: ejecuta el seed para crear o actualizar el administrador inicial.
- `iniciar-api.ps1`: inicia la API en modo desarrollo.
- `iniciar-web.ps1`: inicia la app web con Expo.

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

Para instalaciones nuevas, el backend expone endpoints de setup.

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

Crear administrador inicial:

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

Por seguridad, este endpoint solo crea el administrador si todavía no existe ninguna cuenta administradora.

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

## Notas importantes

- Las credenciales MySQL viven solo en el servidor API.
- La app móvil/web no debe guardar credenciales MySQL.
- Cada negocio puede tener su propia API y su propia base.
- La migración base del proyecto permite crear una base nueva desde cero con `npx prisma migrate deploy`.
