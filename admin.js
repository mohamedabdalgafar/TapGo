// ====================================
// 1. إدارة معلومات الكافيه
// ====================================

/**
 * حفظ اسم وعنوان الكافيه في التخزين المحلي.
 */
function saveCafeInfo() {
    const name = document.getElementById('cafe-name').value;
    const address = document.getElementById('cafe-address').value;
    
    localStorage.setItem('cafeName', name);
    localStorage.setItem('cafeAddress', address);

    const infoStatus = document.getElementById('info-status');
    infoStatus.textContent = '✅ تم حفظ المعلومات بنجاح!';
    setTimeout(() => {
        infoStatus.textContent = '';
    }, 3000);
}

// ====================================
// 2. إدارة وعرض الطلبات
// ====================================

/**
 * يعيد عرض قائمة الطلبات بالكامل من التخزين المحلي.
 */
function renderOrders() {
    const ordersList = document.getElementById('admin-orders-list');
    ordersList.innerHTML = '';
    
    // جلب كل الطلبات من التخزين المحلي
    let allOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
    
    document.getElementById('pending-count').textContent = `(${allOrders.filter(o => o.status !== 'delivered').length})`;

    if (allOrders.length === 0) {
        ordersList.innerHTML = '<li style="text-align: center; color: #6c757d; padding: 10px;">لا توجد طلبات في القائمة.</li>';
        return;
    }

    allOrders.forEach(order => {
        // تحديد الفئة المناسبة لعرض حالة الطلب
        const orderStatusClass = `status-${order.status}`;
        const totalAmount = order.total.toFixed(2);
        const timestamp = new Date(order.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        let itemsHtml = '<ul>';
        order.items.forEach(item => {
            itemsHtml += `<li>${item.name} x${item.quantity}</li>`;
        });
        itemsHtml += '</ul>';

        const listItem = document.createElement('li');
        // يتم إضافة فئة حسب حالة الطلب لتحديد لون الشريط الجانبي
        listItem.className = `admin-order-item order-${order.status}`;
        listItem.innerHTML = `
            <h4>طلب جديد من طاولة رقم ${order.tableNumber} (الساعة: ${timestamp})</h4>
            <p><strong>الإجمالي:</strong> ${totalAmount} جنيه</p>
            <p><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'cash' ? 'نقداً عند الاستلام' : 'دفع إلكتروني (تم الدفع)'}</p>
            
            <p style="margin-top: 10px;"><strong>الحالة الحالية:</strong> <span class="order-status-btn ${orderStatusClass}">${getStatusText(order.status)}</span></p>
            
            <p><strong>تفاصيل الطلب:</strong></p>
            ${itemsHtml}
            
            <div style="margin-top: 15px;">
                ${order.status !== 'preparing' ? `<button class="order-status-btn status-preparing" onclick="updateOrderStatus(${order.id}, 'preparing')">بدء التحضير</button>` : ''}
                ${order.status !== 'ready' ? `<button class="order-status-btn status-ready" onclick="updateOrderStatus(${order.id}, 'ready')">جاهز للتسليم</button>` : ''}
                ${order.status !== 'delivered' ? `<button class="order-status-btn status-delivered" onclick="updateOrderStatus(${order.id}, 'delivered')">تم التسليم</button>` : ''}
            </div>
        `;
        ordersList.appendChild(listItem);
    });
}

/**
 * تحويل حالة الطلب من قيمة برمجية إلى نص عربي.
 * @param {string} status - حالة الطلب
 * @returns {string} النص العربي للحالة
 */
function getStatusText(status) {
    switch(status) {
        case 'new': return 'جديد';
        case 'preparing': return 'جاري التحضير';
        case 'ready': return 'جاهز للتسليم';
        case 'delivered': return 'تم التسليم';
        default: return 'غير معروف';
    }
}

/**
 * تحديث حالة طلب محدد وإعادة عرض القائمة.
 * @param {number} orderId - معرف الطلب
 * @param {string} newStatus - الحالة الجديدة ('preparing', 'ready', 'delivered')
 */
function updateOrderStatus(orderId, newStatus) {
    let allOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
    const orderIndex = allOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        allOrders[orderIndex].status = newStatus;
        localStorage.setItem('adminOrders', JSON.stringify(allOrders));
        renderOrders(); // إعادة عرض القائمة لتحديث الحالات
        console.log(`تم تحديث حالة الطلب رقم ${orderId} إلى: ${newStatus}`);
    }
}

// ====================================
// 3. التحميل الأولي والتحديث التلقائي
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    // تحميل معلومات الكافيه المحفوظة
    document.getElementById('cafe-name').value = localStorage.getItem('cafeName') || 'TapGo Café';
    document.getElementById('cafe-address').value = localStorage.getItem('cafeAddress') || 'شارع الجامعة، مبنى رقم 5';
    
    // عرض الطلبات عند التحميل
    renderOrders();

    // تحديث الطلبات كل 5 ثوانٍ لجلب الطلبات الجديدة تلقائيًا (محاكاة)
    // في تطبيق حقيقي يتم استخدام WebSockets.
    setInterval(renderOrders, 5000); 
});