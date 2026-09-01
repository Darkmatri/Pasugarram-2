// Pasugaaram — Modern Luxury E-Commerce Frontend Script

// Global state
let cart = JSON.parse(localStorage.getItem('pasugaaram_cart'));
if (!cart || cart.length === 0) {
    // Initial sample basket matching the design preview
    cart = [
        { id: 'm_a2', name: 'A2 Organic Cow Milk', price: 85, unit: '1L', image: './images/cat_dairy.jpg', qty: 1 },
        { id: 'v_spinach', name: 'Fresh English Spinach', price: 45, unit: '200g', image: './vegge/salad-leaf.png', qty: 1 },
        { id: 'f_eggs', name: 'Farm-Fresh Organic Eggs', price: 110, unit: '6 Pack', image: './images/cat_fruits_eggs.jpg', qty: 1 }
    ];
    localStorage.setItem('pasugaaram_cart', JSON.stringify(cart));
}

let activeFilter = 'all';
let currentSlideIndex = 0;
let slideInterval = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    initSearch();
    initFilters();
    initCategories();
    initCartDrawer();
    initLocationModal();
    initMobileNav();
    updateCartUI();
});

/* ==========================================================================
   Hero Carousel Logic
   ========================================================================== */
function initCarousel() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!slides.length) return;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentSlideIndex = index;
    }

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            clearInterval(slideInterval);
            showSlide(i);
            startAutoSlide();
        });
    });

    function startAutoSlide() {
        slideInterval = setInterval(() => {
            let nextIndex = (currentSlideIndex + 1) % slides.length;
            showSlide(nextIndex);
        }, 5000);
    }

    startAutoSlide();
}

/* ==========================================================================
   Filter & Category Switching Logic
   ========================================================================== */
function initFilters() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.getAttribute('data-filter');
            applyProductFilter(filter);
        });
    });
}

function initCategories() {
    // Category tabs and cards work cleanly as direct links
}

function filterByCategory(category) {
    applyProductFilter(category);
    const tab = document.querySelector(`.filter-tab[data-filter="${category}"]`);
    if (tab) {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    }
}

function applyProductFilter(category) {
    activeFilter = category;
    const cards = document.querySelectorAll('.product-item-card');
    const badge = document.getElementById('activeFilterBadge');
    
    let visibleCount = 0;
    cards.forEach(card => {
        const itemCat = card.getAttribute('data-category');
        if (category === 'all' || itemCat === category) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    if (badge) {
        if (category === 'all') {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'inline-block';
            badge.textContent = `Showing: ${category.charAt(0).toUpperCase() + category.slice(1)} (${visibleCount})`;
        }
    }
}

/* ==========================================================================
   Live Search Logic
   ========================================================================== */
function initSearch() {
    const input = document.getElementById('globalSearchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }
        filterProductsByQuery(query);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            filterProductsByQuery('');
            input.focus();
        });
    }
}

function filterProductsByQuery(query) {
    const cards = document.querySelectorAll('.product-item-card');
    cards.forEach(card => {
        const title = card.querySelector('.product-title')?.textContent.toLowerCase() || '';
        const cat = card.getAttribute('data-category') || '';
        if (!query || title.includes(query) || cat.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

/* ==========================================================================
   Shopping Cart & Drawer Logic
   ========================================================================== */
function addToCartItem(id, name, price, unit, image) {
    const existingIndex = cart.findIndex(item => item.id === id);
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({ id, name, price, unit, image, qty: 1 });
    }
    saveCart();
    updateCartUI();
    showToast(`Added "${name}" to basket!`, 'success');
}

function updateCartQty(id, change) {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        cart[itemIndex].qty += change;
        if (cart[itemIndex].qty <= 0) {
            cart.splice(itemIndex, 1);
        }
    }
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('pasugaaram_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    // Update Header and Mobile Badges
    const headerBadge = document.getElementById('cartCountBadge');
    if (headerBadge) headerBadge.textContent = totalCount;

    const mobileBadge = document.getElementById('mobileCartBadge');
    if (mobileBadge) mobileBadge.textContent = totalCount;

    const drawerCount = document.getElementById('drawerItemCount');
    if (drawerCount) drawerCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;

    const drawerSubtotal = document.getElementById('drawerSubtotal');
    if (drawerSubtotal) drawerSubtotal.textContent = `₹${subtotal}`;

    renderDrawerItems();
}

function renderDrawerItems() {
    const container = document.getElementById('cartDrawerItems');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
                <i class="fa-solid fa-basket-shopping" style="font-size: 38px; color: var(--gold-primary); margin-bottom: 12px; opacity: 0.7;"></i>
                <h4 style="color: var(--text-white); margin-bottom: 4px;">Your Basket is Empty</h4>
                <p style="font-size: 13px;">Add fresh organic harvest to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="drawer-item-card">
            <img src="${item.image}" alt="${item.name}" class="drawer-item-img" onerror="this.src='./images/cat_veg.jpg'">
            <div class="drawer-item-details">
                <h5 class="drawer-item-title">${item.name}</h5>
                <span class="drawer-item-price">₹${item.price} <small style="color: var(--text-muted); font-size: 11px;">(${item.unit || '1 unit'})</small></span>
            </div>
            <div class="drawer-qty-controls">
                <button class="drawer-qty-btn" onclick="updateCartQty('${item.id}', -1)" aria-label="Decrease quantity">
                    <i class="fa-solid fa-minus"></i>
                </button>
                <span class="drawer-qty-val">${item.qty}</span>
                <button class="drawer-qty-btn" onclick="updateCartQty('${item.id}', 1)" aria-label="Increase quantity">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function initCartDrawer() {
    const openBtn = document.getElementById('headerCartBtn');
    const mobileTrigger = document.getElementById('mobileCartTrigger');
    const closeBtn = document.getElementById('cartDrawerClose');
    const overlay = document.getElementById('cartDrawerOverlay');
    const drawer = document.getElementById('cartDrawer');

    function openDrawer() {
        drawer?.classList.add('active');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer?.classList.remove('active');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    openBtn?.addEventListener('click', openDrawer);
    mobileTrigger?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);
}

/* ==========================================================================
   Location Picker Modal
   ========================================================================== */
function initLocationModal() {
    const badge = document.getElementById('locationSelector');
    const modal = document.getElementById('locationModal');
    const closeBtn = document.getElementById('closeLocationModal');
    const locText = document.getElementById('currentLocationText');
    const locOptions = document.querySelectorAll('.loc-opt-btn');

    if (!badge || !modal) return;

    badge.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    locOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const loc = opt.getAttribute('data-loc');
            locOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            if (locText) locText.textContent = loc;
            modal.classList.remove('active');
            showToast(`Delivery location set to ${loc}`, 'success');
        });
    });
}

/* ==========================================================================
   Mobile Sidebar Navigation
   ========================================================================== */
function initMobileNav() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    function openSidebar() {
        sidebar?.classList.add('open');
        backdrop?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar?.classList.remove('open');
        backdrop?.classList.remove('open');
        document.body.style.overflow = '';
    }

    toggleBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    backdrop?.addEventListener('click', closeSidebar);

    // Close when clicking sidebar links on mobile
    const links = document.querySelectorAll('.sidebar-nav .nav-link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                closeSidebar();
            }
        });
    });
}

/* ==========================================================================
   Toast System
   ========================================================================== */
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'app-toast';
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `
        <i class="fa-solid ${icon}" style="color: var(--gold-primary); font-size: 16px;"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}