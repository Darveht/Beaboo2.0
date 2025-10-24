// js/stories.js

document.addEventListener('DOMContentLoaded', () => {
    // Firebase Config - User needs to replace this with their own config
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

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const database = firebase.database();

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

    // Load stories
    loadStories();

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

    function loadStories() {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            // If user is not logged in, don't load any stories
            storiesContainer.innerHTML = '';
            return;
        }

        const userId = currentUser.uid;
        const followingRef = database.ref('following/' + userId);

        followingRef.on('value', (snapshot) => {
            storiesContainer.innerHTML = ''; // Clear existing stories
            const followingData = snapshot.val();
            if (followingData) {
                for (const followedUserId in followingData) {
                    database.ref('stories/' + followedUserId).limitToLast(1).on('value', (storySnapshot) => {
                        const storyData = storySnapshot.val();
                        if (storyData) {
                            const storyId = Object.keys(storyData)[0];
                            const latestStory = storyData[storyId];
                            
                            // Check if story is recent (e.g., within 24 hours)
                            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
                            if (latestStory.timestamp > twentyFourHoursAgo) {
                                database.ref('users/' + followedUserId).once('value').then((userSnapshot) => {
                                    const userData = userSnapshot.val();
                                    if (userData) {
                                        const storyElement = createStoryElement(userData, followedUserId);
                                        storiesContainer.appendChild(storyElement);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    }

    function createStoryElement(userData, userId) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'story';
        storyDiv.innerHTML = `
            <div class="image-container">
                <img src="${userData.profileImage || 'https://via.placeholder.com/150'}" alt="${userData.username}">
            </div>
            <div class="username">${userData.username}</div>
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
                
                progressText.textContent = 'Subiendo a AWS S3...';
                progressBar.style.width = '70%';
                
                const response = await fetch('/.netlify/functions/upload-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        imageData: base64Image,
                        fileName: file.name,
                        userId: userId,
                        timestamp: timestamp,
                        contentType: file.type
                    })
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Error al subir imagen');
                }
                
                progressBar.style.width = '90%';
                progressText.textContent = 'Guardando en base de datos...';
                
                const storyData = {
                    imageUrl: result.imageUrl,
                    timestamp: timestamp,
                    views: 0,
                    userId: userId
                };
                
                await database.ref(`stories/${userId}`).push(storyData);
                
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

    function openStoryViewer(userId) {
        database.ref(`stories/${userId}`).once('value').then((snapshot) => {
            const stories = snapshot.val();
            if (!stories) return;

            const storyContent = document.querySelector('.story-content');
            storyContent.innerHTML = ''; // Clear previous story

            const storiesArray = Object.entries(stories).map(([key, value]) => ({ key, ...value }));
            storiesArray.sort((a, b) => a.timestamp - b.timestamp);
            
            let currentStoryIndex = 0;

            function showStory(index) {
                const story = storiesArray[index];
                const storyKey = story.key;
                const currentUser = auth.currentUser;

                // Increment view count
                if (currentUser && currentUser.uid !== userId) {
                    const storyRef = database.ref(`stories/${userId}/${storyKey}/views`);
                    storyRef.transaction((currentViews) => (currentViews || 0) + 1);
                }

                database.ref('users/' + userId).once('value').then(userSnapshot => {
                    const userData = userSnapshot.val();
                    storyContent.innerHTML = `
                        <div class="story-header">
                            <div class="story-progress-container">
                                ${storiesArray.map((_, i) => `<div class="story-progress"><div class="story-progress-bar" style="width: ${i < index ? '100%' : (i === index ? '0%' : '0%')}"></div></div>`).join('')}
                            </div>
                            <div class="story-user-info">
                                <img src="${userData.profileImage || 'https://via.placeholder.com/150'}" alt="${userData.username}">
                                <span class="username">${userData.username}</span>
                            </div>
                            ${currentUser && currentUser.uid === userId ? `<div class="story-options" data-story-key="${storyKey}">&hellip;</div>` : ''}
                        </div>
                        <img src="${story.imageUrl}" class="story-image">
                        <div class="story-footer">
                            <div class="story-views">${story.views || 0} views</div>
                        </div>
                    `;

                    const progressBar = storyContent.querySelectorAll('.story-progress-bar')[index];
                    setTimeout(() => {
                        progressBar.style.width = '100%';
                    }, 100);

                    // Add event listener for delete option
                    const optionsButton = storyContent.querySelector('.story-options');
                    if (optionsButton) {
                        optionsButton.addEventListener('click', (e) => {
                            const storyKeyToDelete = e.target.dataset.storyKey;
                            if (confirm("Are you sure you want to delete this story?")) {
                                deleteStory(userId, storyKeyToDelete, story.imageUrl);
                            }
                        });
                    }

                    // Real-time view count
                    const storyRef = database.ref(`stories/${userId}/${storyKey}/views`);
                    storyRef.on('value', (viewSnapshot) => {
                        const viewCount = viewSnapshot.val() || 0;
                        const viewsElement = storyContent.querySelector('.story-views');
                        if (viewsElement) {
                            viewsElement.textContent = `${viewCount} views`;
                        }
                    });
                });

                setTimeout(() => {
                    if (currentStoryIndex < storiesArray.length - 1) {
                        currentStoryIndex++;
                        showStory(currentStoryIndex);
                    } else {
                        closeStoryViewer();
                    }
                }, 5000); // 5 seconds per story
            }

            showStory(currentStoryIndex);
            storyViewer.classList.add('active');
        });
    }

    async function deleteStory(userId, storyKey, imageUrl) {
        try {
            await database.ref(`stories/${userId}/${storyKey}`).remove();
            
            if (imageUrl && imageUrl.includes('amazonaws.com')) {
                await fetch('/.netlify/functions/delete-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ imageUrl })
                });
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
