// ====================================
// 1. البيانات والثوابت
// ====================================

const menuProducts = [
    { id: 1, name: 'قهوة مثلجة', price: 45.00, category: 'drinks', image: 'iced_coffee.jpg' },
    { id: 2, name: 'ساندويتش دجاج', price: 80.00, category: 'food', image: 'chicken_sandwich.jpg' },
    { id: 3, name: 'كيكة الشوكولاتة', price: 60.00, category: 'desserts', image: 'chocolate_cake.jpg' },
    { id: 4, name: 'عصير برتقال طازج', price: 35.00, category: 'drinks', image: 'orange_juice.jpg' },
    { id: 5, name: 'برجر لحم', price: 120.00, category: 'food', image: 'beef_burger.jpg' },
    { id: 6, name: 'تيراميسو', price: 70.00, category: 'desserts', image: 'tiramisu.jpg' },
    { id: 7, name: 'لاتيه ساخن', price: 40.00, category: 'drinks', image: 'latte.jpg' },
    { id: 8, name: 'بيتزا مارجريتا', price: 95.00, category: 'food', image: 'pizza.jpg' },
    { id: 9, name: 'كابوتشينو', price: 42.00, category: 'drinks', image: 'cappuccino.jpg' },
    { id: 10, name: 'سلطة سيزر', price: 75.00, category: 'food', image: 'caesar_salad.jpg' },
];

let cart = []; 
let tableNumber = null; 
let html5QrCode = null; 

// ==========================================================
// 2. دالة التهيئة الرئيسية (تُنفذ بعد تحميل HTML والمكتبات)
// ==========================================================

function initializeApp() {
    displayMenuItems(); 
}

// البدء عند تحميل محتوى DOM
document.addEventListener('DOMContentLoaded', initializeApp); 

// ====================================
// 3. إدارة QR Code ورقم الطاولة
// ====================================

function startQrScanner() {
    // هذا الفحص سيمنع المشكلة، لكن وجودها يعني أنك لم ترفع html5-qrcode.min.js
    if (typeof Html5Qrcode === 'undefined') {
        alert('⚠️ خطأ: مكتبة مسح QR Code غير متوفرة. يرجى التأكد من رفع ملف html5-qrcode.min.js.');
        return;
    }
    
    document.getElementById('start-scan-btn').style.display = 'none';
    document.getElementById('qr-reader').style.display = 'block';

    html5QrCode = new Html5Qrcode("qr-reader"); 
    
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, 
        // تفضيل الكاميرا الخلفية للجوال
        facingMode: "environment" 
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess, 
        onScanError 
    ).catch(err => {
        alert("⚠️ لا يمكن الوصول إلى الكاميرا. تأكد من صلاحيات المتصفح والتشغيل على خادم (localhost/HTTPS).");
        document.getElementById('start-scan-btn').style.display = 'block';
        document.getElementById('qr-reader').style.display = 'none';
        console.error("خطأ في بدء الماسح الضوئي:", err);
    });
}

function onScanSuccess(decodedText) {
    const tableIdentifier = decodedText.trim(); 
    const numMatch = tableIdentifier.match(/\d+/); 

    if (numMatch && html5QrCode) {
        tableNumber = numMatch[0];
        
        html5QrCode.stop().then(() => {
            console.log(`تم إيقاف الماسح الضوئي. رقم الطاولة: ${tableNumber}`);
        }).catch(err => {
            console.error("فشل في إيقاف الماسح الضوئي:", err);
        });

        document.getElementById('qr-reader').style.display = 'none';
        document.getElementById('table-number-section').style.display = 'none';
        
        document.getElementById('table-display').textContent = `✅ الطلب للطاولة رقم: ${tableNumber}`;
        document.getElementById('table-display').style.display = 'block';
        
        document.getElementById('menu-section').style.display = 'block';
        document.getElementById('cart-section').style.display = 'block';
        
    } else {
        alert("رمز QR غير صالح.");
    }
}

function onScanError(errorMessage) {
    // ...
}

// ====================================
// 4. إدارة المنيو والفلترة
// ====================================

function displayMenuItems(category = 'all') {
    const menuItemsContainer = document.getElementById('menu-items');
    menuItemsContainer.innerHTML = ''; 

    const filteredProducts = category === 'all'
        ? menuProducts
        : menuProducts.filter(item => item.category === category);

    filteredProducts.forEach(product => {
        const itemHtml = `
            <div class="menu-item" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-category="${product.category}">
                <img src="${product.image || 'default.jpg'}" alt="${product.name}">
                <div class="item-details">
                    <h3>${product.name}</h3>
                    <p class="price">${product.price.toFixed(2)} جنيه</p>
                    <button onclick="addToCart(this)" class="btn">أضف للسلة</button>
                </div>
            </div>
        `;
        menuItemsContainer.innerHTML += itemHtml;
    });
}

function filterMenu(category) {
    document.querySelectorAll('.menu-categories .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // event.target.classList.add('active'); // إعادة تفعيلها عبر حدث
    displayMenuItems(category);
}

// ====================================
// 5. إدارة السلة (Cart)
// ====================================

function addToCart(button) {
    const itemElement = button.closest('.menu-item');
    const id = parseInt(itemElement.getAttribute('data-id'));
    const name = itemElement.getAttribute('data-name');
    const price = parseFloat(itemElement.getAttribute('data-price'));

    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }

    updateCartDisplay();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartDisplay();
}

function updateItemQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            updateCartDisplay();
        }
    }
}


function updateCartDisplay() {
    const cartList = document.getElementById('cart-list');
    const cartTotalElement = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-btn');
    const cartCount = document.getElementById('cart-count');
    let total = 0;
    let itemCount = 0;

    cartList.innerHTML = '';

    if (cart.length === 0) {
        cartList.innerHTML = '<li style="text-align: center; color: #6c757d;">السلة فارغة</li>';
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemCount += item.quantity;
        
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div class="cart-item-info">
                ${item.name} (x${item.quantity})
                <br>
                <span>${itemTotal.toFixed(2)} جنيه</span>
            </div>
            <div class="cart-item-actions">
                <button onclick="updateItemQuantity(${item.id}, 1)">+</button>
                <button onclick="updateItemQuantity(${item.id}, -1)">-</button>
                <button onclick="removeFromCart(${item.id})">إزالة</button>
            </div>
        `;
        cartList.appendChild(listItem);
    });

    cartTotalElement.textContent = total.toFixed(2);
    cartCount.textContent = `(${itemCount})`;

    checkoutButton.style.display = cart.length > 0 ? 'block' : 'none';
}

// ====================================
// 6. إدارة الدفع والطلب
// ====================================

function goToCheckout() {
    if (!tableNumber) {
        alert("يجب مسح رمز الطاولة أولاً لإكمال الطلب.");
        return;
    }

    document.getElementById('menu-section').style.display = 'none';
    document.getElementById('cart-section').style.display = 'none';
    
    const total = document.getElementById('cart-total').textContent;
    document.getElementById('payment-amount').textContent = total;
    document.getElementById('checkout-page').style.display = 'block';
}

function processPayment() {
    const total = parseFloat(document.getElementById('payment-amount').textContent);
    const paymentMethod = document.getElementById('payment-method').value;

    const newOrder = {
        id: Date.now(),
        tableNumber: tableNumber,
        items: JSON.parse(JSON.stringify(cart)), 
        paymentMethod: paymentMethod,
        total: total,
        status: 'new', 
        timestamp: new Date().toISOString()
    };
    
    // إرسال الطلب إلى لوحة الإدارة عبر localStorage
    let allOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
    allOrders.unshift(newOrder); 
    localStorage.setItem('adminOrders', JSON.stringify(allOrders));

    document.getElementById('checkout-page').style.display = 'none';
    displayConfirmation(newOrder);
    cart = []; 
}

function displayConfirmation(finalOrder) {
    document.getElementById('confirmed-table-num').textContent = finalOrder.tableNumber;
    
    const orderDetailsList = document.getElementById('confirmed-order-details');
    orderDetailsList.innerHTML = '';
    
    finalOrder.items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `${item.name} (x${item.quantity}) - السعر: ${(item.price * item.quantity).toFixed(2)} جنيه`;
        orderDetailsList.appendChild(listItem);
    });
    
    document.getElementById('confirmation-page').style.display = 'block';
    updateCartDisplay(); 
}