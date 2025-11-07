// ====================================
// 1. البيانات والثوابت
// ====================================

let cart = []; 
let tableNumber = null; 
let html5QrCode = null; 
let menuProducts = []; // قائمة المنيو الديناميكية

function initializeApp() {
    subscribeToMenuUpdates();
}

document.addEventListener('DOMContentLoaded', initializeApp); 

// ====================================
// 2. إدارة QR Code ورقم الطاولة
// ====================================

function startQrScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        alert('⚠️ خطأ: مكتبة مسح QR Code غير متوفرة. تأكد من وجود ملف html5-qrcode.min.js.');
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
    // نفترض أن رقم الطاولة هو أي رقم في الرمز الممسوح (مثل: TapGo-Table-15)
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
        // لا نظهر زر السلة العائم إلا إذا كانت هناك عناصر في السلة، لكن يجب أن تكون قابلة للعرض
        // document.getElementById('floating-cart-btn').style.display = 'flex'; 
    } else {
        alert("رمز QR غير صالح.");
    }
}

function onScanError(errorMessage) {
    // يمكن تركها فارغة
}

// ====================================
// 3. دالة الاستماع اللحظي للمنيو (Realtime Database)
// ====================================

function subscribeToMenuUpdates() {
    document.getElementById('loading-menu').style.display = 'block';
    // الاستماع إلى التغييرات في عقدة 'menu'
    db.ref('menu').on('value', (snapshot) => {
        menuProducts = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const item = childSnapshot.val();
                menuProducts.push({ 
                    ...item,
                    docId: childSnapshot.key // حفظ مفتاح RTDB كـ docId
                });
            });
        }
        
        document.getElementById('loading-menu').style.display = 'none';
        displayMenuItems(); 
        console.log("✅ تم تحديث المنيو لحظياً من Realtime Database.");

    }, (error) => {
        document.getElementById('loading-menu').textContent = 'فشل تحميل المنيو. تحقق من الاتصال وقواعد Firebase.';
        console.error("خطأ في الاستماع اللحظي للمنيو:", error);
    });
}

function displayMenuItems(category = 'all') {
    const menuItemsContainer = document.getElementById('menu-items');
    menuItemsContainer.innerHTML = ''; 
    
    if (menuProducts.length === 0) {
        menuItemsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">قائمة الطعام فارغة حالياً. يرجى إضافتها من لوحة الإدارة.</p>';
        return;
    }

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

function filterMenu(category, event) {
    document.querySelectorAll('.menu-categories .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if(event && event.target) {
        event.target.classList.add('active');
    }
    displayMenuItems(category);
}

// ====================================
// 4. إدارة السلة والدفع (إرسال إلى RTDB)
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
    if (modal.style.display === "block") {
        modal.style.display = "none";
    } else {
        updateCartDisplay(); 
        modal.style.display = "block";
    }
}

function updateCartDisplay() {
    const cartListContainer = document.getElementById('modal-cart-list'); 
    const modalCartTotalElement = document.getElementById('modal-cart-total');
    const modalCheckoutBtn = document.getElementById('modal-checkout-btn');
    const modalCartCount = document.getElementById('modal-cart-count'); 
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const floatingCartCount = document.getElementById('floating-cart-count');

    let total = 0;
    let itemCount = 0;
    cartListContainer.innerHTML = ''; 

    if (cart.length === 0) {
        cartListContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">سلة طلباتك فارغة حاليًا.</p>';
        floatingCartBtn.style.display = 'none'; 
        modalCheckoutBtn.style.display = 'none';
        itemCount = 0;
    } else {
        const table = document.createElement('table');
        table.className = 'cart-table';
        table.innerHTML = `
            <thead><tr><th>الصنف</th><th>السعر</th><th>الكمية</th><th>المجموع</th><th>الإجراءات</th></tr></thead>
            <tbody></tbody>
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
                <td><button class="btn btn-remove" onclick="removeFromCart(${item.id})">إزالة</button></td>
            `;
            tableBody.appendChild(row);
        });

        cartListContainer.appendChild(table); 
        floatingCartBtn.style.display = 'flex'; 
        modalCheckoutBtn.style.display = 'block';
    }

    modalCartTotalElement.textContent = total.toFixed(2);
    floatingCartCount.textContent = itemCount;
    modalCartCount.textContent = `(${itemCount})`;

    document.getElementById('cart-total').textContent = total.toFixed(2);
    document.getElementById('cart-count').textContent = `(${itemCount})`;
}

function goToCheckout() {
    if (!tableNumber) {
        alert("يجب مسح رمز الطاولة أولاً لإكمال الطلب.");
        return;
    }
    if (cart.length === 0) {
        alert("السلة فارغة، يرجى إضافة عناصر أولاً.");
        return;
    }


    document.getElementById('cart-modal').style.display = 'none'; 
    document.getElementById('floating-cart-btn').style.display = 'none';
    document.getElementById('menu-section').style.display = 'none';
    
    const total = document.getElementById('cart-total').textContent;
    document.getElementById('payment-amount').textContent = total;
    document.getElementById('checkout-page').style.display = 'block';
}

function processPayment() {
    if (cart.length === 0) {
        alert("السلة فارغة، لا يمكن إرسال طلب.");
        return;
    }
    const total = parseFloat(document.getElementById('payment-amount').textContent);
    const paymentMethod = document.getElementById('payment-method').value;

    const newOrder = {
        tableNumber: tableNumber,
        items: JSON.parse(JSON.stringify(cart)), 
        paymentMethod: paymentMethod,
        total: total,
        status: 'new', 
        timestamp: firebase.database.ServerValue.TIMESTAMP // تعيين وقت الخادم
    };
    
    // إرسال الطلب إلى عقدة 'orders'
    db.ref('orders').push(newOrder)
        .then(() => {
            console.log("تم إرسال الطلب بنجاح إلى قاعدة البيانات!");
            document.getElementById('checkout-page').style.display = 'none';
            displayConfirmation(newOrder);
            cart = [];
            // تحديث عرض السلة لضمان اختفاء الزر العائم
            updateCartDisplay(); 
        })
        .catch((error) => {
            console.error("خطأ في إرسال الطلب:", error);
            alert("فشل إرسال الطلب. تحقق من اتصالك وقواعد Firebase.");
        });
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
    // لا يجب إخفاء الزر العائم هنا لأننا فعلنا ذلك في processPayment()
}