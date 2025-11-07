// ====================================
// 1. المتغيرات والدوال الأساسية
// ====================================

let menuItems = [];
let nextItemId = 1;
let allOrders = []; // لتخزين جميع الطلبات التي تم جلبها

document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    // ✅ تحميل طلبات اليوم بشكل افتراضي عند فتح صفحة الطلبات
    subscribeToOrdersUpdates(); 
    openTab(null, 'menuTab'); // فتح تبويب المنيو افتراضياً
});

// دالة إدارة التبويبات (Tabs)
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    if (evt) {
        evt.currentTarget.classList.add("active");
    } else {
        // إذا تم الاستدعاء دون حدث (عند تحميل الصفحة)
        document.querySelector(`.tab-btn[onclick="openTab(event, '${tabName}')"]`).classList.add("active");
    }
    
    // ✅ إذا انتقلنا إلى تبويب الطلبات، يجب التأكد من عرض الطلبات الأخيرة
    if (tabName === 'ordersTab' && allOrders.length === 0) {
        loadTodayOrders();
    }
}

// ====================================
// 2. إدارة قائمة المنيو (كما كانت سابقاً)
// ====================================

function loadMenu() {
    db.ref('menu').on('value', (snapshot) => {
        menuItems = [];
        let maxId = 0;
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const item = childSnapshot.val();
                menuItems.push({ 
                    ...item,
                    docId: childSnapshot.key
                });
                if (item.id && item.id > maxId) {
                    maxId = item.id;
                }
            });
        }
        
        nextItemId = maxId + 1; 
        renderMenuTable();
    });
}

// داخل ملف admin.js

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
        
        // تجهيز عرض الصورة: إذا كان الرابط موجودًا، اعرض صورة. وإلا، اعرض "N/A"
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

function saveMenuItem() {
    const docIdInput = document.getElementById('docId');
    const name = document.getElementById('itemName').value.trim();
    // ✅ استخدام حقل النص/الرابط للصورة
    const image = document.getElementById('itemImage').value.trim() || 'default.jpg'; 
    const price = parseFloat(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const currentDocId = docIdInput.value || null;

    if (!name || isNaN(price) || price <= 0) {
        alert('يرجى ملء جميع الحقول بشكل صحيح (الاسم والسعر).');
        return;
    }

    const itemData = {
        name: name,
        image: image,
        price: price,
        category: category
    };
    
    if (currentDocId) {
        db.ref('menu/' + currentDocId).update(itemData)
            .then(() => { alert(`تم تعديل العنصر بنجاح: ${name}`); })
            .catch((error) => { console.error("خطأ في تحديث العنصر: ", error); });
    } else {
        itemData.id = nextItemId; 
        db.ref('menu').push(itemData)
            .then(() => { alert(`تم إضافة العنصر الجديد بنجاح: ${name}`); })
            .catch((error) => { console.error("خطأ في إضافة العنصر: ", error); });
    }

    clearForm();
}

function editMenuItem(docId) {
    const item = menuItems.find(item => item.docId === docId);
    if (!item) return;

    document.getElementById('docId').value = item.docId; 
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemImage').value = item.image || ''; 
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('saveItemBtn').textContent = 'تعديل العنصر';
    document.getElementById('saveItemBtn').classList.remove('btn-primary');
    document.getElementById('saveItemBtn').classList.add('btn-success');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteMenuItem(docId) {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        db.ref('menu/' + docId).remove()
            .then(() => { alert('تم حذف العنصر بنجاح.'); })
            .catch((error) => { console.error("خطأ في حذف العنصر: ", error); });
    }
}

function clearForm() {
    document.getElementById('docId').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemImage').value = ''; 
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemCategory').value = 'drinks';
    document.getElementById('saveItemBtn').textContent = 'حفظ العنصر';
    document.getElementById('saveItemBtn').classList.remove('btn-success');
    document.getElementById('saveItemBtn').classList.add('btn-primary');
}

function translateCategory(category) {
    const translations = { drinks: 'مشروبات', food: 'مأكولات', desserts: 'حلويات' };
    return translations[category] || category;
}

// ====================================
// 3. إدارة الطلبات الواردة (Orders Tab)
// ====================================

// دالة الاستماع لكافة الطلبات
function subscribeToOrdersUpdates() {
    db.ref('orders').on('value', (snapshot) => {
        allOrders = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                allOrders.push({
                    ...order,
                    docId: childSnapshot.key,
                });
            });
        }
        // عرض الطلبات المفلترة (افتراضياً طلبات اليوم عند الانتقال للتاب)
        filterOrders(false); 
        console.log("✅ تم تحديث قائمة الطلبات لحظياً.");
    }, (error) => {
        console.error("خطأ في الاستماع للطلبات:", error);
    });
}

function renderOrders(ordersToDisplay) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    ordersTableBody.innerHTML = '';

    if (ordersToDisplay.length === 0) {
        ordersTableBody.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">لا توجد طلبات في الفترة المحددة.</p>';
        return;
    }
    
    // ترتيب الطلبات من الأحدث إلى الأقدم
    ordersToDisplay.sort((a, b) => b.timestamp - a.timestamp);

    ordersToDisplay.forEach(order => {
        const orderItemsSummary = order.items.map(item => 
            `${item.name} (x${item.quantity})`
        ).join(', ');

        const orderDate = new Date(order.timestamp);
        const formattedTime = orderDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = orderDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
        
        const row = document.createElement('div');
        row.className = 'order-grid order-row';
        
        // لون الحالة (Status)
        let statusColor = 'blue';
        if (order.status === 'new') statusColor = 'red';
        else if (order.status === 'in_progress') statusColor = 'orange';
        else if (order.status === 'delivered') statusColor = 'green';


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
    const translations = {
        new: 'جديد',
        in_progress: 'قيد التجهيز',
        delivered: 'تم التسليم'
    };
    return translations[status] || status;
}

function updateOrderStatus(docId, currentStatus) {
    // منطق تحديث الحالة (يمكن توسيعه لاحقاً)
    let newStatus = '';
    if (currentStatus === 'new') {
        newStatus = 'in_progress';
    } else if (currentStatus === 'in_progress') {
        newStatus = 'delivered';
    } else {
        newStatus = 'new'; // للبدء من جديد
    }
    
    if (confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${translateStatus(newStatus)}"؟`)) {
        db.ref('orders/' + docId).update({ status: newStatus })
            .then(() => {
                alert(`تم تحديث حالة الطلب إلى ${translateStatus(newStatus)}.`);
            })
            .catch((error) => {
                console.error("خطأ في تحديث الحالة:", error);
            });
    }
}

// ====================================
// 4. مرشحات التاريخ للطلبات
// ====================================

function loadTodayOrders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // تحويل التواريخ إلى صيغة ISO لتعبئة حقول الإدخال
    const todayISO = today.toISOString().split('T')[0];
    const tomorrowISO = tomorrow.toISOString().split('T')[0];

    document.getElementById('startDate').value = todayISO;
    document.getElementById('endDate').value = todayISO; // اليوم فقط

    filterOrders(true);
}

function filterOrders(isTodayFilter = false) {
    let startDateValue = document.getElementById('startDate').value;
    let endDateValue = document.getElementById('endDate').value;
    
    if (!startDateValue && !endDateValue && !isTodayFilter) {
        // إذا لم يتم تحديد تواريخ، اعرض طلبات اليوم
        return loadTodayOrders();
    }
    
    let startTimestamp = 0;
    let endTimestamp = Infinity;

    // 1. تحديد بداية الفترة
    if (startDateValue) {
        const startDate = new Date(startDateValue);
        startDate.setHours(0, 0, 0, 0); // بدء اليوم
        startTimestamp = startDate.getTime();
    }
    
    // 2. تحديد نهاية الفترة
    if (endDateValue) {
        const endDate = new Date(endDateValue);
        // لضمان شمول اليوم المحدد بالكامل (نضيف 23 ساعة و 59 دقيقة و 59 ثانية)
        endDate.setHours(23, 59, 59, 999); 
        endTimestamp = endDate.getTime();
    }
    
    // 3. تصفية الطلبات
    const filteredOrders = allOrders.filter(order => {
        // إذا لم يكن هناك طابع زمني (مشكلة في البيانات)، يتم تجاهل الطلب
        if (!order.timestamp) return false; 
        
        return order.timestamp >= startTimestamp && order.timestamp <= endTimestamp;
    });

    renderOrders(filteredOrders);
}