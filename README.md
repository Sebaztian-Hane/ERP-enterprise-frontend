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

Propietarios y administradores disponen de **Aplicaciones → Centro de datos**.
El botón **Migrar** de cada módulo usa el mismo componente y las mismas rutas.
La definición de columnas viene de `GET /imports/templates`, con compatibilidad
con la API anterior; no existe una segunda lista de columnas en el navegador.

El backend actualizado ofrece 25 columnas para materiales, plantillas Excel con
diccionario/catálogos/ejemplo separado, exportación CSV/XLSX, incidencias por
fila y un comprobante de carga. Los atributos industriales se consultan y editan
desde **Productos → Editar → Ficha industrial y planificación**.

Para habilitar los campos nuevos en el servidor, aplica primero la migración
`0064_material_master_profiles.sql` del repositorio backend y luego despliega
esa API. La interfaz utiliza las capacidades que anuncie la API conectada.

## Repositorios y publicación

Esta carpeta es el repositorio `Sebaztian-Hane/ERP-enterprise-frontend`.
`../ERP-enterprise-cloud` tiene su propio historial y remoto. Un cambio local
aparece en GitHub después de hacer commit y push **en el repositorio al que
pertenece**. Una rama de trabajo permite revisar ambos cambios antes de
integrarlos a `main`; el backend tiene despliegue automático configurado.
