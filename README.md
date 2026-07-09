# choninovet

**Gestión Veterinaria de Código Abierto**

choninovet es una aplicación web y móvil self-hosted para gestión veterinaria. Está pensada para que cada clínica, profesional o negocio pueda instalar su propia API y usar su propia base de datos MySQL, sin depender de una base central ni de Docker.

El sistema separa claramente la experiencia de propietarios, veterinarios/as y administración, y cubre el flujo operativo principal: usuarios, mascotas, turnos, agenda, historial médico, recordatorios, mensajería, alertas y auditoría administrativa.

## ¿Por qué Chonino?

El nombre choninovet es un homenaje a Chonino, el ovejero alemán de la Policía Federal Argentina que dio su vida en 1983 salvando a su guía. Su historia de lealtad y servicio inspiró el Día Nacional del Perro en Argentina, conmemorado cada 2 de junio.

Esa referencia conecta directamente con el propósito del software: ayudar a cuidar mejor a los animales, ordenar la atención veterinaria y facilitar el trabajo de las personas que acompañan su salud. choninovet busca ser una herramienta abierta, práctica y extensible para clínicas, profesionales y comunidades que necesitan una base tecnológica accesible para gestionar el bienestar animal.

## Modelo self-hosted

choninovet no funciona como una app centralizada con una única base de datos. Cada instalación puede tener su propio backend y su propia base MySQL.

```text
App móvil / navegador web
  -> API choninovet del negocio
      -> MySQL del negocio
```

La app móvil/web no se conecta directamente a MySQL. Las credenciales de base de datos viven solo en el servidor donde corre la API.

## Estado del proyecto

MVP funcional en desarrollo activo.

## Funcionalidades del MVP

- Accesos separados para propietarios, veterinarios/as y administración.
- Registro de propietarios con aprobación administrativa.
- Alta de veterinarios/as desde administración.
- Gestión de mascotas y fichas de paciente.
- Solicitud de turnos por propietarios con calendario y horarios disponibles.
- Agenda de turnos para veterinarios/as y administración.
- Aprobación, rechazo y seguimiento de solicitudes de turno.
- Configuración de horarios de atención por días de semana, sábado y domingo.
- Historial médico por mascota.
- Recordatorios clínicos.
- Mensajería entre propietarios y veterinarios/as.
- Alertas operativas.
- Auditoría administrativa de acciones relevantes.

## Flujos principales

### Propietarios

El propietario puede registrar mascotas, solicitar turnos, revisar su agenda, consultar fichas e historial, recibir recordatorios y comunicarse con veterinarios/as habilitados.

### Veterinarios/as

El panel veterinario/a funciona como dashboard de accesos mobile-first. Desde ahí se entra a:

- `Agenda y solicitudes`: calendario, solicitudes pendientes, turnos confirmados y cambios de estado.
- `Pacientes`: pantalla propia con listado de pacientes asociados y acceso a ficha clínica.
- `Recordatorios`, `Alertas`, `Mensajes` y `Perfil`.

### Administración

La administración permite crear veterinarios/as, aprobar o rechazar cuentas de propietarios, revisar usuarios, pacientes, agenda, horarios de atención, métricas y auditoría.

## Stack

- Frontend mobile/web: Expo SDK 54, React Native, Expo Router y React Native Web.
- Backend: NestJS.
- Base de datos: MySQL.
- ORM: Prisma.
- Estado y datos cliente: Zustand y TanStack Query.

## Estructura del repositorio

```text
app/   Aplicación Expo para web, Android e iOS.
api/   API NestJS con Prisma y MySQL.
```

## Requisitos

- Node.js 22 o compatible.
- npm.
- MySQL 8 o compatible.
- PowerShell, CMD o shell equivalente.
- Red local o VPS si se usará desde varios dispositivos.
- Expo mediante `npx expo`.

No se requiere Docker.

## Instalación rápida self-hosted

Para una guía paso a paso más detallada, ver:

[Instalación self-hosted sin Docker](./INSTALACION_SELF_HOSTED.md)

### 1. Crear base de datos

```sql
CREATE DATABASE choninovet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configurar backend

Crear `api/.env`:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/choninovet"
JWT_SECRET="cambiar-por-un-secreto-largo"
PORT=3000
ADMIN_EMAIL="admin@choninovet.local"
ADMIN_PASSWORD="Cambiar1234"
```

Instalar y preparar API:

```powershell
cd api
npm install
npx prisma migrate deploy
npx prisma generate
npm run seed
```

En Windows también se pueden usar los scripts incluidos:

```powershell
.\scripts\windows\instalar-api.ps1
.\scripts\windows\migrar-api.ps1
.\scripts\windows\crear-admin.ps1
```

Iniciar API en desarrollo:

```powershell
npm run start:dev
```

Iniciar API en modo producción:

```powershell
npm run build
npm run start:prod
```

### 3. Verificar API

Abrir:

```text
http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "choninovet-api"
}
```

Estado de instalación:

```text
http://localhost:3000/api/setup/status
```

La API también expone endpoints de setup inicial:

- `POST /api/setup/database`: valida MySQL, aplica migraciones y guarda `DATABASE_URL` en el servidor.
- `POST /api/setup/admin`: crea el administrador inicial si todavía no existe.

Después de configurar o cambiar la base desde setup, se recomienda reiniciar la API para que todos los módulos usen la nueva conexión.

Si se usa desde celulares en la misma red, reemplazar `localhost` por la IP de la PC o servidor:

```text
http://192.168.1.50:3000/api/health
```

### 4. Configurar app

Al abrir la app por primera vez, choninovet solicita la URL de la API del negocio y valida la conexión contra `/api/health`.

Ejemplo local:

```text
http://localhost:3000/api
```

Ejemplo en red local:

```text
http://192.168.1.50:3000/api
```

También se puede crear `app/.env` para precargar una URL sugerida en desarrollo:

```env
EXPO_PUBLIC_API_URL="http://localhost:3000/api"
```

Para usar desde otro celular en red local:

```env
EXPO_PUBLIC_API_URL="http://192.168.1.50:3000/api"
```

Instalar y ejecutar app web:

```powershell
cd app
npm install
npm run web
```

Scripts equivalentes para Windows:

```powershell
.\scripts\windows\instalar-app.ps1
.\scripts\windows\iniciar-web.ps1
```

Ejecutar en Android o iOS con Expo:

```powershell
npm run android
npm run ios
```

## Cuenta administrativa inicial

La semilla del backend crea una cuenta administrativa inicial usando estas variables:

```env
ADMIN_EMAIL="admin@choninovet.local"
ADMIN_PASSWORD="Cambiar1234"
```

Si no se definen, el seed usa valores por defecto. En una instalación real se recomienda cambiar siempre la contraseña inicial después del primer ingreso.

## Migraciones y base limpia

Las migraciones Prisma incluyen una migración base completa para crear una base nueva desde cero:

```powershell
cd api
npx prisma migrate deploy
```

Para desarrollo local, si se necesita reiniciar la base y borrar datos:

```powershell
cd api
npx prisma migrate reset
```

Ese comando elimina datos. No debe usarse sobre una base real sin backup.

## Distribución sin Play Store

choninovet puede usarse sin Play Store de tres maneras:

- web app en red local;
- web app publicada desde un VPS;
- APK Android instalado manualmente.

En todos los casos, cada dispositivo debe configurar la URL de API del negocio. En celulares no se debe usar `localhost`; se debe usar la IP local del servidor o el dominio del VPS.

Ejemplos:

```text
http://192.168.1.50:3000/api
https://api.midominio.com/api
```

Para más detalle sobre red local, VPS, firewall, APK y backups, ver:

[Instalación self-hosted sin Docker](./INSTALACION_SELF_HOSTED.md)

Instalar EAS:

```powershell
npm install -g eas-cli
```

Desde `app`:

```powershell
eas build -p android --profile preview
```

El APK debe apuntar a una API accesible por red local o internet.

## Recomendaciones para red local o VPS

- Fijar una IP local para la PC/servidor si se usa dentro del negocio.
- Permitir el puerto `3000` en firewall si la API corre en ese puerto.
- Usar HTTPS si la API queda expuesta por internet.
- Cambiar siempre `JWT_SECRET`.
- No exponer MySQL públicamente si no es necesario.
- Hacer backups periódicos de MySQL.

Backup mínimo:

```powershell
mysqldump -u usuario -p choninovet > choninovet_backup.sql
```

Restaurar backup:

```powershell
mysql -u usuario -p choninovet < choninovet_backup.sql
```

## Licencia

MIT.
