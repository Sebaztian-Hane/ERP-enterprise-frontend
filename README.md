# ERP EnterpriseCloud Frontend

Interfaz React para el ERP, con una experiencia empresarial inspirada en los patrones de navegación y productividad de Odoo y SAP Fiori, sin reproducir sus marcas ni componentes.

## Ejecutar localmente

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

En `.env`, reemplaza `VITE_API_URL` por la URL pública de Render seguida de `/api/v1`.

```env
VITE_API_URL=https://tu-servicio.onrender.com/api/v1
```

## Validación

```powershell
npm run build
```

La pantalla inicial incluye una capa de Canvas exclusivamente decorativa en el indicador de rendimiento. No oculta datos, no recibe interacciones y se desactiva automáticamente cuando el sistema solicita movimiento reducido.
