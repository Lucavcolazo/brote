# Brote 🌱

App web mobile (PWA) para dos: cada día cada uno sube una foto de la fruta o verdura que comió.
Si alguien pasa un día sin subir nada (o el otro le rechaza la foto), **el otro suma 1 punto**. Los puntos se canjean en la tienda.

- **Marcador**: los dos puestos (toldo, avatar y cartel con puntos y racha), quién cumplió hoy y el feed de fotos. El otro marca cada foto como "Vale" o "No cuenta".
- **Tienda**: arranca vacía; ustedes cargan, editan y borran los premios. Al canjear, al otro le llega un aviso y queda "pendiente" hasta que se cumple.
- **Semana**: rachas (actual y mejor), calendario de la semana, resúmenes y movimientos de puntos.
- **Config**: editor de avatar (forma, color, ojos, boca, extras), nombre, idioma (Español / Português BR) y notificaciones.

## Cómo funciona el tiempo (hora argentina)

| Cuándo | Qué pasa |
|---|---|
| Todos los días 12:30 | Recordatorio a quien no subió nada |
| Todos los días 21:30 | "Última llamada" |
| Todos los días 10:00 | Se cierra **el día anterior** y se reparten los puntos (hasta esa hora se puede cargar lo de ayer) |
| Domingo 21:00 | Resumen semanal (puntos + comidas) |
| Miércoles 04:00 | Se borran las fotos de las semanas ya resumidas. **La data queda**, solo se van las imágenes |

Los horarios están en [supabase/cron.sql](supabase/cron.sql) y la hora de gracia en la migración (`private.grace_hour()`).
Las notificaciones le llegan a cada uno en su idioma.

## Probar sin configurar nada (modo demo)

```bash
npm install
```

```bash
npm run dev
```

Sin `.env` arranca en modo demo, con datos inventados: poné cualquier email y contraseña (si el email empieza con "gio" entrás como Giovanna).

## Puesta en marcha real

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pegá y ejecutá [supabase/migrations/20261106000000_brote.sql](supabase/migrations/20261106000000_brote.sql).
3. **Authentication → Sign In / Providers → Email**: dejá activo *Email* y desactivá *Allow new users to sign up* (la app es cerrada: solo entran las cuentas que crees vos).
4. **Authentication → Users → Add user → Create new user**: creá las 2 cuentas con email y contraseña, y marcá *Auto Confirm User*.

La sesión no caduca: cada uno entra una vez y queda adentro hasta tocar "Cerrar sesión" (no actives *Time-box user sessions* ni *Inactivity timeout* en Authentication → Sessions). Para cambiar una contraseña: Authentication → Users → la cuenta → *Reset password* o *Update user*.

La primera vez que cada uno entra elige su nombre y su idioma; el avatar y el nombre se cambian después en Config.

### 2. Claves para notificaciones

```bash
npm run vapid
```

Te da una *Public Key* y una *Private Key*. Inventá también un `CRON_SECRET` largo (por ejemplo con `openssl rand -hex 32`).

### 3. Edge function `push`

En **Edge Functions → Secrets** cargá:

- `CRON_SECRET` = el que inventaste
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` = las del paso 2
- `VAPID_SUBJECT` = la URL de la app (ej. `https://brote.vercel.app`)

Deploy (con la CLI, `npx supabase login` la primera vez):

```bash
npx supabase functions deploy push --no-verify-jwt --project-ref TU-PROJECT-REF
```

O desde el dashboard: *Edge Functions → Deploy a new function → Via editor*, nombre `push`, pegá [supabase/functions/push/index.ts](supabase/functions/push/index.ts) y desactivá *Verify JWT*.

### 4. Horarios

Editá las dos primeras variables de [supabase/cron.sql](supabase/cron.sql) (URL del proyecto y `CRON_SECRET`) y ejecutalo en el SQL Editor.

### 5. Frontend en Vercel

Importá el repo en Vercel (detecta Vite solo) y cargá las variables de [.env.example](.env.example):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.

### 6. En los celulares

- **iPhone** (iOS 16.4+): abrir en Safari → Compartir → *Agregar a pantalla de inicio* → abrir desde el ícono → entrar con email y contraseña → **Config → Activar notificaciones**. En iPhone las notificaciones solo funcionan con la app instalada así.
- **Android**: abrir en Chrome → *Instalar app* → entrar → **Config → Activar notificaciones**.

## Probar las tareas programadas a mano

```bash
curl -X POST https://TU-PROYECTO.supabase.co/functions/v1/push \
  -H "x-cron-secret: TU_CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"action":"remind","slot":"midday"}'
```

Otras acciones: `close_day` (opcional `"date":"2026-11-05"`), `weekly_summary`, `cleanup_photos`.

## Desarrollo

- `npm run test:sql`: corre la migración en un Postgres embebido y prueba puntos, permisos, tienda, resumen y limpieza de fotos.
- `npm run check:i18n`: avisa si algún texto de la UI no tiene traducción al portugués.
- Textos: [src/i18n.tsx](src/i18n.tsx) (la clave es el texto en español).
- Estilos: [src/styles.css](src/styles.css); los colores están como variables arriba de todo. Las piezas del mundo Feira (toldo, cartel, números que ruedan) están en [src/components/feira.tsx](src/components/feira.tsx).
- Avatar: [src/avatar/model.ts](src/avatar/model.ts) (formas, colores, ojos, bocas, extras) y [src/avatar/Avatar.tsx](src/avatar/Avatar.tsx) (dibujo y animación).
- Íconos: [react-icons](https://react-icons.github.io/react-icons/), familia Phosphor (`react-icons/pi`). Animaciones: [Motion](https://motion.dev).
