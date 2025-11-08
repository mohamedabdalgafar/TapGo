// ====================================
// 1. المتغيرات والدوال الأساسية
// ====================================

let menuItems = [];
let nextItemId = 1;
let allOrders = [];
let lastOrdersCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    subscribeToOrdersUpdates();
    openTab(document.querySelector('.tab-btn.active'), 'menuContent');
    setTodayFilter();
});

// إدارة التبويبات
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
// 2. إدارة قائمة المنيو (CRUD) + رفع الصور
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
    const price = parseFloat(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const currentDocId = docIdInput.value || null;

    if (!name || isNaN(price) || price <= 0) {
        alert('يرجى ملء جميع الحقول بشكل صحيح (الاسم والسعر).');
        return;
    }

    if (imageInput && imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];
        const storageRef = storage.ref('menu_images/' + Date.now() + '_' + file.name);
        storageRef.put(file).then(snapshot => {
            snapshot.ref.getDownloadURL().then(url => {
                saveMenuData(name, price, category, url, currentDocId);
            });
        }).catch(err => {
            console.error('خطأ في رفع الصورة:', err);
            alert('حدث خطأ أثناء رفع الصورة.');
        });
    } else {
        const imageUrl = currentDocId ? menuItems.find(item => item.docId === currentDocId)?.image || 'default.jpg' : 'default.jpg';
        saveMenuData(name, price, category, imageUrl, currentDocId);
    }

    clearForm();
}

function saveMenuData(name, price, category, image, docId) {
    const itemData = { name, price, category, image };

    if (docId) {
        db.ref('menu/' + docId).update(itemData)
            .then(() => alert(`تم تعديل العنصر بنجاح: ${name}`))
            .catch(err => console.error("خطأ في تعديل العنصر:", err));
    } else {
        itemData.id = nextItemId++;
        db.ref('menu').push(itemData)
            .then(() => alert(`تم إضافة العنصر الجديد بنجاح: ${name}`))
            .catch(err => console.error("خطأ في إضافة العنصر:", err));
    }
}

function editMenuItem(docId) {
    const item = menuItems.find(i => i.docId === docId);
    if (!item) return;

    document.getElementById('itemDocId').value = item.docId;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemCategory').value = item.category;
}

function deleteMenuItem(docId) {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        db.ref('menu/' + docId).remove()
            .then(() => alert('تم حذف العنصر بنجاح.'))
            .catch(err => console.error("خطأ في الحذف:", err));
    }
}

function clearForm() {
    document.getElementById('itemDocId').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemCategory').value = 'drinks';
    document.getElementById('itemImage').value = '';
}

function translateCategory(cat) {
    const map = { drinks: 'مشروبات', food: 'مأكولات', desserts: 'حلويات' };
    return map[cat] || cat;
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
        console.log("✅ تم تحديث الطلبات لحظياً.");
    }, err => console.error("خطأ في الاستماع للطلبات:", err));
}

function renderOrders(ordersToDisplay) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    ordersTableBody.innerHTML = '';

    if (ordersToDisplay.length === 0) {
        ordersTableBody.innerHTML = '<p style="text-align:center; padding:20px;">لا توجد طلبات.</p>';
        return;
    }

    ordersToDisplay.sort((a,b) => b.timestamp - a.timestamp);

    if (ordersToDisplay.length > lastOrdersCount) playNewOrderSound();
    lastOrdersCount = ordersToDisplay.length;

    ordersToDisplay.forEach(order => {
        const itemsSummary = order.items.map(i => `${i.name} x${i.quantity}`).join(', ');
        const orderDate = new Date(order.timestamp);
        const formattedTime = orderDate.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });
        const formattedDate = orderDate.toLocaleDateString('ar-EG', { day:'numeric', month:'short' });

        let statusColor = 'blue';
        if(order.status==='new') statusColor='red';
        else if(order.status==='in_progress') statusColor='orange';
        else if(order.status==='delivered') statusColor='green';

        const row = document.createElement('div');
        row.className='order-grid order-row';
        if(order.status==='new') row.style.backgroundColor='#fff3cd';

        row.innerHTML=`
            <div>${order.id || order.docId}</div>
            <div>${order.tableNumber || '-'}</div>
            <div style="font-size:13px;">${itemsSummary}</div>
            <div style="font-size:13px;">${order.notes || '-'}</div>
            <div>${order.total ? order.total.toFixed(2) : '0.00'} جنيه</div>
            <div>${order.paymentMethod==='cash'?'نقداً':'بطاقة'}</div>
            <div>${formattedDate} ${formattedTime}</div>
            <div>
                <span style="color:${statusColor}; font-weight:bold;">${translateStatus(order.status)}</span>
                <button class="btn btn-secondary" style="padding:3px 8px;margin:2px;" onclick="updateOrderStatus('${order.docId}','${order.status}')">تحديث</button>
                <button class="btn btn-primary" style="padding:3px 8px;margin:2px;" onclick="printOrder('${order.docId}')">طباعة</button>
            </div>
        `;
        ordersTableBody.appendChild(row);
    });
}

function translateStatus(status){
    const translations = { new:'جديد', in_progress:'قيد التجهيز', delivered:'تم التسليم' };
    return translations[status] || status;
}

function updateOrderStatus(docId, currentStatus){
    let newStatus='';
    if(currentStatus==='new') newStatus='in_progress';
    else if(currentStatus==='in_progress') newStatus='delivered';
    else newStatus='new';

    if(confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${translateStatus(newStatus)}"؟`)){
        db.ref('orders/'+docId).update({status:newStatus})
            .then(()=>alert(`تم تحديث حالة الطلب إلى ${translateStatus(newStatus)}.`))
            .catch(err=>console.error("خطأ في تحديث الحالة:",err));
    }
}

// ====================================
// 4. فلترة وتحميل الطلبات
// ====================================

function setTodayFilter(){
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayISO = today.toISOString().split('T')[0];
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if(startInput) startInput.value = todayISO;
    if(endInput) endInput.value = todayISO;
}

function filterOrders(){
    const startInput=document.getElementById('startDate')?.value;
    const endInput=document.getElementById('endDate')?.value;
    const statusFilter=document.getElementById('filterStatus').value;

    let startTimestamp=0, endTimestamp=Infinity;

    if(startInput){ let d=new Date(startInput); d.setHours(0,0,0,0); startTimestamp=d.getTime(); }
    if(endInput){ let d=new Date(endInput); d.setHours(23,59,59,999); endTimestamp=d.getTime(); }

    const filtered = allOrders.filter(order=>{
        if(!order.timestamp) return false;
        const inRange = order.timestamp>=startTimestamp && order.timestamp<=endTimestamp;
        const statusMatch = statusFilter==='all' || order.status===statusFilter;
        return inRange && statusMatch;
    });

    renderOrders(filtered);
}

// ====================================
// 5. أصوات وطباعة الطلب
// ====================================

function playNewOrderSound(){
    const audio=new Audio('new_order_sound.mp3');
    audio.play();
}

function printOrder(docId){
    const order = allOrders.find(o=>o.docId===docId);
    if(!order) return;

    let itemsHTML = order.items.map(i=>`<tr><td>${i.name}</td><td>${i.quantity}</td><td>${(i.price*i.quantity).toFixed(2)}</td></tr>`).join('');

    let printWindow=window.open('','', 'width=600,height=700');
    printWindow.document.write(`
        <h2 style="text-align:center;">طلب رقم: ${order.id || order.docId}</h2>
        <p><strong>الطاولة:</strong> ${order.tableNumber || '-'}</p>
        <table border="1" cellpadding="5" cellspacing="0" width="100%">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>المجموع</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        <p><strong>الملاحظات:</strong> ${order.notes || '-'}</p>
        <p><strong>الإجمالي:</strong> ${order.total ? order.total.toFixed(2) : '0.00'} جنيه</p>
        <p><strong>طريقة الدفع:</strong> ${order.paymentMethod==='cash'?'نقداً':'بطاقة'}</p>
        <p><strong>وقت الطلب:</strong> ${new Date(order.timestamp).toLocaleString('ar-EG')}</p>
        <hr>
        <p style="text-align:center;">شكراً لاستخدام TapGo!</p>
    `);
    printWindow.print();
}
