// ====================================
// 1. البيانات والثوابت
// ====================================

const menuProducts = [
    { id: 1, name: 'قهوة مثلجة', price: 45.00, category: 'drinks', image: 'Items/Coffee.png' },
    { id: 2, name: 'ساندويتش دجاج', price: 80.00, category: 'food', image: 'Items/Load.jpg' },
    { id: 3, name: 'كيكة الشوكولاتة', price: 60.00, category: 'desserts', image: 'Items/Load.jpg' },
    { id: 4, name: 'عصير برتقال طازج', price: 35.00, category: 'drinks', image: 'Items/Load.jpg' },
    { id: 5, name: 'برجر لحم', price: 120.00, category: 'food', image: 'Items/Load.jpg' },
    { id: 6, name: 'تيراميسو', price: 70.00, category: 'desserts', image: 'Items/Load.jpg' },
    { id: 7, name: 'لاتيه ساخن', price: 40.00, category: 'drinks', image: 'Items/Load.jpg' },
    { id: 8, name: 'بيتزا مارجريتا', price: 95.00, category: 'food', image: 'Items/Load.jpg' },
    { id: 9, name: 'كابوتشينو', price: 42.00, category: 'drinks', image: 'Items/Load.jpg' },
    { id: 10, name: 'سلطة سيزر', price: 75.00, category: 'food', image: 'Items/Load.jpg' },
];

let cart = []; 
let tableNumber = null; 
let html5QrCode = null; 

function initializeApp() {
    displayMenuItems(); 
}

document.addEventListener('DOMContentLoaded', initializeApp); 

// ====================================
// 2. إدارة QR Code ورقم الطاولة
// ====================================

function startQrScanner() {
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
        facingMode: "environment" 
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess, 
        onScanError 
    ).catch(err => {
        alert("⚠️ لا يمكن الوصول إلى الكاميرا. تأكد من صلاحيات المتصفح والتشغيل على خادم.");
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
        // لا حاجة لإظهار #cart-section القديم
        
    } else {
        alert("رمز QR غير صالح.");
    }
}

function onScanError(errorMessage) {
    // ...
}

// ====================================
// 3. إدارة المنيو والفلترة
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
    // تفعيل الزر النشط
    if(event.target) {
        event.target.classList.add('active');
    }
    displayMenuItems(category);
}

// ====================================
// 4. إدارة السلة والأيقونة المنبثقة
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

function toggleCartModal() {
    const modal = document.getElementById('cart-modal');
    // فتح أو إغلاق الشاشة
    if (modal.style.display === "block") {
        modal.style.display = "none";
    } else {
        updateCartDisplay(); // تحديث محتوى الـ Modal عند فتحه
        modal.style.display = "block";
    }
}


function updateCartDisplay() {
    // العناصر في الـ Modal
    const cartListContainer = document.getElementById('modal-cart-list'); 
    const modalCartTotalElement = document.getElementById('modal-cart-total');
    const modalCheckoutBtn = document.getElementById('modal-checkout-btn');
    const modalCartCount = document.getElementById('modal-cart-count'); 
    
    // العناصر في الزر العائم
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const floatingCartCount = document.getElementById('floating-cart-count');

    let total = 0;
    let itemCount = 0;

    cartListContainer.innerHTML = ''; 

    if (cart.length === 0) {
        cartListContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">سلة طلباتك فارغة حاليًا.</p>';
        floatingCartBtn.style.display = 'none'; // إخفاء الزر العائم
        modalCheckoutBtn.style.display = 'none';
        itemCount = 0;
    } else {
        // إنشاء الجدول الاحترافي
        const table = document.createElement('table');
        table.className = 'cart-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>الصنف</th>
                    <th>السعر</th>
                    <th>الكمية</th>
                    <th>المجموع</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tableBody = table.querySelector('tbody');

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            itemCount += item.quantity;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="cart-item-name">${item.name}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="updateItemQuantity(${item.id}, 1)">+</button>
                    <span style="margin: 0 5px;">${item.quantity}</span>
                    <button class="btn btn-secondary" onclick="updateItemQuantity(${item.id}, -1)">-</button>
                </td>
                <td>${itemTotal.toFixed(2)} جنيه</td>
                <td>
                    <button class="btn btn-remove" onclick="removeFromCart(${item.id})">إزالة</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        cartListContainer.appendChild(table); 
        floatingCartBtn.style.display = 'flex'; // إظهار الزر العائم
        modalCheckoutBtn.style.display = 'block';
    }

    // تحديث الإجماليات في الـ Modal والزر العائم
    modalCartTotalElement.textContent = total.toFixed(2);
    
    // تحديث الـ Badges (الأرقام)
    floatingCartCount.textContent = itemCount;
    modalCartCount.textContent = `(${itemCount})`;

    // تحديث العناصر المخفية المستخدمة في goToCheckout
    document.getElementById('cart-total').textContent = total.toFixed(2);
    document.getElementById('cart-count').textContent = `(${itemCount})`;
}

// ====================================
// 5. إدارة الدفع والطلب
// ====================================

function goToCheckout() {
    if (!tableNumber) {
        alert("يجب مسح رمز الطاولة أولاً لإكمال الطلب.");
        return;
    }

    // إخفاء الـ Modal والأزرار
    document.getElementById('cart-modal').style.display = 'none'; 
    document.getElementById('floating-cart-btn').style.display = 'none';
    document.getElementById('menu-section').style.display = 'none';
    
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
    // إخفاء الزر العائم بعد تأكيد الطلب
    document.getElementById('floating-cart-btn').style.display = 'none';
    updateCartDisplay(); 
}