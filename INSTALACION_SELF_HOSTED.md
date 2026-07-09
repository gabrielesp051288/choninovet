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

Desde una cuenta administradora, el panel `Sistema` permite ver el estado de la API,
la conexión MySQL, migraciones aplicadas y administrador inicial. También permite
probar conexión y cambiar la base de datos como acción avanzada con confirmación.

## Uso en red local

Para que otros dispositivos puedan acceder:

- la PC/servidor debe estar encendida;
- la API debe estar corriendo;
- el firewall debe permitir el puerto `3000`;
- conviene fijar una IP local para la PC/servidor;
- los celulares deben usar la URL de API con IP local, no `localhost`.

Ejemplo:

```text
http://192.168.1.50:3000
```

## Generar APK instalable

Para distribuir sin Play Store, se puede generar un APK con Expo/EAS. El APK debe apuntar a una API accesible por red local o por internet.

Instalar EAS si no está instalado:

```powershell
npm install -g eas-cli
```

Desde `app`:

```powershell
eas build -p android --profile preview
```

El archivo generado se puede instalar manualmente en dispositivos Android. Para uso fuera de una red local, la API debe estar publicada en un VPS o dominio accesible.

## Recomendaciones para VPS

- Usar HTTPS.
- Cambiar siempre `JWT_SECRET`.
- No exponer MySQL públicamente si no es necesario.
- Abrir solo el puerto de API necesario.
- Configurar backups periódicos de MySQL.

## Backup mínimo de MySQL

Exportar backup:

```powershell
mysqldump -u usuario -p choninovet > choninovet_backup.sql
```

Restaurar backup:

```powershell
mysql -u usuario -p choninovet < choninovet_backup.sql
```

## Notas importantes

- Las credenciales MySQL viven solo en el servidor API.
- La app móvil/web no debe guardar credenciales MySQL.
- Cada negocio puede tener su propia API y su propia base.
- La migración base del proyecto permite crear una base nueva desde cero con `npx prisma migrate deploy`.
