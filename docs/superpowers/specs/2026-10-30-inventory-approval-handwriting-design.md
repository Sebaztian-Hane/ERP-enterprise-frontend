# Aprobación obligatoria y firma manuscrita interna

## Intención

Todo inventario físico enviado debe requerir aprobación antes de afectar las
existencias. La decisión del aprobador incluirá una firma manuscrita capturada
con lápiz, mouse o táctil, además de la firma criptográfica interna existente.

## Decisiones

- La ausencia de una política configurable no elimina la aprobación: se crea
  una solicitud de aprobación con autorización de propietario o administrador.
- El conteo solo puede aplicarse con una solicitud aprobada y una firma interna
  criptográficamente verificable asociada a esa solicitud.
- El trazo manuscrito se conserva como SVG inmutable junto a la evidencia de
  firma; es una representación visual, no un certificado legal cualificado.
- El certificado legal y su proveedor permanecen explícitamente pendientes.

## Límites

- El trazo no reemplaza la autenticación, el segundo factor ni la firma P-256.
- No se almacenan claves privadas, certificados ni PINs.
- La decisión y la firma conservan el aislamiento por `tenant_id`.

## Criterios de aceptación

- Un conteo físico sin solicitud aprobada nunca puede aplicarse.
- El administrador puede dibujar, limpiar y confirmar una firma con lápiz,
  mouse o touch; no puede confirmar sin trazo.
- El SVG queda vinculado a la misma evidencia que la firma P-256 y se puede
  consultar como evidencia visual.
