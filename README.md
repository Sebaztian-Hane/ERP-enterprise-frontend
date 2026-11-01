# ERP EnterpriseCloud Frontend

Interfaz React para el ERP, con una experiencia empresarial inspirada en los patrones de navegación y productividad de Odoo y SAP Fiori, sin reproducir sus marcas ni componentes.

## Ejecutar localmente

```powershell
npm ci
npm start
```

Abre http://localhost:5173/. La interfaz usa por defecto la API existente en
Render y Supabase Auth. No necesitas crear `.env` para ese modo. Los datos
siguen perteneciendo a la empresa de la sesión autenticada.

Para usar otra API, crea `.env.local` y configura `VITE_API_URL` seguida de
`/api/v1`. No copies credenciales privadas del backend al frontend.

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Validación

```powershell
npm test
npm run build
```

La pantalla inicial incluye una capa de Canvas exclusivamente decorativa en el indicador de rendimiento. No oculta datos, no recibe interacciones y se desactiva automáticamente cuando el sistema solicita movimiento reducido.

## Centro de datos

Web pública: https://erp-enterprise-frontend.vercel.app/.
La guía de uso está en **Aplicaciones → Guía de uso** (`#guia`).

Propietarios y administradores disponen de **Aplicaciones → Centro de datos**.
El botón **Migrar** de cada módulo usa el mismo componente y las mismas rutas.
La definición de columnas viene de `GET /imports/templates`, con compatibilidad
con la API anterior; no existe una segunda lista de columnas en el navegador.

El backend actualizado ofrece 25 columnas para materiales, plantillas Excel con
diccionario/catálogos/ejemplo separado, exportación CSV/XLSX, incidencias por
fila y un comprobante de carga. Los atributos industriales se consultan y editan
desde **Productos → Editar → Ficha industrial y planificación**.

Para habilitar los 25 campos en el servidor, aplica la migración
`0064_material_master_profiles.sql` del repositorio backend. La API actualizada
ofrece nueve campos base mientras falta esa tabla adicional. La interfaz utiliza
las capacidades que anuncie la API conectada y admite el contrato anterior.

## Módulos y roles

El panel incorpora 14 áreas adicionales: HCM, SD, MM, PP, PM, QM, WM, TM,
PS, CO, AA, CRM, EHS y CS. Incluyen 24 tipos de documento con formularios
tipados, búsqueda de referencias por empresa, versiones, estados e historial.
FI y DMS conservan sus pantallas existentes. La guía `#guia` explica su uso.
Para registrar documentos nuevos hay que activar la migración backend
`0065_enterprise_modules.sql`; la pantalla indica expresamente si falta.
Se suman 11 especialidades sin reemplazar los siete códigos de rol anteriores.

Los cierres documentales no generan nómina, depreciación fiscal, consumos de
producción ni movimientos WM/TM automáticos. El alcance se indica en cada
transacción; stock, pagos y contabilidad conservan sus procesos actuales.

`npm run build` y `npm test` revisan también UTF-8 y tildes dañadas. Los
archivos se editan como UTF-8 según `.editorconfig`; al enviar datos desde
Windows usar archivos UTF-8, evitando conversiones de la consola.

Contabilidad financiera, Aprobaciones, Flujo de caja, Disponibilidad/reservas y
Valoración de referencia son accesos propios a funciones del backend existente.
La guía explica los recorridos de compra, venta, inventario y carga de datos.

Se conservan los siete roles: `owner`, `admin`, `sales`, `purchases`, `finance`,
`inventory` y `viewer`. El menú incorpora restricciones por empresa/usuario
recibidas de `/auth/access`. Ante una API anterior, solo un `404` permite volver
a `/auth/me`; una respuesta de autorización denegada no activa ese fallback.
Compras y Consulta acceden al material en modo de consulta, con controles de
escritura ocultos. Las reservas manuales requieren permiso de inventario.

`npm run test:e2e` ejecuta Playwright con un navegador aislado y respuestas de
prueba; no envía cargas ni reservas a producción. En Windows usa Microsoft Edge
y en CI Chromium. Las verificaciones incluyen los siete roles, restricciones
por empresa, confirmación de carga con hash/idempotencia, consulta y reserva,
escritura oculta y presentación móvil.

## Repositorios y publicación

Esta carpeta es el repositorio `Sebaztian-Hane/ERP-enterprise-frontend`.
`../ERP-enterprise-cloud` tiene su propio historial y remoto. Un cambio local
aparece en GitHub después de hacer commit y push **en el repositorio al que
pertenece**. Una rama de trabajo permite revisar ambos cambios antes de
integrarlos a `main`; el backend tiene despliegue automático configurado.
