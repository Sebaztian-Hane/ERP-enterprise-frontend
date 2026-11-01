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

## Centro de migraciones

Web: https://erp-enterprise-frontend.vercel.app/#centro-de-datos

Un panel exclusivo para propietarios y administradores, con grupos derivados
 de los módulos habilitados, 33 objetos de carga, acciones desplegables,
simulación de dependencias y confirmación final atómica. Los módulos de
negocio ya no contienen botones Migrar. Las referencias de transacciones
comparten ventanas de búsqueda por código/descripción y selección con F4.

[Guía paso a paso y orden de plantillas](https://github.com/Sebaztian-Hane/ERP-enterprise-cloud/blob/main/docs/README-MIGRACIONES.md)

[Paquete de 33 Excel de prueba](https://github.com/Sebaztian-Hane/ERP-enterprise-cloud/raw/refs/heads/main/examples/migrations/ejemplos-migracion-DUNSDEMO.zip)

El catálogo de grupos y campos proviene de `/migration-projects/catalog`.
Los grupos requieren `0066_migration_projects.sql`, los documentos empresariales
`0065_enterprise_modules.sql` y los 25 campos de materiales
`0064_material_master_profiles.sql`. La interfaz respeta las capacidades de la API.

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

Se conservan los roles base `owner`, `admin`, `sales`, `purchases`, `finance`,
`inventory` y `viewer`, junto con los once roles especializados. El menú incorpora restricciones por empresa/usuario
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

## Módulos, áreas de trabajo y transacciones

El panel Aplicaciones presenta 18 espacios: SD, MM, WM, FI, HCM, PP, PM, QM,
TM, PS, CO, AA, CRM, EHS, CS, DMS, BI y Administración del propietario.
Solo aparecen los autorizados para el rol, la empresa y el usuario.
Dentro de cada módulo, las transacciones se agrupan en datos maestros,
preparación, operación y seguimiento. Administración tiene su propia sección.

Por ejemplo, `#sd` contiene clientes, consulta de materiales, acuerdos,
cotizaciones, pedidos y entregas, ventas y punto de venta. Los canales disponibles
dependen del perfil del negocio. `#sd/clientes` abre la transacción de clientes;
Volver al módulo regresa a SD. Los enlaces anteriores, como `#clientes`, siguen
respetando los permisos. Los maestros de materiales siguen siendo compartidos.

Ventas trabaja en SD; Compras en MM; Inventario en WM; Finanzas en FI; cada rol
especializado trabaja en su módulo. Consulta ve los espacios habilitados de
lectura, excepto HCM y EHS. Administrador operativo accede a las operaciones
habilitadas, sin administración de usuarios, configuración ni migraciones.

El propietario entra a Administración del propietario → Usuarios y permisos
(`/#gobierno/accesos`), asigna el rol y abre Módulos y transacciones para restringir
los accesos de un miembro. Guardar cambios requiere segundo factor. Activar una
casilla no otorga permisos ajenos al rol ni habilita algo bloqueado para la empresa.
Las especialidades usan su permiso de módulo; SD, MM y FI conservan además los
controles de transacción existentes. El proveedor conserva su consola autorizada
para habilitar módulos por empresa. Estas restricciones se validan también en la API.

Esta reorganización reutiliza las tablas existentes: no requiere ejecutar SQL nuevo.
El catálogo de navegación está en `src/lib/workspaceCatalog.ts`; las reglas de
visibilidad y enlaces están en `src/lib/workspaceNavigation.ts`.
