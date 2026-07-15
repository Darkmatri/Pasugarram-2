const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pasugaaram_secret_key_2024';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── Data Helpers ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');

function readJSON(filename) {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── PRODUCTS API ─────────────────────────────────────────────────────────────

// GET /api/products — all products (flattened)
app.get('/api/products', (req, res) => {
  const catalog = readJSON('products.json');
  if (!catalog) return res.status(500).json({ error: 'Could not load products' });
  const all = Object.values(catalog).flat();
  res.json({ success: true, count: all.length, products: all });
});

// GET /api/products/:category — products by category
app.get('/api/products/:category', (req, res) => {
  const catalog = readJSON('products.json');
  if (!catalog) return res.status(500).json({ error: 'Could not load products' });
  const category = req.params.category.toLowerCase();
  const products = catalog[category];
  if (!products) return res.status(404).json({ error: `Category '${category}' not found` });
  res.json({ success: true, category, count: products.length, products });
});

// GET /api/product/:id — single product by id
app.get('/api/product/:id', (req, res) => {
  const catalog = readJSON('products.json');
  if (!catalog) return res.status(500).json({ error: 'Could not load products' });
  const all = Object.values(catalog).flat();
  const product = all.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, product });
});

// ─── AUTH API ─────────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const users = readJSON('users.json') || [];
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    name,
    email,
    phone: phone || '',
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    orders: []
  };
  users.push(newUser);
  writeJSON('users.json', users);

  const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone }
  });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const users = readJSON('users.json') || [];
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
  });
});

// GET /api/auth/me — get current user profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const users = readJSON('users.json') || [];
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt }
  });
});

// ─── ORDERS API ───────────────────────────────────────────────────────────────

// POST /api/orders — place a new order
app.post('/api/orders', authMiddleware, (req, res) => {
  const { items, address, paymentMethod, coupon } = req.body;
  if (!items || !items.length || !address) {
    return res.status(400).json({ error: 'Items and delivery address are required' });
  }
  const orders = readJSON('orders.json') || [];
  const users = readJSON('users.json') || [];

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = Math.round(subtotal * 0.05);
  const discount = coupon === 'ORGANIC10' ? Math.round(subtotal * 0.10) : 0;
  const total = subtotal + tax - discount;

  const newOrder = {
    id: uuidv4(),
    userId: req.user.id,
    items,
    address,
    paymentMethod: paymentMethod || 'COD',
    coupon: coupon || null,
    subtotal,
    tax,
    discount,
    total,
    status: 'confirmed',
    placedAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };

  orders.push(newOrder);
  writeJSON('orders.json', orders);

  // Also update user's orders list
  const userIdx = users.findIndex(u => u.id === req.user.id);
  if (userIdx !== -1) {
    if (!users[userIdx].orders) users[userIdx].orders = [];
    users[userIdx].orders.push(newOrder.id);
    writeJSON('users.json', users);
  }

  res.status(201).json({ success: true, message: 'Order placed successfully', order: newOrder });
});

// GET /api/orders/my — get logged-in user's orders
app.get('/api/orders/my', authMiddleware, (req, res) => {
  const orders = readJSON('orders.json') || [];
  const userOrders = orders.filter(o => o.userId === req.user.id);
  res.json({ success: true, count: userOrders.length, orders: userOrders });
});

// GET /api/orders/:id — get single order
app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const orders = readJSON('orders.json') || [];
  const order = orders.find(o => o.id === req.params.id && o.userId === req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ success: true, order });
});

// ─── COUPON VALIDATION ────────────────────────────────────────────────────────

app.post('/api/coupon/validate', (req, res) => {
  const { code } = req.body;
  const coupons = {
    'ORGANIC10': { discount: 10, description: '10% off on all orders' },
    'FRESH20':   { discount: 20, description: '20% off on first order' },
    'GREEN15':   { discount: 15, description: '15% off for green lovers' }
  };
  const coupon = coupons[code?.toUpperCase()];
  if (coupon) {
    res.json({ success: true, code: code.toUpperCase(), ...coupon });
  } else {
    res.status(404).json({ success: false, error: 'Invalid coupon code' });
  }
});

// ─── STATIC FILE SERVING ──────────────────────────────────────────────────────
// Serve index.html as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\x1b[32m%s\x1b[0m', `
  ╔═══════════════════════════════════════╗
  ║   🌿 Pasugaaram Server Running        ║
  ║   http://localhost:${PORT}               ║
  ║   The Organic Evolution               ║
  ╚═══════════════════════════════════════╝
  `);
  console.log('\x1b[36m%s\x1b[0m', `  API Endpoints:`);
  console.log('  GET    /api/products');
  console.log('  GET    /api/products/:category');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  GET    /api/auth/me');
  console.log('  POST   /api/orders');
  console.log('  GET    /api/orders/my');
  console.log('  POST   /api/coupon/validate\n');
});
