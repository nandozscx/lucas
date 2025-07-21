# acopiapp

Esta es una aplicación Next.js para la gestión de acopio y producción.

## Arquitectura y Resiliencia

Esta aplicación está diseñada para ser robusta y funcionar incluso si el servicio de hosting (como Vercel) experimenta problemas.

### 1. Funcionalidad Offline (PWA)

La aplicación es una **Progressive Web App (PWA)**. Esto significa que una vez que la cargas en tu navegador, todos los archivos necesarios se guardan en tu dispositivo.

*   **Ventaja Principal**: Si el servidor de Vercel se cae, la versión que tienes "instalada" en tu teléfono o computadora seguirá funcionando sin problemas.
*   **Datos Locales**: Toda tu información (proveedores, entregas, ventas, etc.) se almacena en el `localStorage` de tu navegador, por lo que no dependes de una conexión a internet o de un servidor externo para acceder a ella.

### 2. Plan de Contingencia: Ejecución Local

Si necesitas acceder a la aplicación desde un dispositivo nuevo mientras Vercel está caído, puedes ejecutarla localmente. Como todo el código está en GitHub, solo tienes que:

1.  Clonar el repositorio en tu computadora.
2.  Instalar las dependencias con `npm install`.
3.  Iniciar el servidor de desarrollo con `npm run dev`.

Esto te dará acceso a una versión completamente funcional en tu máquina.

### 3. Flexibilidad de Hosting

El proyecto está construido con Next.js, lo que te da la libertad de cambiar de proveedor de hosting fácilmente si es necesario. Algunas alternativas a Vercel son:

*   Firebase App Hosting
*   Netlify
*   AWS Amplify
*   Google Cloud Run

Simplemente necesitarías conectar tu repositorio de GitHub al nuevo proveedor.
