document.addEventListener('DOMContentLoaded', () => {

    // --- Google Apps Script Configuration ---
    // IMPORTANT: Replace with your deployed Web App URL from Google Apps Script.
    const GAS_WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

    // --- General UI Elements ---
    const header = document.getElementById('main-header');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const menuContainer = document.querySelector('.menu-container');

    // --- Sticky Header ---
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll);

    // --- Hamburger Menu ---
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            hamburgerMenu.classList.toggle('active');
            menuContainer.classList.toggle('active');
        });
    }

    // --- Lazy Loading Images ---
    const lazyImages = document.querySelectorAll('img.lazy');
    const lazyLoad = (target) => {
        const io = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src; // Fallback to src
                    img.classList.remove('lazy');
                    observer.disconnect();
                }
            });
        });
        io.observe(target);
    };
    lazyImages.forEach(lazyLoad);

    // --- Popular Novel Slider ---
    const slider = document.getElementById('popular-slider');
    if (slider) {
        const wrapper = slider.querySelector('.slider-wrapper');
        const prevBtn = slider.querySelector('.slider-btn.prev');
        const nextBtn = slider.querySelector('.slider-btn.next');
        const cards = slider.querySelectorAll('.novel-card');
        if (cards.length > 0) {
            let currentIndex = 0;
            const cardWidth = cards[0].offsetWidth + 2 * 16; // width + margin
            const itemsToShow = Math.floor(slider.offsetWidth / cardWidth);
            const totalSlides = Math.ceil(cards.length / itemsToShow);

            const updateSlider = () => {
                wrapper.style.transform = `translateX(-${currentIndex * cardWidth * itemsToShow}px)`;
            };

            nextBtn.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % totalSlides;
                updateSlider();
            });

            prevBtn.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
                updateSlider();
            });
            
            // Auto-rotate
            setInterval(() => {
                nextBtn.click();
            }, 5000);

            // Touch/Swipe support
            let touchStartX = 0;
            let touchEndX = 0;
            wrapper.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            });
            wrapper.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchEndX < touchStartX) nextBtn.click();
                if (touchEndX > touchStartX) prevBtn.click();
            });
        }
    }


    // --- Novel Detail Page Logic ---
    const novelDetailPage = document.querySelector('body[data-novel-id]');
    if (novelDetailPage) {
        const novelId = novelDetailPage.dataset.novelId;

        // Elements
        const viewCountEl = document.getElementById('view-count');
        const likeCountEl = document.getElementById('like-count');
        const bookmarkCountEl = document.getElementById('bookmark-count');
        const currentRatingEl = document.getElementById('current-rating');
        const likeBtn = document.getElementById('like-btn');
        const bookmarkBtn = document.getElementById('bookmark-btn');
        const ratingStars = document.getElementById('rating-stars');
        const chapterGrid = document.getElementById('chapter-grid');
        const readerContainer = document.getElementById('chapter-reader-container');
        const readerContent = document.getElementById('reader-content');
        const readerPlaceholder = readerContainer.querySelector('.reader-placeholder');


        // --- GAS API Communication ---
        const callGas = async (action, method = 'GET', data = null) => {
             if (GAS_WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
                console.warn("Google Apps Script URL is not set. Please update it in script.js.");
                // Provide mock data for UI testing
                return { success: true, data: { views: 1234, likes: 56, bookmarks: 78, rating: 4.5 } };
            }
            try {
                const url = `${GAS_WEB_APP_URL}?action=${action}&novelId=${novelId}`;
                const options = {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                };
                if (method === 'POST' && data) {
                    options.body = JSON.stringify({ ...data, novelId, action });
                }
                const response = await fetch(method === 'GET' ? url : GAS_WEB_APP_URL, options);
                return await response.json();
            } catch (error) {
                console.error('Error communicating with GAS:', error);
                return { success: false, error: error.message };
            }
        };

        // --- Load Initial Data ---
        const loadNovelData = async () => {
            const result = await callGas('getData');
            if (result.success && result.data) {
                viewCountEl.textContent = result.data.views.toLocaleString();
                likeCountEl.textContent = result.data.likes.toLocaleString();
                bookmarkCountEl.textContent = result.data.bookmarks.toLocaleString();
                currentRatingEl.textContent = `(${result.data.rating.toFixed(1)})`;
            } else {
                 viewCountEl.textContent = 'N/A';
                 likeCountEl.textContent = 'N/A';
                 bookmarkCountEl.textContent = 'N/A';
                 currentRatingEl.textContent = 'N/A';
            }
        };

        // --- Increment View Count ---
        const incrementView = async () => {
            await callGas('incrementView', 'POST');
            // We reload all data to ensure consistency
            loadNovelData();
        };

        // --- Event Handlers for Actions ---
        likeBtn.addEventListener('click', async () => {
            likeBtn.classList.toggle('active');
            const action = likeBtn.classList.contains('active') ? 'like' : 'unlike';
            const result = await callGas(action, 'POST');
            if (result.success) loadNovelData();
        });

        bookmarkBtn.addEventListener('click', async () => {
            bookmarkBtn.classList.toggle('active');
            const action = bookmarkBtn.classList.contains('active') ? 'bookmark' : 'unbookmark';
            const result = await callGas(action, 'POST');
            if (result.success) loadNovelData();
        });
        
        ratingStars.addEventListener('click', async (e) => {
            if (e.target.classList.contains('star')) {
                const ratingValue = e.target.dataset.value;
                const result = await callGas('rate', 'POST', { rating: parseInt(ratingValue) });
                if (result.success) {
                    loadNovelData();
                    // Update star display instantly
                    updateStars(ratingValue);
                }
            }
        });
        
        const updateStars = (rating) => {
            const stars = ratingStars.querySelectorAll('.star');
            stars.forEach(star => {
                star.textContent = star.dataset.value <= rating ? '★' : '☆';
                star.classList.toggle('selected', star.dataset.value <= rating);
            });
        };

        // --- Chapter Reader Logic ---
        chapterGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('chapter-btn')) {
                // Remove active state from other buttons
                chapterGrid.querySelectorAll('.chapter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                const chapterType = e.target.dataset.chapterType;
                const chapterNum = e.target.dataset.chapter;
                loadChapterContent(chapterType, chapterNum);
            }
        });

        const loadChapterContent = (type, num) => {
            readerPlaceholder.classList.add('hidden');
            readerContent.classList.remove('hidden');
            readerContent.innerHTML = `<p class="loading">Loading Chapter ${num}...</p>`;

            // Simulate fetching content
            setTimeout(() => {
                let content = '';
                if (type === 'text') {
                    content = `
                        <h3>Chapter ${num}: The Story Begins</h3>
                        <p>This is the content for chapter ${num}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod malesuada.</p>
                        <p>Curabitur sit amet quam id tellus gravida vulputate. Proin eget tortor risus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Mauris placerat eleifend leo.</p>
                        <p>Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi.</p>
                    `;
                } else if (type === 'manga') {
                    content = `
                        <h3>Chapter ${num}: The Void (Manga)</h3>
                        <p>Displaying pages for the manga chapter.</p>
                        <img src="https://placehold.co/800x1200/1b0f3a/fde047?text=Page+1" alt="Manga Page 1" class="lazy">
                        <img src="https://placehold.co/800x1200/1b0f3a/fde047?text=Page+2" alt="Manga Page 2" class="lazy">
                        <img src="https://placehold.co/800x1200/1b0f3a/fde047?text=Page+3" alt="Manga Page 3" class="lazy">
                    `;
                }
                readerContent.innerHTML = content;
                // Make sure newly added images are also lazy-loaded
                readerContent.querySelectorAll('img.lazy').forEach(lazyLoad);
                 // Scroll to the reader
                readerContainer.scrollIntoView({ behavior: 'smooth' });
            }, 500); // 0.5s delay to simulate network request
        };


        // Initial load for the page
        incrementView();
    }
});
