// Admin State
let adminState = {
  activeTab: 'products',
  products: [],
  categories: [],
  orders: [],
  searchQuery: '',
  selectedCategory: 'all'
};

function formatUZS(amount) {
  if (!amount && amount !== 0) return '0 so\'m';
  return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)) + ' so\'m';
}

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

// 1. Tablarni almashtirish
function switchTab(tabName) {
  adminState.activeTab = tabName;

  const tabs = ['products', 'orders', 'categories', 'settings'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const content = document.getElementById(`tabContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
    
    if (t === tabName) {
      btn.className = 'tab-btn py-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 border-emerald-600 text-emerald-700 flex items-center space-x-2 transition';
      if (content) content.classList.remove('hidden');
    } else {
      btn.className = 'tab-btn py-3.5 px-3 text-xs sm:text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-900 flex items-center space-x-2 transition';
      if (content) content.classList.add('hidden');
    }
  });

  if (tabName === 'orders') loadAdminOrders();
  if (tabName === 'categories') loadAdminCategories();
  if (tabName === 'settings') loadAdminSettings();
}

// 2. Statistikani yuklash
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success) {
      const s = data.stats;
      document.getElementById('statRevenue').innerText = formatUZS(s.totalRevenue);
      document.getElementById('statOrders').innerText = s.totalOrders;
      document.getElementById('statProducts').innerText = s.totalProducts;
      document.getElementById('statLowStock').innerText = s.lowStockCount;
    }
  } catch (err) {
    console.error('Statistika yuklanmadi:', err);
  }
}

// 3. Mahsulotlar bo'limi
async function loadAdminProducts() {
  try {
    const params = new URLSearchParams();
    if (adminState.selectedCategory !== 'all') {
      params.append('category_id', adminState.selectedCategory);
    }
    if (adminState.searchQuery) {
      params.append('search', adminState.searchQuery);
    }

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      adminState.products = data.data;
      renderAdminProductsTable();
    }
  } catch (err) {
    console.error('Mahsulotlar yuklanmadi:', err);
  }
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('adminProductsTableBody');
  if (adminState.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Mahsulotlar topilmadi.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminState.products.map(p => {
    const fallbackImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600';
    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-4 py-3 font-mono text-slate-400 text-[11px]">#${p.id}</td>
        <td class="px-4 py-3">
          <div class="flex items-center space-x-3">
            <img src="${p.image_url || fallbackImg}" alt="${p.name}" class="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white" onerror="this.src='${fallbackImg}'">
            <div>
              <div class="font-bold text-slate-900">${p.name}</div>
              <div class="text-[11px] text-slate-400 truncate max-w-xs">${p.description || '-'}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3">
          <span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
            ${p.category_name || 'Biriktirilmagan'}
          </span>
        </td>
        <td class="px-4 py-3 font-bold text-slate-900">${formatUZS(p.price)}</td>
        <td class="px-4 py-3">
          <span class="font-bold px-2 py-0.5 rounded text-[11px] ${
            p.stock <= 0 
              ? 'bg-rose-100 text-rose-800' 
              : p.stock <= 5 
              ? 'bg-amber-100 text-amber-800' 
              : 'bg-emerald-100 text-emerald-800'
          }">
            ${p.stock} ta
          </span>
        </td>
        <td class="px-4 py-3 text-right space-x-1">
          <button onclick="editProduct(${p.id})" class="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition" title="Tahrirlash">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteProduct(${p.id})" class="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="O'chirish">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

// Mahsulot Modali
async function openProductModal(isEdit = false) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');

  // Kategoriyalar yuklanmagan bo'lsa yuklash
  if (adminState.categories.length === 0) {
    await loadAdminCategories();
  }

  // Kategoriyalar selectini to'ldirish
  const catSelect = document.getElementById('prodCategory');
  catSelect.innerHTML = '<option value="">-- Toifasiz / Tanlanmagan --</option>' +
    adminState.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (!isEdit) {
    title.innerText = 'Yangi Mahsulot Qo\'shish';
    form.reset();
    document.getElementById('editProductId').value = '';
    catSelect.value = '';
  }

  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

async function editProduct(id) {
  const p = adminState.products.find(item => item.id === id);
  if (!p) return;

  await openProductModal(true);
  document.getElementById('productModalTitle').innerText = 'Mahsulotni Tahrirlash';
  document.getElementById('editProductId').value = p.id;
  document.getElementById('prodName').value = p.name || '';
  document.getElementById('prodPrice').value = p.price || 0;
  document.getElementById('prodStock').value = p.stock !== undefined ? p.stock : 0;
  document.getElementById('prodCategory').value = p.category_id || '';
  document.getElementById('prodImageUrl').value = p.image_url || '';
  document.getElementById('prodDescription').value = p.description || '';
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('prodName').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const stock = parseInt(document.getElementById('prodStock').value, 10);
  const category_id = document.getElementById('prodCategory').value || null;
  const image_url = document.getElementById('prodImageUrl').value.trim();
  const description = document.getElementById('prodDescription').value.trim();

  const payload = { name, price, stock, category_id, image_url, description };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/products/${id}` : '/api/products';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(id ? 'Mahsulot muvaffaqiyatli yangilandi' : 'Yangi mahsulot qo\'shildi!', 'success');
      closeProductModal();
      loadAdminProducts();
      loadStats();
    } else {
      showToast(data.message || 'Xatolik', 'error');
    }
  } catch (err) {
    showToast('Server bilan bog\'lanishda xatolik', 'error');
  }
}

async function deleteProduct(id) {
  const p = adminState.products.find(item => item.id === id);
  const pName = p ? `"${p.name}"` : `#${id}`;
  if (!confirm(`Haqiqatdan ham ${pName} mahsulotini o'chirmoqchimisiz?`)) return;

  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Mahsulot muvaffaqiyatli o\'chirildi', 'info');
      loadAdminProducts();
      loadStats();
    } else {
      showToast(data.message || 'Xatolik', 'error');
    }
  } catch (err) {
    showToast('O\'chirishda xatolik', 'error');
  }
}

// 4. Kategoriyalar bo'limi
async function loadAdminCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      adminState.categories = data.data;

      // Filter selectni yangilash
      const filterSelect = document.getElementById('adminCategoryFilter');
      filterSelect.innerHTML = '<option value="all">Barcha toifalar</option>' + 
        data.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      document.getElementById('categoriesCountBadge').innerText = `${data.data.length} ta`;

      const list = document.getElementById('adminCategoriesList');
      list.innerHTML = data.data.map(c => `
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div class="flex items-center space-x-2.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-bold text-slate-800 text-xs">${c.name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 font-semibold">
              ${c.product_count} ta tovar
            </span>
          </div>
          <button onclick="deleteCategory(${c.id})" class="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition" title="O'chirish">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `).join('');

      lucide.createIcons();
    }
  } catch (err) {
    console.error('Kategoriyalar yuklanmadi:', err);
  }
}

async function handleAddCategory() {
  const input = document.getElementById('newCategoryName');
  const name = input.value.trim();
  if (!name) {
    showToast('Kategoriya nomini kiriting', 'error');
    return;
  }

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Kategoriya qo\'shildi!', 'success');
      input.value = '';
      loadAdminCategories();
    } else {
      showToast(data.message || 'Xatolik', 'error');
    }
  } catch (err) {
    showToast('Xatolik yuz berdi', 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Kategoriyani o\'chirmoqchimisiz?')) return;
  try {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Kategoriya o\'chirildi', 'info');
      loadAdminCategories();
      loadAdminProducts();
    } else {
      showToast(data.message || 'Xatolik', 'error');
    }
  } catch (err) {
    showToast('O\'chirishda xatolik', 'error');
  }
}

// 5. Buyurtmalar bo'limi
async function loadAdminOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      adminState.orders = data.data;
      document.getElementById('ordersCountBadge').innerText = `${data.data.length} ta`;

      const tbody = document.getElementById('adminOrdersTableBody');
      if (data.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Buyurtmalar mavjud emas.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.data.map(o => {
        const dateStr = new Date(o.created_at).toLocaleString('uz-UZ', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="px-4 py-3 font-mono font-bold text-slate-900">#${o.id}</td>
            <td class="px-4 py-3">
              <div class="font-bold text-slate-800">${o.customer_name || 'Noma\'lum'}</div>
              <div class="text-[11px] text-slate-400">${o.customer_phone || '-'}</div>
            </td>
            <td class="px-4 py-3 text-slate-600 max-w-xs truncate" title="${o.delivery_address || ''}">
              ${o.delivery_address || 'Do\'kondan olib ketish'}
            </td>
            <td class="px-4 py-3 font-extrabold text-slate-900">${formatUZS(o.total_amount)}</td>
            <td class="px-4 py-3 text-slate-400">${dateStr}</td>
            <td class="px-4 py-3">
              <select onchange="updateOrderStatus(${o.id}, this.value)" class="text-[11px] font-bold rounded-lg px-2 py-1 border border-slate-200 focus:outline-none ${
                o.status === 'Yetkazildi' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : o.status === 'Bekor qilindi'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }">
                <option value="Yangi" ${o.status === 'Yangi' ? 'selected' : ''}>Yangi</option>
                <option value="Tayyorlanmoqda" ${o.status === 'Tayyorlanmoqda' ? 'selected' : ''}>Tayyorlanmoqda</option>
                <option value="Yetkazilmoqda" ${o.status === 'Yetkazilmoqda' ? 'selected' : ''}>Yetkazilmoqda</option>
                <option value="Yetkazildi" ${o.status === 'Yetkazildi' ? 'selected' : ''}>Yetkazildi</option>
                <option value="Bekor qilindi" ${o.status === 'Bekor qilindi' ? 'selected' : ''}>Bekor qilindi</option>
              </select>
            </td>
            <td class="px-4 py-3 text-right">
              <button onclick="viewOrderDetails(${o.id})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition">
                Tarkib
              </button>
            </td>
          </tr>
        `;
      }).join('');

      lucide.createIcons();
    }
  } catch (err) {
    console.error('Buyurtmalar yuklanmadi:', err);
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Buyurtma #${orderId} holati yangilandi: ${status}`, 'success');
      loadStats();
    } else {
      showToast(data.message || 'Xatolik', 'error');
    }
  } catch (err) {
    showToast('Holatni o\'zgartirishda xatolik', 'error');
  }
}

async function viewOrderDetails(orderId) {
  const modal = document.getElementById('orderDetailModal');
  const itemsContainer = document.getElementById('detailOrderItemsList');
  modal.classList.remove('hidden');
  itemsContainer.innerHTML = '<div class="text-center py-4 text-slate-400">Yuklanmoqda...</div>';

  try {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    if (data.success) {
      const o = data.data;
      document.getElementById('detailOrderTitle').innerText = `Buyurtma #${o.id}`;
      document.getElementById('detailOrderDate').innerText = new Date(o.created_at).toLocaleString('uz-UZ');
      document.getElementById('detailCustomerName').innerText = o.customer_name || 'Noma\'lum';
      document.getElementById('detailCustomerPhone').innerText = o.customer_phone || '-';
      document.getElementById('detailCustomerAddress').innerText = o.delivery_address || 'Do\'kondan olib ketish';
      document.getElementById('detailOrderTotal').innerText = formatUZS(o.total_amount);

      itemsContainer.innerHTML = o.items.map(item => `
        <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div class="flex items-center space-x-2.5">
            <img src="${item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600'}" class="w-8 h-8 object-cover rounded-lg">
            <div>
              <div class="font-bold text-slate-800">${item.product_name}</div>
              <div class="text-[10px] text-slate-400">${item.quantity} dona × ${formatUZS(item.unit_price)}</div>
            </div>
          </div>
          <div class="font-bold text-slate-900">
            ${formatUZS(item.quantity * item.unit_price)}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    itemsContainer.innerHTML = '<div class="text-center py-4 text-rose-500">Yuklashda xatolik yuz berdi.</div>';
  }
}

function closeOrderDetailModal() {
  document.getElementById('orderDetailModal').classList.add('hidden');
}

// ======================= ADMIN AUTENTIFIKATSIYASI =======================
function checkAdminAuth() {
  const isAuth = sessionStorage.getItem('markets_admin_token') === 'true';
  const overlay = document.getElementById('adminAuthOverlay');
  if (isAuth) {
    if (overlay) overlay.classList.add('hidden');
    loadAdminSettings();
    loadStats();
    loadAdminCategories();
    loadAdminProducts();
  } else {
    if (overlay) {
      overlay.classList.remove('hidden');
      const input = document.getElementById('adminPasscodeInput');
      if (input) setTimeout(() => input.focus(), 150);
    }
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const input = document.getElementById('adminPasscodeInput');
  const errorEl = document.getElementById('authErrorMessage');
  const submitBtn = document.getElementById('authSubmitBtn');
  const passcode = input.value.trim();

  if (!passcode) return;

  errorEl.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="animate-spin inline-block mr-2">◷</span> Tekshirilmoqda...';

  try {
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem('markets_admin_token', 'true');
      document.getElementById('adminAuthOverlay').classList.add('hidden');
      showToast('Admin tizimiga xush kelibsiz!', 'success');
      loadAdminSettings();
      loadStats();
      loadAdminCategories();
      loadAdminProducts();
    } else {
      errorEl.innerText = data.message || 'Maxfiy kod noto\'g\'ri!';
      errorEl.classList.remove('hidden');
      input.classList.add('border-rose-500', 'bg-rose-50/50');
      input.select();
    }
  } catch (err) {
    errorEl.innerText = 'Server bilan bog\'lanishda xatolik yuz berdi.';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="key-round" class="w-4 h-4"></i><span>Tizimga Kirish</span>';
    lucide.createIcons();
  }
}

// ======================= DO'KON SOZLAMALARI =======================
async function loadAdminSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.data) {
      const { store_name, store_tagline } = data.data;
      const nameInput = document.getElementById('settingsStoreName');
      const tagInput = document.getElementById('settingsStoreTagline');
      if (nameInput && store_name) nameInput.value = store_name;
      if (tagInput && store_tagline) tagInput.value = store_tagline;

      if (store_name) {
        document.querySelectorAll('.store-name-display').forEach(el => {
          el.innerText = store_name;
        });
        document.title = `${store_name} - Boshqaruv Paneli (Admin)`;
      }
    }
  } catch (err) {
    console.error('Sozlamalar yuklanmadi:', err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const nameInput = document.getElementById('settingsStoreName');
  const tagInput = document.getElementById('settingsStoreTagline');
  const store_name = nameInput.value.trim();
  const store_tagline = tagInput.value.trim();

  if (!store_name) {
    showToast('Do\'kon nomini kiriting!', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="animate-spin mr-1">◷</span> Saqlanmoqda...';
  }

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_name, store_tagline })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Do\'kon nomi muvaffaqiyatli saqlandi!', 'success');
      document.querySelectorAll('.store-name-display').forEach(el => {
        el.innerText = store_name;
      });
      document.title = `${store_name} - Boshqaruv Paneli (Admin)`;
    } else {
      showToast(data.message || 'Xatolik yuz berdi', 'error');
    }
  } catch (err) {
    showToast('Server bilan bog\'lanishda xatolik', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>O\'zgarishlarni Saqlash</span>';
      lucide.createIcons();
    }
  }
}

function handleAdminLogout() {
  if (confirm('Boshqaruv panelidan chiqmoqchimisiz?')) {
    sessionStorage.removeItem('markets_admin_token');
    window.location.reload();
  }
}

// Hodisalarni ulash
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();

  // Mahsulot qidirish
  const searchInput = document.getElementById('adminProductSearch');
  let timeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        adminState.searchQuery = e.target.value.trim();
        loadAdminProducts();
      }, 250);
    });
  }

  // Kategoriya bo'yicha filter
  const catFilter = document.getElementById('adminCategoryFilter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      adminState.selectedCategory = e.target.value;
      loadAdminProducts();
    });
  }
});

