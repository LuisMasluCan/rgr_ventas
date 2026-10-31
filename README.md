# RGR Selva — Sistema de ventas

Aplicación de ventas construida con React, Vite, TypeScript, Tailwind CSS, funciones serverless de Vercel, Prisma ORM y PostgreSQL en Neon. Clientes, maquinaria y cotizaciones se guardan en la base de datos a través de la API REST.

## Base de datos y API

Copia `.env.example` como `.env` y configura `DATABASE_URL` (pooler, aplicación), `DATABASE_URL_UNPOOLED` (sin pooler, operaciones directas), `AUTH_EMAIL`, `AUTH_PASSWORD` y un `AUTH_SESSION_SECRET` aleatorio de al menos 32 caracteres. No subas `.env` al repositorio. Las tablas existentes se describen en `prisma/schema.prisma`; `postinstall` genera el cliente Prisma automáticamente:

```bash
npm install
npm run dev
```

`npm run dev` inicia un servidor Express local en `127.0.0.1:3001`, comprueba la conexión a Neon y luego inicia Vite en `http://localhost:5173`. Vite reenvía `/api/*` al servidor local; en este flujo no se usa Vercel. Prisma se ejecuta solo en Node.js, nunca en el navegador. Si faltan credenciales o Neon no responde, el servidor local muestra el error en la terminal y no se inicia como si la conexión funcionara.

El acceso se configura con un único correo y contraseña en variables privadas del servidor. La contraseña nunca se envía al navegador; al iniciar sesión, el servidor entrega una cookie firmada, HTTP-only, SameSite y con vencimiento a las 8 horas. Las rutas de datos requieren una sesión válida. Configura las mismas variables `AUTH_EMAIL`, `AUTH_PASSWORD` y `AUTH_SESSION_SECRET` en las variables de entorno de Vercel para Preview y Production; genera un secreto independiente y aleatorio de al menos 32 caracteres.

Las tablas ya existen. Cuando el esquema de Prisma incluya cambios nuevos, aplica primero el SQL correspondiente de `prisma/migrations/` en la base de datos o revisa y ejecuta `npm run db:push`; este comando modifica el esquema y debe usarse con cuidado. `npm run db:pull` inspecciona la base y actualiza `prisma/schema.prisma`; `npm run db:studio` abre Prisma Studio.

Las rutas de modificación y borrado reciben el UUID mediante `?id=<uuid>`; las etapas del Kanban y la descripción editable de la proforma se actualizan con `PUT /api/cotizaciones?id=<uuid>`. Al borrar una cotización aprobada, la unidad vendida se devuelve al inventario dentro de la misma transacción.

Para comprobar la conexión sin crear ni modificar datos, con el servidor local iniciado ejecuta `npm run test:api:smoke`. La prueba consulta `/api/health` y verifica que las tres rutas respondan listas JSON. Para probar otro despliegue: `API_BASE_URL=https://tu-dominio.vercel.app npm run test:api:smoke` (PowerShell: `$env:API_BASE_URL="https://tu-dominio.vercel.app"; npm run test:api:smoke`).

## Frontend

Para iniciar solo Vite (sin API ni conexión a la base), ejecuta `npm run dev:vite`.

Las rutas del frontend usan `/api/*` y, en desarrollo, el proxy las reenvía al servidor Express local. Al desplegar más adelante, Vercel podrá usar las funciones de `api/` con `DATABASE_URL` y `DATABASE_URL_UNPOOLED` configuradas en el panel.

**Antes de publicar:** el acceso es una única cuenta compartida, no un sistema de usuarios con recuperación de contraseña o permisos por persona. Rota las credenciales de Neon que se hayan compartido previamente y mantén todas las credenciales únicamente en las variables privadas de entorno.

## Producción

```bash
npm run build
npm run preview
```

La proforma se imprime en dos páginas, o tres cuando hay fotos de detalle: proforma, ficha técnica y galería. En el diálogo de impresión, selecciona «Guardar como PDF».

Las imágenes subidas se comprimen en el navegador a un máximo de 200 KB antes de guardarse como Base64 en PostgreSQL. Se permiten hasta 6 fotos de detalle más una foto del local; se pueden seleccionar juntas o agregar en varias tandas. La ficha técnica aparece en la segunda página y la galería ordenada en una tercera página de la proforma. Para una base existente, aplica las migraciones `prisma/migrations/20261030_add_machine_detail_photos/migration.sql`, `prisma/migrations/20261030_add_machine_quantity/migration.sql`, `prisma/migrations/20261030_add_quotation_description/migration.sql`, `prisma/migrations/20261030_add_bucket_capacities/migration.sql` y `prisma/migrations/20261031_add_machine_category/migration.sql` antes de usar esos campos. La categoría se conserva por producto y las filas existentes usan "Maquinaria" como valor inicial. El peso operativo se guarda por maquinaria; las capacidades opcionales de cucharón se pueden registrar para cualquier equipo, con nombres especializados para "Mini Retroexcavadora F312". La descripción se guarda con cada cotización y parte de las condiciones comerciales predeterminadas, que se pueden editar antes de emitir la proforma. El inventario inicia con una unidad disponible por maquinaria nueva; entrar a la etapa Cierre descuenta una unidad en la misma transacción, y salir de Cierre o eliminar una cotización aprobada la devuelve. Las proformas usan numeración anual `RGR N° AA-NNN-G`, empezando en 001.

Las credenciales que se compartieron en el chat deben rotarse antes de habilitar el acceso de producción. Añádelas en Vercel como variables de entorno y conserva `.env` únicamente en tu equipo local; el repositorio solo incluye `.env.example`.
