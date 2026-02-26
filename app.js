// ====== CONFIG YOU CAN EDIT EASILY ======
const SALE_PERCENT = 10; // 10% off
const SHIPPING_FLAT = 12.99; // only used when cart has < 2 items
const FREE_SHIP_MIN_ITEMS = 2;

// Change this to your real checkout URL later:
// - Shopify store link
// - Stripe Payment Link
// - Or your own checkout page
const CHECKOUT_URL = "https://example.com/checkout"; // <-- REPLACE LATER

// Countdown end time (Toronto time). Example: 7 days from now.
// If you want a specific date, set it like: new Date("2026-03-10T23:59:59-05:00")
const saleEndsAt = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d;
})();

// ====== PRODUCTS ======
const products = [
  {
    id: "thobe",
    name: "Thobe",
    image: "assets/thobe.jpg", // <-- PUT YOUR IMAGE HERE
    variants: [
      { color: "White", price: 59 },
      { color: "Black", price: 69 },
      { color: "Navy", price: 69 },
      { color: "Olive", price: 75 },
    ],
  },
  {
    id: "kandura",
    name: "Kandura",
    image: "assets/kandura.jpg", // <-- PUT YOUR IMAGE HERE
    variants: [
      { color: "White", price: 65 },
      { color: "Beige", price: 65 },
      { color: "Grey", price: 70 },
      { color: "Blue", price: 75 },
    ],
  },
  {
    id: "shalwar",
    name: "Shalwar Kameez",
    image: "assets/shalwar.jpg", // <-- PUT YOUR IMAGE HERE
    variants: [
      { color: "White", price: 79 },
      { color: "Cream", price: 79 },
      { color: "Brown", price: 85 },
      { color: "Charcoal", price: 85 },
    ],
  },
  {
    id: "kaftan",
    name: "Kaftan",
    image: "assets/kaftan.jpg", // <-- PUT YOUR IMAGE HERE
    variants: [
      { color: "Black", price: 89 },
      { color: "Red", price: 95 },
      { color: "Blue", price: 95 },
      { color: "Cream", price: 85 },
    ],
  },
];

const sizes = ["S", "M", "L", "XL"];

// ====== STATE ======
const STORAGE_KEY = "haidari_cart_v1";
let cart = loadCart();

// ====== DOM ======
const productGrid = document.getElementById("productGrid");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const shippingEl = document.getElementById("shipping");
const totalEl = document.getElementById("total");
const shippingHintEl = document.getElementById("shippingHint");
const checkoutBtn = document.getElementById("checkoutBtn");
const countdownEl = document.getElementById("countdown");
const scrollPreviewBtn = document.getElementById("scrollPreviewBtn");

// ====== INIT ======
renderProducts();
renderCart();
setupCartUI();
setupCountdown();
setupTilt();

// ====== RENDER PRODUCTS ======
function renderProducts() {
  productGrid.innerHTML = "";

  products.forEach((p) => {
    const cheapest = Math.min(...p.variants.map(v => v.price));

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card__img">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" />
      </div>

      <div class="card__body">
        <h3 class="card__title">${escapeHtml(p.name)}</h3>

        <div class="priceRow">
          <div class="price">From ${money(cheapest)}</div>
          <div class="sale">10% OFF</div>
        </div>

        <div class="controls">
          <div class="row2">
            <select class="colorSel" aria-label="Select color">
              ${p.variants.map(v => `<option value="${escapeAttr(v.color)}">${escapeHtml(v.color)} — ${money(v.price)}</option>`).join("")}
            </select>

            <select class="sizeSel" aria-label="Select size">
              ${sizes.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>

          <button class="btn btn--primary cardBtn">Add to Cart</button>
        </div>
      </div>
    `;

    const colorSel = card.querySelector(".colorSel");
    const sizeSel = card.querySelector(".sizeSel");
    const addBtn = card.querySelector(".cardBtn");

    addBtn.addEventListener("click", () => {
      const color = colorSel.value;
      const size = sizeSel.value;
      const variant = p.variants.find(v => v.color === color);
      addToCart({
        key: `${p.id}|${color}|${size}`,
        productId: p.id,
        name: p.name,
        color,
        size,
        unitPrice: variant.price,
        qty: 1
      });
      openCart();
    });

    productGrid.appendChild(card);
  });
}

// ====== CART OPS ======
function addToCart(item) {
  const existing = cart.find(x => x.key === item.key);
  if (existing) existing.qty += 1;
  else cart.push(item);
  saveCart();
  renderCart();
}

function changeQty(key, delta) {
  const it = cart.find(x => x.key === key);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) cart = cart.filter(x => x.key !== key);
  saveCart();
  renderCart();
}

function removeItem(key) {
  cart = cart.filter(x => x.key !== key);
  saveCart();
  renderCart();
}

function cartItemCount() {
  return cart.reduce((sum, it) => sum + it.qty, 0);
}

function subtotal() {
  return cart.reduce((sum, it) => sum + (it.unitPrice * it.qty), 0);
}

function discountAmount(sub) {
  // If sale ended, discount = 0
  if (new Date() > saleEndsAt) return 0;
  return (SALE_PERCENT / 100) * sub;
}

function shippingCost(itemCount) {
  if (itemCount >= FREE_SHIP_MIN_ITEMS) return 0;
  if (itemCount === 0) return 0;
  return SHIPPING_FLAT;
}

function renderCart() {
  cartCountEl.textContent = String(cartItemCount());

  cartItemsEl.innerHTML = "";
  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<div class="muted">Your cart is empty. Add something from the drop.</div>`;
  } else {
    cart.forEach((it) => {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div>
          <div class="item__name">${escapeHtml(it.name)}</div>
          <div class="item__meta">${escapeHtml(it.color)} • Size ${escapeHtml(it.size)}</div>
          <div class="item__meta">${money(it.unitPrice)} each</div>
        </div>

        <div class="item__right">
          <div class="qty">
            <button aria-label="Decrease quantity">−</button>
            <span>${it.qty}</span>
            <button aria-label="Increase quantity">+</button>
          </div>
          <div class="item__name">${money(it.unitPrice * it.qty)}</div>
          <button class="remove">Remove</button>
        </div>
      `;

      const [minusBtn, plusBtn] = row.querySelectorAll(".qty button");
      const removeBtn = row.querySelector(".remove");

      minusBtn.addEventListener("click", () => changeQty(it.key, -1));
      plusBtn.addEventListener("click", () => changeQty(it.key, 1));
      removeBtn.addEventListener("click", () => removeItem(it.key));

      cartItemsEl.appendChild(row);
    });
  }

  const sub = subtotal();
  const disc = discountAmount(sub);
  const items = cartItemCount();
  const ship = shippingCost(items);
  const total = Math.max(0, sub - disc + ship);

  subtotalEl.textContent = money(sub);
  discountEl.textContent = `-${money(disc)}`;
  shippingEl.textContent = ship === 0 ? "$0.00" : money(ship);
  totalEl.textContent = money(total);

  // Shipping hint
  if (items === 0) shippingHintEl.textContent = "Add 2 items for free shipping.";
  else if (items < FREE_SHIP_MIN_ITEMS) shippingHintEl.textContent = `Add ${FREE_SHIP_MIN_ITEMS - items} more item(s) for free shipping.`;
  else shippingHintEl.textContent = "Free shipping applied (2+ items).";

  // Checkout
  checkoutBtn.disabled = items === 0;
  checkoutBtn.onclick = () => {
    // Later: send cart to Shopify/Stripe
    window.location.href = CHECKOUT_URL;
  };
}

// ====== CART UI ======
function setupCartUI() {
  openCartBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  scrollPreviewBtn.addEventListener("click", () => {
    document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

// ====== STORAGE ======
function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ====== COUNTDOWN ======
function setupCountdown() {
  function tick() {
    const now = new Date();
    const diff = saleEndsAt - now;

    if (diff <= 0) {
      countdownEl.textContent = "SALE ENDED";
      return;
    }

    const s = Math.floor(diff / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    countdownEl.textContent = `${hh}:${mm}:${ss}`;
    requestAnimationFrame(() => {});
  }

  tick();
  setInterval(tick, 1000);
}

// ====== TILT EFFECT ======
function setupTilt() {
  const tiltEl = document.querySelector(".tilt");
  if (!tiltEl) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function onMove(e) {
    const r = tiltEl.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;

    const rotY = clamp(x * 10, -8, 8);
    const rotX = clamp(-y * 10, -8, 8);

    tiltEl.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-1px)`;
  }

  function reset() {
    tiltEl.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }

  tiltEl.addEventListener("mousemove", onMove);
  tiltEl.addEventListener("mouseleave", reset);
  tiltEl.addEventListener("touchend", reset, { passive: true });
}

// ====== HELPERS ======
function money(n) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[s]));
}
function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}