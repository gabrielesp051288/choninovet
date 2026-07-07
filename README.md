# choninovet

**Gestión Veterinaria de Código Abierto**

choninovet es una aplicación web y móvil para la gestión veterinaria, pensada para separar claramente la experiencia de propietarios, veterinarias y administración. El proyecto apunta a cubrir el flujo operativo principal: usuarios, mascotas, turnos, agenda, historial médico, recordatorios, mensajería, alertas y auditoría administrativa.

## ¿Por qué Chonino?

El nombre choninovet es un homenaje a Chonino, el ovejero alemán de la Policía Federal Argentina que dio su vida en 1983 salvando a su guía. Su historia de lealtad y servicio inspiró el Día Nacional del Perro en Argentina, conmemorado cada 2 de junio.

Esa referencia conecta directamente con el propósito del software: ayudar a cuidar mejor a los animales, ordenar la atención veterinaria y facilitar el trabajo de las personas que acompañan su salud. choninovet busca ser una herramienta abierta, práctica y extensible para clínicas, profesionales y comunidades que necesitan una base tecnológica accesible para gestionar el bienestar animal.

## Estado del proyecto

MVP funcional en desarrollo activo.

## Stack principal

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

- Node.js 22 o compatible con el stack instalado.
- npm.
- MySQL local o remoto.
- Expo CLI vía `npx expo`.

## Configuración inicial

Crear la base de datos MySQL:

```sql
CREATE DATABASE choninovet;
```

Configurar variables de entorno del backend en `api/.env`:

```env
DATABASE_URL="mysql://root:root@localhost:3306/choninovet"
JWT_SECRET="dev-secret-change-later"
PORT=3000
```

## Instalación

```bash
cd api
npm install
npx prisma migrate deploy
npx prisma generate
npm run seed
```

```bash
cd ../app
npm install
```

## Ejecución en desarrollo

Backend:

```bash
cd api
npm run start:dev
```

Frontend:

```bash
cd app
npm run web
```

Para Android o iOS con Expo:

```bash
npm run android
npm run ios
```

## Cuenta administrativa inicial

La semilla de desarrollo crea una cuenta administrativa inicial configurable desde variables de entorno. Si no se definen variables, se usan los valores por defecto del seed.
