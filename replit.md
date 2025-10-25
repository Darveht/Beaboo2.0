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

## Cambios Recientes (25 Oct 2025)

### Modo Claro Permanente
1. **Eliminada funcionalidad de modo oscuro/claro** - La aplicación ahora permanece en modo claro todo el tiempo
2. **Función setLightTheme()** - Reemplaza la antigua setThemeBasedOnTime() que cambiaba según la hora
3. **Fondos actualizados** - Todos los fondos oscuros convertidos a colores claros (#ffffff, #f9fafb)
4. **Eliminadas clases dark:** - Todas las clases de Tailwind dark: fueron removidas del HTML
5. **Colores de texto ajustados** - Texto oscuro (#374151, #262626) para legibilidad en fondos claros

### Correcciones de Notificaciones para iPhone
1. **requestFullscreen() eliminado** - Causaba bloqueo en iOS Safari, ahora removido
2. **Eventos touch agregados** - addEventListener('touchend') para compatibilidad con iOS
3. **Mejor manejo de permisos** - Solicitud de permisos de notificación mejorada con error handling
4. **Timeout reducido** - De 300ms a 100ms para respuesta más rápida

### Elementos Convertidos a Modo Claro
- Modal de lectura de capítulos (#chapter-read-modal)
- Gift drawer (#gift-drawer)
- Live container (.live-container)
- Story blocked modal (#story-blocked-modal)
- Side buttons (.side-button) - texto oscuro para legibilidad
- Barra de navegación inferior

## Cambios Recientes (24 Oct 2025)

### Sistema de Recomendaciones Mejorado
1. **Algoritmo basado en calificaciones del usuario** - El sistema ahora analiza las calificaciones que el usuario da a los capítulos
2. **Recomendaciones personalizadas por categoría** - Se consideran las categorías que el usuario ha calificado mejor
3. **Sistema de puntuación inteligente** - Combina vistas, calificaciones del usuario y calificaciones generales
4. **Migración completa a AWS S3** - Todas las historias se cargan ahora desde AWS S3 en lugar de Firebase Realtime Database

### Nuevas Secciones de Contenido
1. **Trending Stories (Historias en Tendencia)** - Muestra historias publicadas en los últimos 7 días con más vistas y mejor calificación
2. **Popular in Mystery (Popular en Misterio)** - Sección dedicada a las historias de misterio más vistas
3. **Best in Adventure (Mejores en Aventura)** - Muestra las historias de aventura mejor calificadas

### Autores Recomendados Rediseñados
1. **Formato circular** - Los avatares de autores ahora son circulares en lugar de cuadrados
2. **Tamaño optimizado** - Avatares más pequeños (80x80px) para mejor visualización
3. **Botón de seguir integrado** - Botón "+" en la esquina inferior derecha para seguir al autor en tiempo real
4. **Indicador de seguimiento** - El botón desaparece automáticamente si ya sigues al autor

### Mejoras al Modal de Historias
1. **Modal de pantalla completa** - El modal ahora ocupa toda la pantalla como Instagram
2. **Header mejorado** - Agregado botón de retroceso y título centrado
3. **Vista previa mejorada** - La imagen de preview ahora se adapta mejor a la pantalla
4. **Proceso de subida robusto** - Mejorado el manejo de errores y feedback al usuario
5. **Feedback visual mejorado** - Estados de "Subiendo", "Procesando" y "¡Historia subida!"

### Correcciones Técnicas
- Migración completa de Firebase Realtime Database a AWS S3 para historias
- Eliminación de código duplicado en funciones de carga
- Función centralizad `initializeFeedSections()` para cargar todas las secciones
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
