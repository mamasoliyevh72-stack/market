// Global State
let state = {
  currentCustomerId: 1,
  selectedCategory: 'all',
  searchQuery: '',
  sortBy: 'default',
  onlyInStock: false,
  products: [],
  cart: { items: [], totalAmount: 0, itemCount: 0 },
  customers: []
};

// Yordamchi: Narxni so'mda formatlash
function formatUZS(amount) {
  if (!amount && amount !== 0) return '0 so\'m';
  return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)) + ' so\'m';
}

// Yordamchi: Toast bildirishnoma
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  const bgClass = type === 'success' 
    ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
    : type === 'error'
    ? 'bg-rose-600 text-white shadow-rose-500/20'
    : 'bg-slate-800 text-white shadow-slate-900/20';

  const iconName = type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-circle' : 'info';

  toast.className = `toast flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 1. Mijozlar ro'yxatini yuklash va tanlash
async function loadCustomers() {
  try {
    const res = await fetch('/api/customers');
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      state.customers = data.data;
      const select = document.getElementById('activeCustomerSelect');
      select.innerHTML = state.customers.map(c => 
        `<option value="${c.id}">${c.full_name} (${c.phone})</option>`
      ).join('');

      state.currentCustomerId = state.customers[0].id;
      
      // Modal inputlariga avtomatik yozish
      document.getElementById('orderCustomerName').value = state.customers[0].full_name;
      document.getElementById('orderCustomerPhone').value = state.customers[0].phone;

      select.addEventListener('change', (e) => {
        state.currentCustomerId = parseInt(e.target.value, 10);
        const selCust = state.customers.find(c => c.id === state.currentCustomerId);
        if (selCust) {
          document.getElementById('orderCustomerName').value = selCust.full_name;
          document.getElementById('orderCustomerPhone').value = selCust.phone;
        }
        loadCart();
        showToast(`Mijoz almashtirildi: ${selCust.full_name}`, 'info');
      });
    }
  } catch (err) {
    console.error('Mijozlarni yuklashda xatolik:', err);
  }
}

// 2. Kategoriyalarni yuklash
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('categoriesPills');
      
      // Faqat 'Barchasi' dan keyingi elementlarni yangilash
      const allBtn = container.querySelector('[data-category="all"]');
      container.innerHTML = '';
      container.appendChild(allBtn);

      data.data.forEach(cat => {
        const btn = document.createElement('button');
        btn.setAttribute('data-category', cat.id);
        btn.className = 'category-pill flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 flex items-center space-x-1.5';
        btn.innerHTML = `
          <span>${cat.name}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">${cat.product_count || 0}</span>
        `;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.category-pill').forEach(b => {
            b.className = 'category-pill flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 flex items-center space-x-1.5';
          });
          btn.className = 'category-pill active flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 flex items-center space-x-1.5';
          state.selectedCategory = cat.id;
          loadProducts();
        });
        container.appendChild(btn);
      });

      // 'Barchasi' tugmasi bosilganda
      allBtn.onclick = () => {
        document.querySelectorAll('.category-pill').forEach(b => {
          b.className = 'category-pill flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 flex items-center space-x-1.5';
        });
        allBtn.className = 'category-pill active flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 flex items-center space-x-1.5';
        state.selectedCategory = 'all';
        loadProducts();
      };
    }
  } catch (err) {
    console.error('Kategoriyalarni yuklashda xatolik:', err);
  }
}

// 3. Mahsulotlarni yuklash va chizish
async function loadProducts() {
  try {
    const params = new URLSearchParams();
    if (state.selectedCategory !== 'all') {
      params.append('category_id', state.selectedCategory);
    }
    if (state.searchQuery) {
      params.append('search', state.searchQuery);
    }
    if (state.sortBy && state.sortBy !== 'default') {
      params.append('sort', state.sortBy);
    }

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    
    if (data.success) {
      let prods = data.data;

      if (state.onlyInStock) {
        prods = prods.filter(p => p.stock > 0);
      }

      state.products = prods;
      renderProductsGrid(prods);

      document.getElementById('productCountInfo').innerText = `${prods.length} ta mahsulot`;
    }
  } catch (err) {
    console.error('Mahsulotlarni yuklashda xatolik:', err);
  }
}

function renderProductsGrid(products) {
  const grid = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyState');

  if (products.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = products.map(p => {
    const isOutOfStock = p.stock <= 0;
    const isLowStock = p.stock > 0 && p.stock <= 5;
    
    let stockBadge = '';
    if (isOutOfStock) {
      stockBadge = `<span class="badge-out-stock text-[10px] font-bold px-2 py-0.5 rounded-full">Tugagan</span>`;
    } else if (isLowStock) {
      stockBadge = `<span class="badge-low-stock text-[10px] font-bold px-2 py-0.5 rounded-full">Kam qoldi: ${p.stock} ta</span>`;
    } else {
      stockBadge = `<span class="badge-in-stock text-[10px] font-bold px-2 py-0.5 rounded-full">Mavjud: ${p.stock} ta</span>`;
    }

    const fallbackImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80';
    const imgSrc = p.image_url || fallbackImg;

    return `
      <div class="product-card bg-white rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col justify-between group">
        <!-- Rasm va Badge -->
        <div class="relative w-full pt-[75%] bg-slate-100 overflow-hidden">
          <img 
            src="${imgSrc}" 
            alt="${p.name}" 
            class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onerror="this.src='${fallbackImg}'"
          >
          <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
            ${p.category_name ? `<span class="bg-slate-900/75 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm">${p.category_name}</span>` : ''}
          </div>
          <div class="absolute top-2.5 right-2.5">
            ${stockBadge}
          </div>
        </div>

        <!-- Ma'lumotlar -->
        <div class="p-3.5 sm:p-4 flex flex-col flex-grow justify-between">
          <div>
            <h3 class="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1 mb-1" title="${p.name}">
              ${p.name}
            </h3>
            <p class="text-slate-400 text-[11px] line-clamp-2 leading-relaxed mb-3">
              ${p.description || 'Sifatli va yangi mahsulot.'}
            </p>
          </div>

          <!-- Narx va Tugma -->
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              <div class="text-[10px] text-slate-400 uppercase font-semibold">Narxi:</div>
              <div class="text-sm sm:text-base font-extrabold text-slate-900">
                ${formatUZS(p.price)}
              </div>
            </div>

            <button 
              onclick="handleAddToCart(${p.id}, ${p.stock})"
              ${isOutOfStock ? 'disabled' : ''}
              class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition shadow-sm ${
                isOutOfStock 
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-90'
              }"
              title="${isOutOfStock ? 'Mahsulot tugagan' : 'Savatga qo\'shish'}"
            >
              <i data-lucide="shopping-cart" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// 4. Savatchani yuklash
async function loadCart() {
  if (!state.currentCustomerId) return;
  try {
    const res = await fetch(`/api/cart/${state.currentCustomerId}`);
    const data = await res.json();
    if (data.success) {
      state.cart = data;
      renderCartView();
    }
  } catch (err) {
    console.error('Savatchani olishda xatolik:', err);
  }
}

function renderCartView() {
  const badge = document.getElementById('cartBadge');
  const totalNav = document.getElementById('cartTotalNav');
  const cartList = document.getElementById('cartItemsList');
  const emptyCart = document.getElementById('emptyCartView');
  const cartFooter = document.getElementById('cartFooter');
  const subtitle = document.getElementById('cartItemsSubtitle');
  const subtotal = document.getElementById('cartSubtotal');
  const totalDrawer = document.getElementById('cartTotalDrawer');

  badge.innerText = state.cart.itemCount;
  totalNav.innerText = formatUZS(state.cart.totalAmount);
  subtitle.innerText = `${state.cart.itemCount} ta mahsulot`;
  subtotal.innerText = formatUZS(state.cart.totalAmount);
  totalDrawer.innerText = formatUZS(state.cart.totalAmount);

  if (!state.cart.items || state.cart.items.length === 0) {
    cartList.innerHTML = '';
    cartList.classList.add('hidden');
    cartFooter.classList.add('hidden');
    emptyCart.classList.remove('hidden');
    return;
  }

  emptyCart.classList.add('hidden');
  cartList.classList.remove('hidden');
  cartFooter.classList.remove('hidden');

  cartList.innerHTML = state.cart.items.map(item => `
    <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
      <img 
        src="${item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600'}" 
        alt="${item.name}" 
        class="w-14 h-14 object-cover rounded-xl bg-white border border-slate-200/60 flex-shrink-0"
      >
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold text-slate-900 truncate mb-0.5">${item.name}</h4>
        <div class="text-xs text-slate-500 mb-2">${formatUZS(item.price)}</div>
        
        <!-- Quantity Stepper -->
        <div class="flex items-center space-x-2">
          <div class="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <button 
              onclick="updateCartQuantity(${item.product_id}, ${item.quantity - 1})"
              class="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
            >
              <i data-lucide="minus" class="w-3 h-3"></i>
            </button>
            <span class="w-7 text-center text-xs font-bold text-slate-800">${item.quantity}</span>
            <button 
              onclick="updateCartQuantity(${item.product_id}, ${item.quantity + 1})"
              class="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
            >
              <i data-lucide="plus" class="w-3 h-3"></i>
            </button>
          </div>
          <span class="text-[11px] font-bold text-slate-700 ml-auto">
            ${formatUZS(item.total_item_price)}
          </span>
        </div>
      </div>
      <button 
        onclick="removeFromCart(${item.product_id})" 
        class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
        title="O'chirish"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');

  lucide.createIcons();
}

// 5. Savatcha operatsiyalari
async function handleAddToCart(productId, maxStock) {
  if (maxStock <= 0) {
    showToast('Kechirasiz, mahsulot omborda qolmagan!', 'error');
    return;
  }

  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: state.currentCustomerId,
        product_id: productId,
        quantity: 1
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Mahsulot savatchaga qo\'shildi!', 'success');
      loadCart();
    } else {
      showToast(data.message || 'Xatolik yuz berdi', 'error');
    }
  } catch (err) {
    showToast('Savatchaga qo\'shishda xatolik', 'error');
  }
}

async function updateCartQuantity(productId, quantity) {
  try {
    const res = await fetch('/api/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: state.currentCustomerId,
        product_id: productId,
        quantity
      })
    });
    const data = await res.json();
    if (data.success) {
      loadCart();
    } else {
      showToast(data.message || 'Xatolik', 'error');
    }
  } catch (err) {
    showToast('Xatolik yuz berdi', 'error');
  }
}

async function removeFromCart(productId) {
  try {
    const res = await fetch('/api/cart/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: state.currentCustomerId,
        product_id: productId
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Mahsulot olib tashlandi', 'info');
      loadCart();
    }
  } catch (err) {
    showToast('O\'chirishda xatolik', 'error');
  }
}

async function clearCart() {
  if (!confirm('Savatchani haqiqatdan ham tozalamoqchimisiz?')) return;
  try {
    const res = await fetch('/api/cart/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: state.currentCustomerId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Savatcha tozalandi', 'info');
      loadCart();
    }
  } catch (err) {
    showToast('Tozalashda xatolik', 'error');
  }
}

// 6. Buyurtma rasmiylashtirish (Checkout)
async function submitCheckout() {
  if (!state.cart.items || state.cart.items.length === 0) {
    showToast('Savatchangiz bo\'sh!', 'error');
    return;
  }

  const name = document.getElementById('orderCustomerName').value.trim();
  const phone = document.getElementById('orderCustomerPhone').value.trim();
  const address = document.getElementById('orderAddress').value.trim();

  if (!name || !phone) {
    showToast('Ismingiz va telefon raqamingizni kiriting', 'error');
    return;
  }

  const checkoutBtn = document.getElementById('checkoutBtn');
  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = '<span class="animate-spin inline-block mr-2">◷</span> Buyurtma qilinmoqda...';

  try {
    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: state.currentCustomerId,
        customer_name: name,
        customer_phone: phone,
        delivery_address: address
      })
    });
    const data = await res.json();

    if (data.success) {
      // Drawer yopish
      toggleCartDrawer(false);

      // Chek modalini ochish
      document.getElementById('successOrderId').innerText = `#${data.orderId}`;
      document.getElementById('successTotalAmount').innerText = formatUZS(data.totalAmount);
      document.getElementById('successCustomerName').innerText = `${name} (${phone})`;
      document.getElementById('orderSuccessModal').classList.remove('hidden');

      // Savat va tovarlar zaxirasini yangilash
      loadCart();
      loadProducts();
      showToast('Buyurtma qabul qilindi!', 'success');
    } else {
      showToast(data.message || 'Buyurtma rasmiylashtirishda xatolik', 'error');
    }
  } catch (err) {
    showToast('Server bilan bog\'lanishda xatolik', 'error');
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i><span>Buyurtmani Tasdiqlash</span>';
    lucide.createIcons();
  }
}

// 7. Buyurtmalar tarixini ko'rish
async function openOrdersHistory() {
  const modal = document.getElementById('ordersHistoryModal');
  const list = document.getElementById('ordersHistoryList');
  modal.classList.remove('hidden');
  list.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Buyurtmalar yuklanmoqda...</div>';

  try {
    const res = await fetch(`/api/orders?customer_id=${state.currentCustomerId}`);
    const data = await res.json();
    if (data.success) {
      if (data.data.length === 0) {
        list.innerHTML = `
          <div class="text-center py-12 text-slate-400 text-xs">
            <i data-lucide="package" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            Hozircha buyurtmalar mavjud emas.
          </div>
        `;
      } else {
        list.innerHTML = data.data.map(o => {
          const dateStr = new Date(o.created_at).toLocaleString('uz-UZ', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          return `
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div class="flex items-center space-x-2 mb-1">
                  <span class="font-bold text-slate-900 font-mono text-sm">#${o.id}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${
                    o.status === 'Yetkazildi' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : o.status === 'Bekor qilindi'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }">${o.status}</span>
                </div>
                <div class="text-[11px] text-slate-400">
                  <span>${dateStr}</span> • <span>${o.items_count} xil tovar</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-1">
                  Manzil: ${o.delivery_address || 'Do\'kondan olib ketish'}
                </div>
              </div>
              <div class="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                <div class="text-[10px] text-slate-400 uppercase font-semibold">Jami to'lov:</div>
                <div class="text-sm font-extrabold text-emerald-700">${formatUZS(o.total_amount)}</div>
              </div>
            </div>
          `;
        }).join('');
      }
      lucide.createIcons();
    }
  } catch (err) {
    list.innerHTML = '<div class="text-center py-6 text-xs text-rose-500">Buyurtmalarni yuklashda xatolik yuz berdi.</div>';
  }
}

// 8. Drawer boshqaruvi
function toggleCartDrawer(open) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  const content = document.getElementById('cartContent');

  if (open) {
    drawer.classList.remove('pointer-events-none');
    backdrop.classList.remove('pointer-events-none', 'opacity-0');
    backdrop.classList.add('opacity-100');
    content.classList.remove('translate-x-full');
  } else {
    drawer.classList.add('pointer-events-none');
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    content.classList.add('translate-x-full');
  }
}

// 9. Do'kon sozlamalarini yuklash (Nom va h.k.)
async function loadStoreSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.data) {
      const { store_name, store_tagline } = data.data;
      if (store_name) {
        document.title = `${store_name} - Sarxil va Sifatli Mahsulotlar Do'koni`;
        document.querySelectorAll('.store-name-display').forEach(el => {
          el.innerText = store_name;
        });
      }
      if (store_tagline) {
        document.querySelectorAll('.store-tagline-display').forEach(el => {
          el.innerText = store_tagline;
        });
      }
    }
  } catch (err) {
    console.error('Sozlamalar yuklanmadi:', err);
  }
}

// Hodisalarni ulash
document.addEventListener('DOMContentLoaded', () => {
  loadStoreSettings();
  loadCustomers();
  loadCategories();
  loadProducts();
  loadCart();

  // Savat ochish/yopish
  document.getElementById('cartBtn').onclick = () => toggleCartDrawer(true);
  document.getElementById('closeCartBtn').onclick = () => toggleCartDrawer(false);
  document.getElementById('cartBackdrop').onclick = () => toggleCartDrawer(false);
  document.getElementById('startShoppingBtn').onclick = () => toggleCartDrawer(false);

  // Buyurtmalar tarixi
  document.getElementById('ordersBtn').onclick = openOrdersHistory;
  document.getElementById('closeOrdersHistoryBtn').onclick = () => {
    document.getElementById('ordersHistoryModal').classList.add('hidden');
  };

  // Chek modal yopish
  document.getElementById('closeSuccessModalBtn').onclick = () => {
    document.getElementById('orderSuccessModal').classList.add('hidden');
  };

  // Savatni tozalash va checkout
  document.getElementById('clearCartBtn').onclick = clearCart;
  document.getElementById('checkoutBtn').onclick = submitCheckout;

  // Qidiruv
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let debounceTimeout = null;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      state.searchQuery = val;
      loadProducts();
    }, 250);
  });

  clearSearchBtn.onclick = () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    state.searchQuery = '';
    loadProducts();
  };

  // Saralash
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    loadProducts();
  });

  // Faqat mavjudlari
  document.getElementById('onlyInStockCheckbox').addEventListener('change', (e) => {
    state.onlyInStock = e.target.checked;
    loadProducts();
  });

  // Filtrlarni tozalash
  document.getElementById('resetFiltersBtn').onclick = () => {
    state.selectedCategory = 'all';
    state.searchQuery = '';
    state.sortBy = 'default';
    state.onlyInStock = false;
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    document.getElementById('sortSelect').value = 'default';
    document.getElementById('onlyInStockCheckbox').checked = false;
    
    document.querySelectorAll('.category-pill').forEach(b => {
      b.className = 'category-pill flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 flex items-center space-x-1.5';
    });
    const allBtn = document.querySelector('[data-category="all"]');
    if (allBtn) {
      allBtn.className = 'category-pill active flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 flex items-center space-x-1.5';
    }

    loadProducts();
  };
});
