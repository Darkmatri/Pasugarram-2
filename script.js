// Pasugaaram — Frontend Client-side script

// Preloader HTML injection & management
(() => {
    const injectPreloader = () => {
        if (document.getElementById('preloader')) return;
        const preloaderHTML = `
            <div id="preloader" class="preloader">
                <div class="preloader-inner">
                    <div class="loader-container">
                        <div class="loader-ring"></div>
                        <div class="loader-ring-inner"></div>
                        <div class="loader-logo">
                            <img src="./images/logonew.png" alt="Pasugaaram Logo" class="loader-img">
                        </div>
                    </div>
                    <h2 class="loader-text">Pasugaaram</h2>
                    <span class="loader-subtext">The Organic Evolution</span>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
        document.body.style.overflow = 'hidden';
    };

    // Run injection as early as possible
    if (document.body) {
        injectPreloader();
    } else {
        document.addEventListener('DOMContentLoaded', injectPreloader);
    }

    // Dismiss Preloader
    const removePreloader = () => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('fade-out');
            document.body.style.overflow = '';
            setTimeout(() => {
                if (preloader.parentNode) {
                    preloader.parentNode.removeChild(preloader);
                }
            }, 600);
        }
    };

    // Remove preloader when page assets are fully loaded
    window.addEventListener('load', removePreloader);

    // Fallback: remove preloader after 2.5 seconds to prevent infinite load screens
    setTimeout(removePreloader, 2500);
})();

const API_BASE = 'http://localhost:3000/api';

// Cart management
let cart = JSON.parse(localStorage.getItem('pasugaaram_cart')) || [];
let activeCoupon = JSON.parse(localStorage.getItem('pasugaaram_coupon')) || null;

// User session management
let userToken = localStorage.getItem('pasugaaram_token') || null;
let userData = JSON.parse(localStorage.getItem('pasugaaram_user')) || null;

// Initialize components on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderNav();
    updateCartBadge();
    initializeSlideshow();
    initializeFAQAccordions();
    
    // Check if on category page
    const categoryBody = document.querySelector('[data-category]');
    if (categoryBody) {
        const category = categoryBody.getAttribute('data-category');
        loadCategoryProducts(category);
    }

    // Check if on cart page
    if (document.getElementById('cart-table-body')) {
        renderCartPage();
    }

    // Check if on checkout page
    if (document.getElementById('checkout-items-summary')) {
        renderCheckoutSummary();
        setupCheckoutForm();
    }

    // Check if on profile page
    if (document.getElementById('profile-content-section')) {
        renderProfilePage();
    }

    // Page Specific Animations
    setupScrollAnimations();
    createLeafParticles();
    initializeStatsCounters();
});

// Update Header Nav based on Auth Status
function updateHeaderNav() {
    const navUl = document.querySelector('nav ul');
    if (!navUl) return;

    // Check if Auth list items already exist
    const authItems = document.querySelectorAll('.auth-nav-item');
    authItems.forEach(el => el.remove());

    const cartHtml = `
        <li class="auth-nav-item cart-nav-wrapper">
            <a href="cart.html" id="link">
                <i class="fas fa-shopping-cart"></i>
                <span class="nav-item">Cart</span>
                <span class="cart-badge">0</span>
            </a>
        </li>
    `;

    let loginOrProfileHtml = '';
    if (userToken && userData) {
        loginOrProfileHtml = `
            <li class="auth-nav-item">
                <a href="profile.html" id="link" class="user-menu">
                    <i class="fas fa-user-circle"></i>
                    <span class="nav-item">${userData.name.split(' ')[0]}</span>
                </a>
            </li>
            <li class="auth-nav-item">
                <a href="#" id="logout-btn" onclick="logoutUser(event)">
                    <i class="fas fa-sign-out-alt"></i>
                    <span class="nav-item">Logout</span>
                </a>
            </li>
        `;
    } else {
        loginOrProfileHtml = `
            <li class="auth-nav-item">
                <a href="login.html" id="link">
                    <i class="fas fa-sign-in"></i>
                    <span class="nav-item">Log-in</span>
                </a>
            </li>
        `;
    }

    // Insert before footer or just append
    navUl.insertAdjacentHTML('beforeend', cartHtml);
    navUl.insertAdjacentHTML('beforeend', loginOrProfileHtml);
    updateCartBadge();
}

// Logout
function logoutUser(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('pasugaaram_token');
    localStorage.removeItem('pasugaaram_user');
    userToken = null;
    userData = null;
    showToast('Logged out successfully!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Update Cart Badge counter
function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    badges.forEach(badge => {
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? 'flex' : 'none';
    });
}

// Show animated Toast messages
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade out after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add Item to local storage cart
function addToCart(id, name, price, image) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id, name, price, image, qty: 1 });
    }
    localStorage.setItem('pasugaaram_cart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`Added ${name} to your Cart!`, 'success');
}

// Dynamic Loading of Category products
async function loadCategoryProducts(category) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i><p>Harvesting fresh items...</p></div>';

    try {
        const res = await fetch(`${API_BASE}/products/${category}`);
        const data = await res.json();

        if (!data.success || !data.products.length) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No organic products in this category at the moment.</p>';
            return;
        }

        // Store active products list for filter/search
        window.categoryProducts = data.products;
        renderProductsList(data.products);
        setupProductFilters();
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">Failed to load fresh products. Please run the Node.js server.</p>';
    }
}

// Render products list into grid
function renderProductsList(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';
    products.forEach(p => {
        const ratingStars = generateRatingStars(p.rating);
        const html = `
            <div class="product-card">
                ${p.stock < 10 ? `<span class="product-badge">Only ${p.stock} Left</span>` : ''}
                <div class="product-image-container">
                    <img src="${p.image}" alt="${p.name}" onerror="this.src='./images/logonew.png'">
                </div>
                <div class="product-details">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-description">${p.description}</p>
                    <div class="product-rating">
                        ${ratingStars}
                        <span>(${p.rating})</span>
                    </div>
                    <div class="product-footer">
                        <div class="product-price">Rs.${p.price} <span>/ ${p.unit}</span></div>
                        <button class="btn-add-cart" onclick="addToCart('${p.id}', '${p.name}', ${p.price}, '${p.image}')" title="Add to Cart">
                            <i class="fas fa-shopping-basket"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', html);
    });
}

// Generate stars markup
function generateRatingStars(rating) {
    let stars = '';
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= full) {
            stars += '<i class="fa-solid fa-star"></i>';
        } else if (i === full + 1 && half) {
            stars += '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            stars += '<i class="fa-regular fa-star"></i>';
        }
    }
    return stars;
}

// Setup Filters & Search
function setupProductFilters() {
    const search = document.getElementById('product-search');
    const sort = document.getElementById('product-sort');

    const filterProducts = () => {
        if (!window.categoryProducts) return;
        let list = [...window.categoryProducts];

        // Search
        if (search && search.value) {
            const query = search.value.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
        }

        // Sort
        if (sort && sort.value) {
            if (sort.value === 'price-low') {
                list.sort((a, b) => a.price - b.price);
            } else if (sort.value === 'price-high') {
                list.sort((a, b) => b.price - a.price);
            } else if (sort.value === 'rating') {
                list.sort((a, b) => b.rating - a.rating);
            }
        }
        renderProductsList(list);
    };

    if (search) search.addEventListener('input', filterProducts);
    if (sort) sort.addEventListener('change', filterProducts);
}

// Render dynamic cart.html page content
function renderCartPage() {
    const tbody = document.getElementById('cart-table-body');
    const container = document.querySelector('.cart-page-container');
    if (!tbody) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-shopping-basket" style="font-size: 5rem; color: var(--primary-light); margin-bottom: 20px; opacity: 0.5;"></i>
                <h2 style="margin-bottom: 10px;">Your Cart is Empty</h2>
                <p style="color: var(--text-muted); margin-bottom: 30px;">Add fresh organic items to your cart to checkout.</p>
                <a href="fruits.html" class="btn-primary">Shop Organic Produce</a>
            </div>
        `;
        return;
    }

    tbody.innerHTML = '';
    cart.forEach(item => {
        const subtotal = item.price * item.qty;
        const html = `
            <tr data-id="${item.id}">
                <td>
                    <div class="cart-item-info">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='./images/logonew.png'">
                        <div>
                            <p class="cart-item-name">${item.name}</p>
                            <small class="cart-item-price">Rs.${item.price}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="changeQty('${item.id}', -1)">-</button>
                        <input type="text" class="quantity-input" value="${item.qty}" readonly>
                        <button class="quantity-btn" onclick="changeQty('${item.id}', 1)">+</button>
                    </div>
                </td>
                <td style="font-weight: 700;">Rs.${subtotal}</td>
                <td style="text-align: right;">
                    <a href="#" class="btn-remove" onclick="removeCartItem(event, '${item.id}')">
                        <i class="fas fa-trash-alt"></i> Remove
                    </a>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', html);
    });

    updateCartTotals();
}

// Modify qty from cart buttons
window.changeQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== id);
    }
    localStorage.setItem('pasugaaram_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartPage();
};

window.removeCartItem = (e, id) => {
    if (e) e.preventDefault();
    cart = cart.filter(i => i.id !== id);
    localStorage.setItem('pasugaaram_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartPage();
};

// Calculate and show Cart Totals on Cart screen
function updateCartTotals() {
    const sub = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxVal = Math.round(sub * 0.05); // 5% VAT
    let discountVal = 0;

    if (activeCoupon) {
        discountVal = Math.round(sub * (activeCoupon.discount / 100));
    }

    const totalVal = sub + taxVal - discountVal;

    document.getElementById('subtotal-price').textContent = `Rs.${sub}`;
    document.getElementById('tax-price').textContent = `Rs.${taxVal}`;
    
    const discEl = document.getElementById('discount-price');
    if (discEl) {
        discEl.textContent = `Rs.${discountVal}`;
    }

    document.getElementById('total-price').textContent = `Rs.${totalVal}`;

    // Coupon fields persistence
    const input = document.getElementById('coupon-input');
    const feedback = document.getElementById('coupon-feedback');
    if (input && activeCoupon) {
        input.value = activeCoupon.code;
        if (feedback) {
            feedback.className = 'coupon-feedback success';
            feedback.textContent = `Applied coupon: ${activeCoupon.code} (${activeCoupon.discount}% Off)`;
            feedback.style.display = 'block';
        }
    }
}

// Apply Coupon validation API
window.applyCouponCode = async () => {
    const input = document.getElementById('coupon-input');
    const feedback = document.getElementById('coupon-feedback');
    if (!input || !feedback) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
        feedback.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/coupon/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();

        if (data.success) {
            activeCoupon = { code: data.code, discount: data.discount };
            localStorage.setItem('pasugaaram_coupon', JSON.stringify(activeCoupon));
            feedback.className = 'coupon-feedback success';
            feedback.textContent = `Coupon applied successfully! ${data.description}`;
            feedback.style.display = 'block';
            updateCartTotals();
            showToast('Promo discount applied!', 'success');
        } else {
            feedback.className = 'coupon-feedback error';
            feedback.textContent = 'Invalid or expired coupon code.';
            feedback.style.display = 'block';
        }
    } catch {
        feedback.className = 'coupon-feedback error';
        feedback.textContent = 'Connection error validation coupon.';
        feedback.style.display = 'block';
    }
};

// Checkout Page Summary
function renderCheckoutSummary() {
    const container = document.getElementById('checkout-items-summary');
    if (!container) return;

    container.innerHTML = '';
    let sub = 0;
    cart.forEach(item => {
        sub += item.price * item.qty;
        const html = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>${item.name} (x${item.qty})</span>
                <span>Rs.${item.price * item.qty}</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    const taxVal = Math.round(sub * 0.05);
    let discountVal = 0;
    if (activeCoupon) {
        discountVal = Math.round(sub * (activeCoupon.discount / 100));
    }
    const totalVal = sub + taxVal - discountVal;

    document.getElementById('check-subtotal').textContent = `Rs.${sub}`;
    document.getElementById('check-tax').textContent = `Rs.${taxVal}`;
    document.getElementById('check-discount').textContent = `Rs.${discountVal}`;
    document.getElementById('check-total').textContent = `Rs.${totalVal}`;
}

// Setup checkout form submit action
function setupCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!userToken) {
            showToast('Please login to place your order!', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }

        const address = document.getElementById('shipping-address').value;
        const payment = document.getElementById('payment-method').value;

        try {
            const res = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    items: cart,
                    address,
                    paymentMethod: payment,
                    coupon: activeCoupon ? activeCoupon.code : null
                })
            });
            const data = await res.json();

            if (data.success) {
                // Clear cart
                cart = [];
                activeCoupon = null;
                localStorage.removeItem('pasugaaram_cart');
                localStorage.removeItem('pasugaaram_coupon');
                updateCartBadge();
                
                showToast('Order placed successfully!', 'success');
                
                // Show order success visual block
                const grid = document.querySelector('.checkout-grid');
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid #e2e8f0;">
                        <i class="fas fa-check-circle" style="font-size: 5rem; color: var(--primary-light); margin-bottom: 20px;"></i>
                        <h2>Order Confirmed!</h2>
                        <p style="color: var(--text-muted); margin-bottom: 15px;">Your order has been registered under ID: <strong>${data.order.id}</strong></p>
                        <p style="color: var(--text-muted); margin-bottom: 30px;">Estimated delivery date: ${new Date(data.order.estimatedDelivery).toLocaleDateString()}</p>
                        <a href="profile.html" class="btn-primary">View Order History</a>
                    </div>
                `;
            } else {
                showToast(data.error || 'Failed to place order', 'error');
            }
        } catch {
            showToast('Checkout connection failure.', 'error');
        }
    });
}

// Render dynamic user Profile & past orders
async function renderProfilePage() {
    const parent = document.getElementById('profile-content-section');
    if (!parent) return;

    if (!userToken) {
        parent.innerHTML = '<p>Please log in to access your profile.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/orders/my`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const data = await res.json();

        if (data.success) {
            const list = document.getElementById('order-history-list');
            if (!list) return;

            if (!data.orders || data.orders.length === 0) {
                list.innerHTML = '<p style="color: var(--text-muted);">You have not placed any orders yet.</p>';
                return;
            }

            list.innerHTML = '';
            data.orders.forEach(o => {
                let itemsHtml = '';
                o.items.forEach(item => {
                    itemsHtml += `
                        <div class="order-item-row">
                            <span>${item.name} (x${item.qty})</span>
                            <span>Rs.${item.price * item.qty}</span>
                        </div>
                    `;
                });

                const cardHtml = `
                    <div class="order-history-card">
                        <div class="order-header">
                            <div>Order ID: <strong>#${o.id.substring(0, 8)}</strong></div>
                            <div>Date: <strong>${new Date(o.placedAt).toLocaleDateString()}</strong></div>
                            <div>Status: <span style="color: var(--primary); font-weight: 700; text-transform: uppercase;">${o.status}</span></div>
                        </div>
                        <div class="order-body">
                            ${itemsHtml}
                            <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; font-weight: 700;">
                                <span>Total Paid:</span>
                                <span>Rs.${o.total}</span>
                            </div>
                        </div>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', cardHtml);
            });
        }
    } catch {
        showToast('Failed to load your orders history.', 'error');
    }
}

// Slideshow implementation
function initializeSlideshow() {
    let slideIndex = 1;
    const slides = document.getElementsByClassName("mySlides");
    const dots = document.getElementsByClassName("dot");
    if (!slides.length) return;

    const showSlides = (n) => {
        if (n > slides.length) { slideIndex = 1; }
        if (n < 1) { slideIndex = slides.length; }
        
        for (let i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
        }
        for (let i = 0; i < dots.length; i++) {
            dots[i].className = dots[i].className.replace(" active", "");
        }
        
        slides[slideIndex - 1].style.display = "block";
        if (dots[slideIndex - 1]) {
            dots[slideIndex - 1].className += " active";
        }
    };

    window.plusSlides = (n) => {
        showSlides(slideIndex += n);
    };

    window.currentSlide = (n) => {
        showSlides(slideIndex = n);
    };

    showSlides(slideIndex);
    
    // Auto-slide every 5 seconds
    setInterval(() => {
        showSlides(slideIndex += 1);
    }, 5000);
}

// FAQ accordion handler
function initializeFAQAccordions() {
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            item.classList.toggle('active');
        });
    });
}

// Scroll animation triggers
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-reveal');
            }
        });
    }, { threshold: 0.1 });

    const animTargets = document.querySelectorAll('.flip-card, .section-title, .stat-card, .about-row');
    animTargets.forEach(target => {
        target.style.opacity = '0';
        target.style.transform = 'translateY(20px)';
        target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(target);
    });

    // Custom CSS dynamic inject for scroll animations
    const style = document.createElement('style');
    style.innerHTML = `
        .animate-reveal {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// Create animated falling leaf effect on the hero area
function createLeafParticles() {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    for (let i = 0; i < 15; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'leaf-particle';
        leaf.style.left = `${Math.random() * 100}%`;
        leaf.style.animationDelay = `${Math.random() * 8}s`;
        leaf.style.animationDuration = `${6 + Math.random() * 8}s`;
        hero.appendChild(leaf);
    }
}

// Animate statistics counter numbers smoothly
function initializeStatsCounters() {
    const statsSection = document.querySelector('.stats-section');
    if (!statsSection) return;

    const counters = document.querySelectorAll('.stat-number');
    if (!counters.length) return;

    const runAnimation = (counterElement) => {
        const target = parseInt(counterElement.getAttribute('data-target'), 10);
        const suffix = counterElement.getAttribute('data-suffix') || '';
        const duration = 2000; // 2 seconds duration
        let startTime = null;

        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            // Cubic ease-out curve
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(easeProgress * target);

            // Format numbers with commas if large (e.g. 15,000)
            if (target >= 1000) {
                counterElement.textContent = currentValue.toLocaleString() + suffix;
            } else {
                counterElement.textContent = currentValue + suffix;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (target >= 1000) {
                    counterElement.textContent = target.toLocaleString() + suffix;
                } else {
                    counterElement.textContent = target + suffix;
                }
            }
        };

        requestAnimationFrame(animate);
    };

    // Use IntersectionObserver to start counting only when visible in the viewport
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                counters.forEach(counter => runAnimation(counter));
                observerInstance.unobserve(entry.target);
            }
        });
    }, observerOptions);

    observer.observe(statsSection);
}