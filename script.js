let cart = [];
let tableNumber = null;
let html5QrCode = null;
let menuProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    subscribeToMenuUpdates();
});

// ================= QR Scanner =================
function startQrScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        alert('⚠️ مكتبة مسح QR Code غير متوفرة.');
        return;
    }
    document.getElementById('start-scan-btn').style.display = 'none';
    document.getElementById('qr-reader').style.display = 'block';
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {})
        .catch(err => {
            alert("⚠️ لا يمكن الوصول إلى الكاميرا.");
            document.getElementById('start-scan-btn').style.display = 'block';
            document.getElementById('qr-reader').style.display = 'none';
            console.error(err);
        });
}

function onScanSuccess(decodedText) {
    const numMatch = decodedText.match(/\d+/);
    if (!numMatch) { alert("رمز QR غير صالح."); return; }
    tableNumber = numMatch[0];
    html5QrCode.stop();
    document.getElementById('qr-reader').style.display = 'none';
    document.getElementById('table-number-section').style.display = 'none';
    document.getElementById('table-display').textContent = `✅ الطلب للطاولة رقم: ${tableNumber}`;
    document.getElementById('table-display').style.display = 'block';
    document.getElementById('menu-section').style.display = 'block';
}

// ================= Menu =================
function subscribeToMenuUpdates() {
    document.getElementById('loading-menu').style.display = 'block';
    db.ref('menu').on('value', snapshot => {
        menuProducts = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const item = child.val();
                menuProducts.push({ ...item, docId: child.key });
            });
        }
        document.getElementById('loading-menu').style.display = 'none';
        displayMenuItems();
    }, error => console.error(error));
}

function displayMenuItems(category = 'all') {
    const container = document.getElementById('menu-items');
    container.innerHTML = '';
    if (!menuProducts.length) {
        container.innerHTML = '<p style="text-align:center; color:#6c757d; padding:20px;">قائمة الطعام فارغة حالياً.</p>';
        return;
    }
    const filtered = category === 'all' ? menuProducts : menuProducts.filter(p => p.category === category);
    filtered.forEach(product => {
        container.innerHTML += `
            <div class="menu-item" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
                <img src="${product.image || 'default.jpg'}" alt="${product.name}">
                <div class="item-details">
                    <h3>${product.name}</h3>
                    <p class="price">${product.price.toFixed(2)} جنيه</p>
                    <input type="text" id="note-${product.id}" placeholder="أضف ملاحظة..." style="width:90%; margin-bottom:5px;">
                    <button class="btn" onclick="addToCart(this)">أضف للسلة</button>
                </div>
            </div>
        `;
    });
}

function filterMenu(category, event) {
    document.querySelectorAll('.menu-categories .btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    displayMenuItems(category);
}

// ================= Cart =================
function addToCart(btn) {
    const el = btn.closest('.menu-item');
    const id = parseInt(el.getAttribute('data-id'));
    const name = el.getAttribute('data-name');
    const price = parseFloat(el.getAttribute('data-price'));
    const note = document.getElementById(`note-${id}`).value || '';

    const existing = cart.find(i => i.id === id && i.note === note);
    if (existing) existing.quantity += 1;
    else cart.push({ id, name, price, quantity: 1, note });

    updateCartDisplay();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartDisplay();
}

function updateItemQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) removeFromCart(id);
    else updateCartDisplay();
}

function updateCartDisplay() {
    const cartListContainer = document.getElementById('modal-cart-list');
    const modalCartTotalElement = document.getElementById('modal-cart-total');
    const modalCartCount = document.getElementById('modal-cart-count');
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const floatingCartCount = document.getElementById('floating-cart-count');
    const modalCheckoutBtn = document.getElementById('modal-checkout-btn');

    if (!cartListContainer || !modalCartTotalElement || !modalCartCount || !floatingCartBtn || !floatingCartCount || !modalCheckoutBtn) return;

    let total = 0;
    let itemCount = 0;
    cartListContainer.innerHTML = '';

    if (!cart.length) {
        floatingCartBtn.style.display = 'none';
        modalCheckoutBtn.style.display = 'none';
        cartListContainer.innerHTML = '<p style="text-align:center; color:#6c757d;">سلة طلباتك فارغة.</p>';
        modalCartTotalElement.textContent = '0.00';
        modalCartCount.textContent = '(0)';
        floatingCartCount.textContent = '0';
        return;
    }

    floatingCartBtn.style.display = 'flex';

    const table = document.createElement('table');
    table.className = 'cart-table';
    table.innerHTML = `
        <thead>
            <tr><th>الصنف</th><th>السعر</th><th>الكمية</th><th>ملاحظة</th><th>المجموع</th><th>الإجراءات</th></tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemCount += item.quantity;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>
                <button onclick="updateItemQuantity(${item.id},1)">+</button>
                ${item.quantity}
                <button onclick="updateItemQuantity(${item.id},-1)">-</button>
            </td>
            <td>${item.note || ''}</td>
            <td>${itemTotal.toFixed(2)}</td>
            <td><button onclick="removeFromCart(${item.id})">إزالة</button></td>
        `;
        tbody.appendChild(row);
    });

    cartListContainer.appendChild(table);
    modalCartTotalElement.textContent = total.toFixed(2);
    modalCartCount.textContent = `(${itemCount})`;
    floatingCartCount.textContent = itemCount;
    modalCheckoutBtn.style.display = 'block';
}

function toggleCartModal() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
}

// ================= Checkout =================
function goToCheckout() {
    if (!tableNumber) { alert("يجب مسح رمز الطاولة أولاً."); return; }
    if (!cart.length) { alert("السلة فارغة."); return; }

    document.getElementById('cart-modal').style.display = 'none';
    document.getElementById('floating-cart-btn').style.display = 'none';
    document.getElementById('menu-section').style.display = 'none';

    const total = parseFloat(document.getElementById('modal-cart-total').textContent);
    document.getElementById('payment-amount').textContent = total.toFixed(2);
    document.getElementById('checkout-page').style.display = 'block';
}

function processPayment() {
    if (!cart.length) { alert("السلة فارغة."); return; }

    const total = parseFloat(document.getElementById('payment-amount').textContent);
    const paymentMethod = document.getElementById('payment-method').value;

    const newOrder = {
        tableNumber,
        items: JSON.parse(JSON.stringify(cart)),
        paymentMethod,
        total,
        status: 'new',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('orders').push(newOrder)
        .then(() => {
            cart = [];
            updateCartDisplay();
            document.getElementById('checkout-page').style.display = 'none';
            displayConfirmation(newOrder);
        })
        .catch(err => {
            console.error(err);
            alert("فشل إرسال الطلب.");
        });
}

function displayConfirmation(order) {
    document.getElementById('confirmed-table-num').textContent = order.tableNumber;
    document.getElementById('confirmed-total-amount').textContent = order.total.toFixed(2);

    const ul = document.getElementById('confirmed-order-details');
    ul.innerHTML = '';
    order.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} (x${item.quantity})${item.note ? ' - ملاحظة: ' + item.note : ''} - السعر: ${(item.price * item.quantity).toFixed(2)} جنيه`;
        ul.appendChild(li);
    });

    document.getElementById('confirmation-page').style.display = 'block';
}
