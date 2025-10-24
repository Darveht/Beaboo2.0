
// js/stories.js

document.addEventListener('DOMContentLoaded', () => {
    // Firebase Config - Solo para autenticación
    const firebaseConfig = {
        apiKey: "AIzaSyBWBr3sud1_lDPmtLJI42pCBZnco5_vyCc",
        authDomain: "noble-amp-458106-g0.firebaseapp.com",
        databaseURL: "https://noble-amp-458106-g0-default-rtdb.firebaseio.com",
        projectId: "noble-amp-458106-g0",
        storageBucket: "noble-amp-458106-g0.firebasestorage.app",
        messagingSenderId: "744574411059",
        appId: "1:744574411059:web:72a70955f1400df6645e46",
        measurementId: "G-XEQ1J354HM"
    };

    // Initialize Firebase (solo para autenticación)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();

    const storiesContainer = document.getElementById('stories');
    const storyViewer = document.getElementById('story-viewer');
    const storyUploadModal = document.getElementById('story-upload-modal');

    // Event Listeners
    document.getElementById('add-story-btn').addEventListener('click', () => {
        storyUploadModal.classList.add('active');
    });

    document.getElementById('story-upload-back').addEventListener('click', () => {
        storyUploadModal.classList.remove('active');
        resetUploadForm();
    });

    document.getElementById('story-file').addEventListener('change', handleFileSelect);

    document.getElementById('story-upload-form').addEventListener('submit', handleStoryUpload);
    document.getElementById('story-viewer-close').addEventListener('click', closeStoryViewer);

    // Load stories automatically on page load
    setTimeout(() => {
        loadStories();
    }, 500);
    
    // Reload stories every 30 seconds to show new stories from other users
    setInterval(() => {
        loadStories();
    }, 30000);

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.querySelector('.story-upload-preview');
                const previewImg = preview.querySelector('img');
                previewImg.src = event.target.result;
                preview.style.display = 'block';
                
                const fileLabel = document.querySelector('.file-input-label');
                fileLabel.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    function resetUploadForm() {
        document.getElementById('story-upload-form').reset();
        const preview = document.querySelector('.story-upload-preview');
        preview.style.display = 'none';
        const fileLabel = document.querySelector('.file-input-label');
        fileLabel.style.display = 'flex';
        
        const progressDiv = document.querySelector('.upload-progress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
            const progressBar = progressDiv.querySelector('.progress-bar');
            progressBar.style.width = '0%';
        }
    }

    async function loadStories() {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            // Intentar de nuevo en 1 segundo si el usuario no está autenticado aún
            setTimeout(loadStories, 1000);
            return;
        }

        try {
            // Obtener historias
            const response = await fetch('/.netlify/functions/get-stories', {
                method: 'GET',
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al cargar historias');
            }

            storiesContainer.innerHTML = '';

            if (result.stories && result.stories.length > 0) {
                // Filtrar historias recientes (últimas 12 horas)
                const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
                const recentStories = result.stories.filter(story => story.timestamp > twelveHoursAgo);

                // Eliminar historias viejas automáticamente
                const oldStories = result.stories.filter(story => story.timestamp <= twelveHoursAgo);
                oldStories.forEach(async (story) => {
                    try {
                        await fetch('/.netlify/functions/delete-story', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ storyId: story.id })
                        });
                        console.log(`Historia ${story.id} eliminada automáticamente (más de 12 horas)`);
                    } catch (error) {
                        console.error('Error eliminando historia antigua:', error);
                    }
                });

                // Agrupar por usuario
                const storiesByUser = {};
                recentStories.forEach(story => {
                    if (!storiesByUser[story.userId]) {
                        storiesByUser[story.userId] = [];
                    }
                    storiesByUser[story.userId].push(story);
                });

                // Crear elementos de historias en orden horizontal
                for (const userId in storiesByUser) {
                    const userStories = storiesByUser[userId];
                    if (userStories.length > 0) {
                        const latestStory = userStories[0];
                        const storyElement = createStoryElement(latestStory, userId);
                        if (storyElement) {
                            storiesContainer.appendChild(storyElement);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading stories:', error);
        }
    }

    function createStoryElement(storyData, userId) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'story';
        
        // Usar username, nunca email, y saltar si es anónimo
        let displayName = storyData.username || storyData.email?.split('@')[0] || '';
        
        // No mostrar historias anónimas
        if (!displayName || displayName.toLowerCase() === 'anónimo' || displayName.toLowerCase() === 'anonimo') {
            return null;
        }
        
        storyDiv.innerHTML = `
            <div class="image-container">
                <img src="${storyData.coverImage || 'https://via.placeholder.com/150'}" alt="${displayName}">
            </div>
            <div class="username">${displayName}</div>
        `;
        storyDiv.addEventListener('click', () => openStoryViewer(userId));
        return storyDiv;
    }

    function handleStoryUpload(e) {
        e.preventDefault();
        const file = document.getElementById('story-file').files[0];
        if (!file) {
            alert('Por favor selecciona una imagen');
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("Debes iniciar sesión para subir una historia.");
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subiendo...';

        const progressDiv = document.querySelector('.upload-progress');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const progressText = progressDiv.querySelector('.progress-text');
        progressDiv.style.display = 'block';

        const userId = currentUser.uid;
        const timestamp = Date.now();

        progressText.textContent = 'Procesando...';
        progressBar.style.width = '50%';
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const base64Image = e.target.result;
                
                progressText.textContent = 'Subiendo...';
                progressBar.style.width = '70%';
                
                // Subir historia
                const response = await fetch('/.netlify/functions/upload-story', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: 'Story',
                        category: 'story',
                        rating: 'all',
                        language: 'es',
                        synopsis: '',
                        userId: userId,
                        username: currentUser.displayName || currentUser.email,
                        email: currentUser.email,
                        coverImageData: base64Image,
                        coverImageFileName: file.name,
                        coverImageContentType: file.type
                    })
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Error al subir historia');
                }
                
                progressBar.style.width = '100%';
                progressText.textContent = '¡Historia subida!';
                
                setTimeout(() => {
                    storyUploadModal.classList.remove('active');
                    resetUploadForm();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Subir Historia';
                    loadStories();
                }, 500);
            } catch (error) {
                console.error("Error al subir historia:", error);
                alert('Error al subir la historia. Por favor intenta de nuevo. Error: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Subir Historia';
                progressDiv.style.display = 'none';
                progressBar.style.width = '0%';
            }
        };
        
        reader.onerror = (error) => {
            console.error("Error al leer imagen:", error);
            alert('Error al procesar la imagen');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Subir Historia';
            progressDiv.style.display = 'none';
            progressBar.style.width = '0%';
        };
        
        reader.readAsDataURL(file);
    }

    async function openStoryViewer(userId) {
        try {
            // Obtener historias del usuario desde AWS S3
            const response = await fetch(`/.netlify/functions/get-stories?userId=${userId}`, {
                method: 'GET',
            });

            const result = await response.json();
            
            if (!response.ok || !result.stories || result.stories.length === 0) {
                return;
            }

            // Filtrar solo historias de las últimas 12 horas
            const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
            const stories = result.stories.filter(story => story.timestamp > twelveHoursAgo);
            
            if (stories.length === 0) {
                return;
            }
            const storyContent = document.querySelector('.story-content');
            storyContent.innerHTML = '';

            stories.sort((a, b) => a.timestamp - b.timestamp);
            
            let currentStoryIndex = 0;
            const currentUser = auth.currentUser;

            function showStory(index) {
                const story = stories[index];

                // Incrementar vistas
                if (currentUser && currentUser.uid !== userId) {
                    fetch('/.netlify/functions/update-story', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            storyId: story.id,
                            updates: {
                                views: (story.views || 0) + 1
                            }
                        })
                    }).catch(err => console.error('Error updating views:', err));
                }

                // Usar username, nunca email
                const displayName = story.username || story.email?.split('@')[0] || 'Usuario';
                
                storyContent.innerHTML = `
                    <div class="story-header">
                        <div class="story-progress-container">
                            ${stories.map((_, i) => `<div class="story-progress"><div class="story-progress-bar" style="width: ${i < index ? '100%' : (i === index ? '0%' : '0%')}"></div></div>`).join('')}
                        </div>
                        <div class="story-user-info">
                            <span class="username">${displayName}</span>
                        </div>
                    </div>
                    <div class="story-top-controls">
                        <button class="story-close">×</button>
                        ${currentUser && currentUser.uid === userId ? `
                            <div class="story-options" data-story-id="${story.id}">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <circle cx="12" cy="5" r="2"/>
                                    <circle cx="12" cy="12" r="2"/>
                                    <circle cx="12" cy="19" r="2"/>
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    <img src="${story.coverImage}" class="story-image">
                    <div class="story-footer">
                        <div class="story-views">${story.views || 0} vistas</div>
                    </div>
                `;

                const progressBar = storyContent.querySelectorAll('.story-progress-bar')[index];
                setTimeout(() => {
                    progressBar.style.width = '100%';
                }, 100);

                // Event listener para el botón de cerrar
                const closeButton = storyContent.querySelector('.story-close');
                if (closeButton) {
                    closeButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        closeStoryViewer();
                    });
                }

                // Agregar event listener para opciones
                const optionsButton = storyContent.querySelector('.story-options');
                if (optionsButton) {
                    optionsButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const storyIdToDelete = e.currentTarget.dataset.storyId;
                        
                        // Crear menú de opciones desde abajo
                        const existingMenu = document.querySelector('.story-options-menu');
                        if (existingMenu) {
                            existingMenu.classList.remove('active');
                            setTimeout(() => existingMenu.remove(), 300);
                        }
                        
                        const menu = document.createElement('div');
                        menu.className = 'story-options-menu';
                        menu.innerHTML = `
                            <button class="delete-option">
                                <i class="fas fa-trash-alt"></i>
                                <span>Eliminar historia</span>
                            </button>
                        `;
                        
                        document.body.appendChild(menu);
                        setTimeout(() => menu.classList.add('active'), 10);
                        
                        // Event listener para eliminar
                        menu.querySelector('.delete-option').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            menu.classList.remove('active');
                            setTimeout(() => menu.remove(), 300);
                            
                            // Mostrar animación de carga
                            const loadingDiv = document.createElement('div');
                            loadingDiv.className = 'delete-loading';
                            loadingDiv.innerHTML = '<div class="spinner"></div>';
                            document.body.appendChild(loadingDiv);
                            
                            await deleteStory(storyIdToDelete);
                            
                            loadingDiv.remove();
                        });
                        
                        // Cerrar menú al hacer click fuera
                        setTimeout(() => {
                            const closeMenuOnClick = (e) => {
                                if (!menu.contains(e.target) && !e.target.closest('.story-options')) {
                                    menu.classList.remove('active');
                                    setTimeout(() => menu.remove(), 300);
                                    document.removeEventListener('click', closeMenuOnClick);
                                }
                            };
                            document.addEventListener('click', closeMenuOnClick);
                        }, 100);
                    });
                }

                setTimeout(() => {
                    if (currentStoryIndex < stories.length - 1) {
                        currentStoryIndex++;
                        showStory(currentStoryIndex);
                    } else {
                        closeStoryViewer();
                    }
                }, 5000); // 5 segundos por historia
            }

            showStory(currentStoryIndex);
            storyViewer.classList.add('active');
        } catch (error) {
            console.error('Error opening story viewer:', error);
        }
    }

    async function deleteStory(storyId) {
        try {
            const response = await fetch('/.netlify/functions/delete-story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ storyId })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al eliminar historia');
            }
            
            closeStoryViewer();
            loadStories();
        } catch (error) {
            console.error("Error deleting story:", error);
            alert('Error al eliminar la historia');
        }
    }

    function closeStoryViewer() {
        storyViewer.classList.remove('active');
    }
});
