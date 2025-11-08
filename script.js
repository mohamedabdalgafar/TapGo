let tableNumber = null;
let cart = [];
let allMenuItems = [];
let newOrderSound = new Audio('https://www.soundjay.com/button/beep-07.mp3'); // iPhone-style alert

// ======================================
// QR Scanner
// ======================================
function startQrScanner() {
    document.getElementById('qr-reader').style.display = 'block';
    const qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
            // Extract only numeric characters
            const numericTable = qrCodeMessage.match(/\d+/);
            if (numericTable) {
                tableNumber = numericTable[0];
                document.getElementById('table-display').textContent = `رقم الطاولة: ${tableNumber}`;
                document.getElementById('table-display').style.display = 'block';
                document.getElementById('table-number-section').style.display = 'none';
                document.getElementById('menu-section').style.display = 'block';
                qrScanner.stop();
            } else {
                alert('رمز الطاولة لا يحتوي على رقم صالح.');
            }
        },
        errorMessage => console.warn(errorMessage)
    ).catch(err => console.error(err));
}



// ======================================
// Load Menu
// ======================================
function loadMenu() {
    db.ref('menu').once('value').then(snapshot => {
        allMenuItems = [];
        snapshot.forEach(child => {
            let item = child.val();
            item.key = child.key;
            allMenuItems.push(item);
        });
        displayMenu(allMenuItems);
    });
}

function displayMenu(items) {
    const menuContainer = document.getElementById('menu-items');
    menuContainer.innerHTML = '';
    if (items.length === 0) {
        menuContainer.innerHTML = '<p style="text-align:center;">لا يوجد عناصر حالياً</p>';
        return;
    }
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('menu-item');
        itemDiv.innerHTML = `
            <img src="${item.image || 'placeholder.png'}" alt="${item.name}">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p>${item.price.toFixed(2)} جنيه</p>
                <button class="btn btn-primary" onclick="addToCart('${item.key}')">أضف للسلة</button>
            </div>
        `;
        menuContainer.appendChild(itemDiv);
    });
}

function filterMenu(category, e) {
    document.querySelectorAll('.menu-categories button').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    if (category === 'all') {
        displayMenu(allMenuItems);
    } else {
        displayMenu(allMenuItems.filter(i => i.category === category));
    }
}

// ======================================
// Cart Management
// ======================================
function addToCart(itemKey) {
    const item = allMenuItems.find(i => i.key === itemKey);
    if (!item) return;
    const existing = cart.find(i => i.key === itemKey);
    if (existing) existing.quantity++;
    else cart.push({...item, quantity: 1, note: ''});
    updateCartUI();
    document.getElementById('floating-cart-btn').style.display = 'flex';
}

function updateCartUI() {
    const cartList = document.getElementById('modal-cart-list');
    cartList.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.marginBottom = '8px';
        row.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <input type="text" placeholder="ملاحظة" value="${item.note}" style="width:50%" oninput="updateNote(${index}, this.value)">
            <button onclick="removeFromCart(${index})">حذف</button>
        `;
        cartList.appendChild(row);
    });
    document.getElementById('modal-cart-total').textContent = total.toFixed(2);
    document.getElementById('modal-cart-count').textContent = cart.length;
    document.getElementById('floating-cart-count').textContent = cart.length;
    document.getElementById('modal-checkout-btn').style.display = cart.length > 0 ? 'block' : 'none';
}

function updateNote(index, value) {
    cart[index].note = value;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function toggleCartModal() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

// ======================================
// Checkout & Order Submission
// ======================================
function goToCheckout() {
    toggleCartModal();
    document.getElementById('menu-section').style.display = 'none';
    document.getElementById('checkout-page').style.display = 'block';
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    document.getElementById('payment-amount').textContent = total.toFixed(2);
}

function generateShortOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letters = chars.charAt(Math.floor(Math.random() * chars.length)) +
                    chars.charAt(Math.floor(Math.random() * chars.length));
    const numbers = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${letters}${numbers}`;
}

function processPayment() {
    if (!tableNumber) return alert('رقم الطاولة غير محدد!');
    if (cart.length === 0) return alert('السلة فارغة!');

    const orderData = {
        tableNumber,
        items: cart,
        total: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
        paymentMethod: document.getElementById('payment-method').value,
        timestamp: Date.now(),
        orderId: generateShortOrderId(),
        status: 'new'
    };

    db.ref('orders').push(orderData)
      .then(() => {
          showConfirmation(orderData);
          cart = [];
          updateCartUI();
      })
      .catch(err => console.error(err));
}

// ======================================
// Confirmation Page
// ======================================
function showConfirmation(orderData) {
    document.getElementById('confirmed-table-num').textContent = orderData.tableNumber;
    document.getElementById('confirmed-total-amount').textContent = orderData.total.toFixed(2);

    const orderIdDisplay = document.getElementById('confirmed-order-id');
    if (orderIdDisplay) {
        orderIdDisplay.textContent = orderData.orderId;
        orderIdDisplay.style.fontWeight = 'bold';
        orderIdDisplay.style.color = '#ff5722';
    }

    const detailsUl = document.getElementById('confirmed-order-details');
    detailsUl.innerHTML = '';
    orderData.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} x${item.quantity}${item.note ? ' (ملاحظة: '+item.note+')' : ''}`;
        detailsUl.appendChild(li);
    });

    document.getElementById('confirmation-page').style.display = 'block';
    document.getElementById('checkout-page').style.display = 'none';
}

// ======================================
// Order Status Check
// ======================================
function checkOrderStatus() {
    const orderId = document.getElementById('status-order-id').value.trim();
    if (!orderId) return;

    db.ref('orders').orderByChild('orderId').equalTo(orderId).once('value').then(snapshot => {
        const resultDiv = document.getElementById('order-status-result');
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const order = child.val();
                resultDiv.innerHTML = `
                    <p>الطلب: ${orderId}</p>
                    <p>الحالة: ${order.status || 'قيد التجهيز'}</p>
                    <p>إجمالي الفاتورة: ${order.total.toFixed(2)} جنيه</p>
                `;
            });
        } else {
            document.getElementById('order-status-result').textContent = 'لم يتم العثور على الطلب.';
        }
    });
}


// ======================================
// Real-time New Order Notification
// ======================================
db.ref('orders').on('child_added', snapshot => {
    if (!tableNumber) return;
    newOrderSound.play(); // play iPhone-style sound on any new order
});

// ======================================
// Initialize Menu
// ======================================
window.onload = () => {
    loadMenu();
};

