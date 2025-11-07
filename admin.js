// ====================================
// 1. المتغيرات والدوال الأساسية
// ====================================

let menuItems = [];
let nextItemId = 1;
let allOrders = []; // لتخزين جميع الطلبات

document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    subscribeToOrdersUpdates(); 
    openTab(document.querySelector('.tab-btn.active'), 'menuContent'); // فتح تبويب المنيو افتراضياً
    loadTodayOrders(); // تحميل الطلبات لليوم افتراضياً
});

// دالة إدارة التبويبات (Tabs)
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";

    const tablinks = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tablinks.length; i++) tablinks[i].classList.remove("active");

    const tab = document.getElementById(tabName);
    if (tab) tab.style.display = "block";

    if (evt && evt.classList) evt.classList.add("active");

    if (tabName === 'ordersContent') filterOrders(); 
}

// ====================================
// 2. إدارة قائمة المنيو (CRUD)
// ====================================

function loadMenu() {
    db.ref('menu').on('value', snapshot => {
        menuItems = [];
        let maxId = 0;

        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const item = childSnapshot.val();
                menuItems.push({ ...item, docId: childSnapshot.key });
                if (item.id && item.id > maxId) maxId = item.id;
            });
        }

        nextItemId = maxId + 1;
        renderMenuTable();
    });
}

function renderMenuTable() {
    const menuListDiv = document.getElementById('menuList');
    menuListDiv.innerHTML = '';

    if (menuItems.length === 0) {
        menuListDiv.innerHTML = '<p style="text-align: center; padding: 20px;">لا يوجد عناصر.</p>';
        return;
    }

    menuItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'admin-grid item-row';

        const imageContent = item.image && item.image !== 'default.jpg'
            ? `<div class="item-image-cell"><img src="${item.image}" alt="${item.name}" style="max-height: 40px;"></div>`
            : 'N/A';

        row.innerHTML = `
            <div>${item.id || '-'}</div>
            <div>${item.name}</div>
            <div>${item.price ? item.price.toFixed(2) : 'N/A'}</div>
            <div>${translateCategory(item.category)}</div>
            ${imageContent} 
            <div>
                <button class="btn btn-secondary" style="padding: 5px 10px;" onclick="editMenuItem('${item.docId}')">تعديل</button>
                <button class="btn btn-danger" style="padding: 5px 10px;" onclick="deleteMenuItem('${item.docId}')">حذف</button>
            </div>
        `;
        menuListDiv.appendChild(row);
    });
}

function saveMenuItem(event) {
    event.preventDefault();

    const docIdInput = document.getElementById('itemDocId');
    const name = document.getElementById('itemName').value.trim();
    const imageInput = document.getElementById('itemImage');
    const image = imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0].name : 'default.jpg';
    const price = parseFloat(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const currentDocId = docIdInput.value || null;

    if (!name || isNaN(price) || price <= 0) {
        alert('يرجى ملء جميع الحقول بشكل صحيح (الاسم والسعر).');
        return;
    }

    const itemData = { name, image, price, category };

    if (currentDocId) {
        db.ref('menu/' + currentDocId).update(itemData)
            .then(() => { alert(`تم تعديل العنصر بنجاح: ${name}`); })
            .catch(error => { console.error("خطأ في تحديث العنصر: ", error); });
    } else {
        itemData.id = nextItemId;
        db.ref('menu').push(itemData)
            .then(() => { alert(`تم إضافة العنصر الجديد بنجاح: ${name}`); })
            .catch(error => { console.error("خطأ في إضافة العنصر: ", error); });
    }

    clearForm();
}

function editMenuItem(docId) {
    const item = menuItems.find(item => item.docId === docId);
    if (!item) return;

    document.getElementById('itemDocId').value = item.docId;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemCategory').value = item.category;
}

function deleteMenuItem(docId) {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        db.ref('menu/' + docId).remove()
            .then(() => { alert('تم حذف العنصر بنجاح.'); })
            .catch(error => { console.error("خطأ في حذف العنصر: ", error); });
    }
}

function clearForm() {
    document.getElementById('itemDocId').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemCategory').value = 'drinks';
    document.getElementById('itemImage').value = '';
}

function translateCategory(category) {
    const translations = { drinks: 'مشروبات', food: 'مأكولات', desserts: 'حلويات' };
    return translations[category] || category;
}

// ====================================
// 3. إدارة الطلبات (Orders Tab)
// ====================================

function subscribeToOrdersUpdates() {
    db.ref('orders').on('value', snapshot => {
        allOrders = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const order = childSnapshot.val();
                allOrders.push({ ...order, docId: childSnapshot.key });
            });
        }
        filterOrders();
        console.log("✅ تم تحديث قائمة الطلبات لحظياً.");
    }, error => {
        console.error("خطأ في الاستماع للطلبات:", error);
    });
}

function renderOrders(ordersToDisplay) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    ordersTableBody.innerHTML = '';

    if (ordersToDisplay.length === 0) {
        ordersTableBody.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">لا توجد طلبات.</p>';
        return;
    }

    ordersToDisplay.sort((a, b) => b.timestamp - a.timestamp);

    ordersToDisplay.forEach(order => {
        const orderItemsSummary = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
        const orderDate = new Date(order.timestamp);
        const formattedTime = orderDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = orderDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

        let statusColor = 'blue';
        if (order.status === 'new') statusColor = 'red';
        else if (order.status === 'in_progress') statusColor = 'orange';
        else if (order.status === 'delivered') statusColor = 'green';

        const row = document.createElement('div');
        row.className = 'order-grid order-row';
        row.innerHTML = `
            <div><strong>${order.tableNumber || '-'}</strong></div>
            <div>${order.total ? order.total.toFixed(2) : '0.00'} جنيه</div>
            <div>${order.paymentMethod === 'cash' ? 'نقداً' : 'بطاقة'}</div>
            <div style="font-size: 13px;">${orderItemsSummary}</div>
            <div>${formattedDate} ${formattedTime}</div>
            <div>
                <span style="color: ${statusColor}; font-weight: bold;">${translateStatus(order.status)}</span>
                <button class="btn btn-secondary" style="padding: 3px 8px; margin-right: 5px;" onclick="updateOrderStatus('${order.docId}', '${order.status}')">تحديث</button>
            </div>
        `;
        ordersTableBody.appendChild(row);
    });
}

function translateStatus(status) {
    const translations = { new: 'جديد', in_progress: 'قيد التجهيز', delivered: 'تم التسليم' };
    return translations[status] || status;
}

function updateOrderStatus(docId, currentStatus) {
    let newStatus = '';
    if (currentStatus === 'new') newStatus = 'in_progress';
    else if (currentStatus === 'in_progress') newStatus = 'delivered';
    else newStatus = 'new';

    if (confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${translateStatus(newStatus)}"؟`)) {
        db.ref('orders/' + docId).update({ status: newStatus })
            .then(() => { alert(`تم تحديث حالة الطلب إلى ${translateStatus(newStatus)}.`); })
            .catch(error => { console.error("خطأ في تحديث الحالة:", error); });
    }
}

// ====================================
// 4. تصفية الطلبات حسب التاريخ والحالة
// ====================================

function filterOrders() {
    const startInput = document.getElementById('startDate')?.value;
    const endInput = document.getElementById('endDate')?.value;
    const statusFilter = document.getElementById('filterStatus').value;

    let startTimestamp = 0;
    let endTimestamp = Infinity;

    if (startInput) {
        const startDate = new Date(startInput);
        startDate.setHours(0, 0, 0, 0);
        startTimestamp = startDate.getTime();
    }

    if (endInput) {
        const endDate = new Date(endInput);
        endDate.setHours(23, 59, 59, 999);
        endTimestamp = endDate.getTime();
    }

    const filteredOrders = allOrders.filter(order => {
        if (!order.timestamp) return false;
        const inDateRange = order.timestamp >= startTimestamp && order.timestamp <= endTimestamp;
        const statusMatch = statusFilter === 'all' || order.status === statusFilter;
        return inDateRange && statusMatch;
    });

    renderOrders(filteredOrders);
}

function loadTodayOrders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');

    if (startInput) startInput.value = todayISO;
    if (endInput) endInput.value = todayISO;

    filterOrders();
}
