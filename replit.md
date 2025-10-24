# BeaBoo - Social Media Application

## Descripción General
BeaBoo es una aplicación de redes sociales estilo Instagram/TikTok que permite a los usuarios compartir historias (stories), seguir a otros usuarios, y crear contenido. La aplicación está construida con HTML, CSS, JavaScript vanilla y utiliza Firebase como backend.

## Arquitectura del Proyecto

### Frontend
- **HTML/CSS/JavaScript** - Interfaz de usuario responsiva
- **Tailwind CSS** - Framework CSS via CDN
- **Font Awesome** - Iconos
- **Firebase SDK** - Autenticación, Base de datos en tiempo real, y Storage

### Backend
- **Firebase Authentication** - Gestión de usuarios
- **Firebase Realtime Database** - Almacenamiento de datos en tiempo real
- **Firebase Storage** - Almacenamiento de imágenes y archivos multimedia

### Servidor
- **Python HTTP Server** - Servidor web simple para desarrollo en puerto 5000

## Estructura de Archivos
```
.
├── index.html          # Página principal de la aplicación
├── stories.js          # Lógica de manejo de historias
├── stories.css         # Estilos para el componente de historias
├── report.html         # Página de reportes
├── server.py           # Servidor web Python
└── replit.md          # Este archivo
```

## Características Principales

### Historias (Stories)
- **Modal de pantalla completa** - Interfaz estilo Instagram para subir historias
- **Vista previa de imágenes** - Los usuarios pueden ver una preview antes de subir
- **Barra de progreso** - Indicador visual del progreso de subida
- **Almacenamiento en Firebase** - Las imágenes se guardan en Firebase Storage
- **Visualización temporal** - Las historias se muestran durante 24 horas

### Sistema de Autenticación
- Login y registro de usuarios
- Gestión de perfiles
- Sistema de seguidores/seguidos

### Características Adicionales
- Sistema de transmisiones en vivo
- Regalos virtuales
- Marcos animados para fotos de perfil
- Sistema de notificaciones
- Sistema de reportes

## Cambios Recientes (24 Oct 2025)

### Mejoras al Modal de Historias
1. **Modal de pantalla completa** - El modal ahora ocupa toda la pantalla como Instagram
2. **Header mejorado** - Agregado botón de retroceso y título centrado
3. **Vista previa mejorada** - La imagen de preview ahora se adapta mejor a la pantalla
4. **Proceso de subida robusto** - Mejorado el manejo de errores y feedback al usuario
5. **Feedback visual mejorado** - Estados de "Subiendo", "Procesando" y "¡Historia subida!"

### Correcciones Técnicas
- Mejor manejo de errores en el proceso de upload
- Prevención de cierre prematuro del modal
- Mensajes de error más descriptivos
- Código más mantenible con promesas encadenadas

## Configuración de Firebase
El proyecto utiliza Firebase con las siguientes configuraciones:
- **stories.js**: Configuración para el módulo de historias
- **report.html**: Configuración para el sistema de reportes

## Desarrollo Local
El servidor se ejecuta en el puerto 5000 y sirve archivos estáticos con cache deshabilitado para facilitar el desarrollo.

**Comando:** `python3 server.py`

## Notas de Seguridad
- El código incluye protecciones anti-debugging (en producción debería eliminarse para desarrollo)
- Las claves de Firebase están expuestas en el código (normal para apps web de Firebase)
- Sistema de bloqueo de usuarios implementado
