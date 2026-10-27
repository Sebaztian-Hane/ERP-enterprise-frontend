# Ventas minoristas y paginación operacional

## Intención

Separar correctamente los canales de venta por perfil comercial y hacer que
las tablas operacionales escalen mediante paginación de servidor.

## Decisiones aprobadas

- Una empresa **minorista** crea ventas exclusivamente mediante Punto de venta.
- En una empresa minorista, **Ventas** se conserva como historial paginado y
  permite acciones posteriores sobre la operación: comprobante, devolución y
  anulación. No muestra el botón ni formulario de Nueva venta.
- Empresas mayoristas conservan Ventas administrativo y no acceden a POS.
- Empresas híbridas conservan ambos canales.
- Toda tabla que hoy consulte un listado completo debe adoptar el contrato
  paginado existente: `{ <colección>: [], meta: { page, page_size, total,
  total_pages, has_previous, has_next } }`.

## Arquitectura

El backend protegerá la creación administrativa con un guard específico de
perfil comercial, separado de la lectura de ventas. Esto evita que ocultar el
botón en la interfaz pueda eludirse mediante una llamada directa a la API.

El frontend leerá el perfil de la empresa activa para mostrar Ventas en modo
historial para minoristas. La paginación reutilizará `fetchPage` y
`TablePagination`; cada endpoint que aún entregue listas completas migrará
conservando su clave de colección y añadiendo `meta`.

## Límites

- No cambia la lógica fiscal, POS, comprobantes, devoluciones ni anulaciones.
- No se realiza paginación exclusivamente en el navegador.
- No se mezclan datos entre tenants; todas las consultas siguen filtradas por
  `tenant_id`.

## Criterios de aceptación

- Un tenant retail recibe 403 si intenta crear una venta mediante `POST /sales`.
- En retail, Ventas no presenta Nueva venta ni su formulario, pero conserva
  comprobantes, devolución y anulación sobre registros existentes.
- Mayorista e híbrida conservan los comportamientos habilitados definidos.
- Las tablas migradas exponen controles y metadatos de paginación reales.
- Las pruebas y la compilación de producción se mantienen correctas.
