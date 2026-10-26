# Descarga de plantillas XLSX para migraciones

## Intención

Permitir a propietarios y administradores descargar la misma plantilla de
migración en formato XLSX además del CSV actual, para que puedan preparar
cargas de productos, clientes, proveedores, almacenes, inventario, ventas y
compras directamente en Excel.

## Alcance

- Añadir una acción explícita para descargar XLSX en `DataMigrationPanel`.
- Mantener la descarga CSV existente.
- Generar una sola hoja con encabezados y una fila de ejemplo idénticos a los
  que el backend valida.
- No alterar el contrato de importación, permisos, validación ni persistencia.

## Enfoques considerados

1. Generar el XLSX en el navegador a partir de la definición de plantilla ya
   usada por el panel. Es el enfoque elegido: evita un endpoint adicional y
   garantiza que las columnas descargadas coincidan con la pantalla.
2. Crear un endpoint que entregue archivos XLSX prearmados. Añadiría carga al
   backend y duplicaría la definición de cada plantilla sin aportar una ventaja
   para archivos de dos filas.

## Decisión

Se generará el archivo desde el navegador usando una dependencia ligera de
XLSX, con el nombre `plantilla-<modulo>.xlsx`. El contenido será solo
encabezados y ejemplo; no incluirá fórmulas ni datos de la empresa.

## Criterios de aceptación

- Cada panel de migración muestra opciones para descargar CSV y XLSX.
- El XLSX abre en Excel con una hoja y las columnas correctas.
- El archivo XLSX descargado es aceptado por el endpoint de previsualización.
- La compilación de producción sigue siendo correcta.
