// --- Firebase Config & Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyBOi2H4sna_H532C96Mg8xi7PA_LiEAaDM",
    authDomain: "efleet-a2161.firebaseapp.com",
    projectId: "efleet-a2161",
    storageBucket: "efleet-a2161.firebasestorage.app",
    messagingSenderId: "1074690413995",
    appId: "1:1074690413995:web:16e946d8974b142910eeee",
    measurementId: "G-XXMFKDE4N7"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentProfile = null;
let pendingRejectId = null;
let pendingRejectType = null;

// --- Authentication Functions ---
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value.trim();

    if (!email || !password) {
        alert('እባክዎ ኢሜይል እና የይለፍ ቃል ያስገቡ!');
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        await fetchUserProfile();
        initSession();
    } catch (error) {
        alert('የመግቢያ ስህተት: ' + error.message);
    }
}

async function fetchUserProfile() {
    if (!currentUser) return;

    try {
        const docSnap = await db.collection('users').doc(currentUser.uid).get();
        if (docSnap.exists) {
            currentProfile = docSnap.data();
        } else {
            const querySnap = await db.collection('users').where('username', '==', currentUser.email).get();
            if (!querySnap.empty) {
                currentProfile = querySnap.docs[0].data();
                await db.collection('users').doc(currentUser.uid).set(currentProfile, { merge: true });
            } else {
                currentProfile = { full_name: currentUser.email, role: 'staff', department: '' };
            }
        }
    } catch (err) {
        console.error("Profile fetching error:", err);
    }
}

async function handleLogout() {
    await auth.signOut();
    currentUser = null;
    currentProfile = null;
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('mainAppContainer').style.display = 'none';
}

function initSession() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            document.getElementById('loginOverlay').style.display = 'flex';
            document.getElementById('mainAppContainer').style.display = 'none';
            return;
        }
        currentUser = user;
        await fetchUserProfile();

        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainAppContainer').style.display = 'flex';
        document.getElementById('currentUserName').innerText = `${currentProfile.full_name || currentUser.email} (${currentProfile.role})`;

        applyRolePermissions();
        renderAllTables();
        populateCarDropdown();
        populateDepartmentDropdowns();
    });
}

function applyRolePermissions() {
    const role = currentProfile ? currentProfile.role : '';
    document.getElementById('navDeptApp').style.display = (role === 'dept' || role === 'admin') ? 'flex' : 'none';
    document.getElementById('navAdminDisp').style.display = (role === 'admin') ? 'flex' : 'none';
    document.getElementById('navDriverAcc').style.display = (role === 'driver' || role === 'admin') ? 'flex' : 'none';
    document.getElementById('navFuel').style.display = (role === 'driver' || role === 'admin') ? 'flex' : 'none';
    document.getElementById('navDeptCreate').style.display = (role === 'admin') ? 'flex' : 'none';
    document.getElementById('navDeptMgmt').style.display = (role === 'admin') ? 'flex' : 'none';
    document.getElementById('navCarMgmt').style.display = (role === 'admin') ? 'flex' : 'none';
    document.getElementById('navAccMgmt').style.display = (role === 'admin') ? 'flex' : 'none';
    document.getElementById('navTechSupportAdmin').style.display = (role === 'admin') ? 'flex' : 'none';
    document.getElementById('navReports').style.display = (role === 'admin') ? 'flex' : 'none';
    if (document.getElementById('navUsersMgmt')) {
        document.getElementById('navUsersMgmt').style.display = (role === 'admin') ? 'flex' : 'none';
    }
}

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active-section');
    if (btnElement) btnElement.classList.add('active');
}

// --- CRUD Operations with Firebase Firestore ---

async function submitVehicleRequest() {
    const dept = document.getElementById('reqDepartmentSelect').value;
    const dest = document.getElementById('reqDestination').value.trim();
    const reason = document.getElementById('reqReason').value.trim();
    const date = document.getElementById('reqDate').value;

    if (!dept || !dest || !reason || !date) { alert('እባክዎ መረጃዎችን በሙሉ ይሙሉ!'); return; }

    try {
        await db.collection('vehicle_requests').add({
            staff_name: (currentProfile && currentProfile.full_name) ? currentProfile.full_name : currentUser.email,
            department: dept,
            destination: dest,
            reason: reason,
            date: date,
            created_at: new Date().toISOString().split('T')[0],
            dept_status: 'Pending',
            admin_status: 'Pending',
            driver_status: 'Pending'
        });
        alert('ጥያቄው በተሳካ ሁኔታ ተልኳል!');
        document.getElementById('reqDestination').value = '';
        document.getElementById('reqReason').value = '';
        renderAllTables();
    } catch (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    }
}

async function renderAllTables() {
    await renderStaffRequests();
    await renderDeptApproval();
    await renderAdminDispatch();
    await renderDriverAccept();
    await renderAdminDepartmentListTable();
    await renderAdminCarsTable();
    await renderFuelMaintenanceTable();
    await renderReportsTable();
    await renderTechSupportTable();
    await renderUsersListTable();
    await refreshDashboardStats();
}

async function renderStaffRequests() {
    const tbody = document.getElementById('staffRequestsTable');
    if (!tbody) return;

    let ref = db.collection('vehicle_requests');
    let query = ref;
    if (currentProfile && currentProfile.role !== 'admin') {
        query = ref.where('staff_name', '==', currentProfile.full_name || currentUser.email);
    }

    const snapshot = await query.get();
    tbody.innerHTML = '';
    snapshot.forEach(doc => {
        const r = doc.data();
        const rejectionNote = r.rejection_reason ? `<br><small style="color: #ff6b6b;">ምክንያት፦ ${r.rejection_reason}</small>` : '';
        tbody.innerHTML += `<tr><td><b>${r.department}</b></td><td>${r.destination}</td><td>${r.reason}</td><td>${r.date}</td><td><span class="badge ${r.dept_status === 'Approved' ? 'badge-active' : 'badge-garage'}">${r.dept_status}</span></td><td><span class="badge ${r.admin_status === 'Approved' ? 'badge-active' : 'badge-garage'}">${r.admin_status}</span>${rejectionNote}</td></tr>`;
    });
}

async function renderDeptApproval() {
    const tbody = document.getElementById('deptApprovalTable');
    if (!tbody) return;

    let ref = db.collection('vehicle_requests');
    let query = ref;
    if (currentProfile && currentProfile.role === 'dept' && currentProfile.department) {
        query = ref.where('department', '==', currentProfile.department);
    }

    const snapshot = await query.get();
    tbody.innerHTML = '';

    snapshot.forEach(doc => {
        const r = doc.data();
        const id = doc.id;
        let actionButtons = '';
        if (r.dept_status === 'Pending') {
            actionButtons = `
                <button class="btn-success" onclick="updateDeptApproval('${id}', 'Approved')" style="margin-right: 5px;">አጽድቅ</button>
                <button class="btn-danger" onclick="updateDeptApproval('${id}', 'Rejected')">ውድቅ አድርግ</button>
            `;
        } else if (r.dept_status === 'Approved') {
            actionButtons = `<span class="badge badge-active">ጽድቋል</span>`;
        } else {
            const reasonText = r.rejection_reason ? `<br><small style="color: red;">(${r.rejection_reason})</small>` : '';
            actionButtons = `<span class="badge badge-garage">ውድቅ ተደርጓል</span>${reasonText}`;
        }

        tbody.innerHTML += `
            <tr>
                <td><b>${r.staff_name}</b></td>
                <td>${r.department}</td>
                <td>${r.destination}</td>
                <td>${r.reason}</td>
                <td><span class="badge">${r.dept_status}</span></td>
                <td>${actionButtons}</td>
            </tr>`;
    });
}

async function updateDeptApproval(id, status) {
    if (status === 'Rejected') {
        pendingRejectId = id;
        pendingRejectType = 'dept';
        document.getElementById('rejectionReasonText').value = '';
        document.getElementById('rejectionModal').style.display = 'flex';
    } else {
        if (!confirm('ይህንን የተሽከርካሪ ጥያቄ ማጽደቅ ይፈልጋሉ?')) return;

        try {
            await db.collection('vehicle_requests').doc(id).update({
                dept_status: 'Approved',
                admin_status: 'Pending'
            });
            alert('ጥያቄው በተሳካ ሁኔታ ጸድቋል!');
            renderAllTables();
        } catch (error) {
            alert('ስህተት ተፈጥሯል: ' + error.message);
        }
    }
}

async function renderAdminDispatch() {
    const tbody = document.getElementById('adminDispatchTable');
    if (!tbody) return;

    const reqSnap = await db.collection('vehicle_requests').get();
    const carsSnap = await db.collection('cars').get();

    const cars = [];
    carsSnap.forEach(doc => cars.push(doc.data()));

    tbody.innerHTML = '';

    reqSnap.forEach(doc => {
        const r = doc.data();
        const id = doc.id;
        const isDeptApproved = r.dept_status === 'Approved';

        let actionButtons = '';
        if (!isDeptApproved) {
            actionButtons = `<span class="badge badge-garage">የዳይሬክተር ውሳኔ ይጠበቃል</span>`;
        } else if (r.admin_status === 'Approved') {
            actionButtons = `<span class="badge badge-active">ጽድቋል</span>`;
        } else if (r.admin_status === 'Rejected') {
            const reasonText = r.rejection_reason ? `<br><small style="color: #ff4d4d;">(${r.rejection_reason})</small>` : '';
            actionButtons = `<span class="badge badge-garage">ውድቅ ተደርጓል</span>${reasonText}`;
        } else {
            actionButtons = `
                <button class="btn-success" onclick="updateAdminDispatch('${id}', 'Approved')" style="margin-right: 5px;">አጽድቅ</button>
                <button class="btn-danger" onclick="updateAdminDispatch('${id}', 'Rejected')">ውድቅ አድርግ</button>
            `;
        }

        let driverSelectOptions = `<option value="">-- አሽከርካሪ ይምረጡ --</option>`;
        cars.forEach(c => {
            const selected = (r.assigned_driver === c.driver) ? 'selected' : '';
            driverSelectOptions += `<option value="${c.driver}" ${selected}>${c.driver} (${c.car})</option>`;
        });

        let driverDropdown = '';
        if (r.admin_status === 'Approved') {
            driverDropdown = `
                <select onchange="assignDriver('${id}', this.value)" style="padding: 5px; border-radius: 4px; background: #1a233a; color: white; border: 1px solid #2e3d63;">
                    ${driverSelectOptions}
                </select>
            `;
        } else {
            driverDropdown = `<span style="color: #888;">${r.assigned_driver || 'አልተመደቡም'}</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><b>${r.staff_name}</b></td>
                <td>${r.department}</td>
                <td>${r.destination}</td>
                <td><span class="badge">${r.dept_status}</span></td>
                <td>${actionButtons}</td>
                <td>${driverDropdown}</td>
            </tr>`;
    });
}

async function updateAdminDispatch(id, status) {
    const docSnap = await db.collection('vehicle_requests').doc(id).get();
    if (!docSnap.exists || docSnap.data().dept_status !== 'Approved') {
        alert('ስህተት፦ ይህ ጥያቄ በቅድሚያ በዳይሬክተሩ (Dept) መጽደቅ አለበት!');
        return;
    }

    if (status === 'Rejected') {
        pendingRejectId = id;
        pendingRejectType = 'admin';
        document.getElementById('rejectionReasonText').value = '';
        document.getElementById('rejectionModal').style.display = 'flex';
    } else {
        if (!confirm('ይህንን ጥያቄ ማጽደቅ ይፈልጋሉ?')) return;

        try {
            await db.collection('vehicle_requests').doc(id).update({ admin_status: 'Approved' });
            alert('ጥያቄው በስኬት ጸድቋል!');
            renderAllTables();
        } catch (error) {
            alert('ስህተት ተፈጥሯል: ' + error.message);
        }
    }
}

async function submitRejectionForce() {
    const reasonInput = document.getElementById('rejectionReasonText').value.trim();

    if (!reasonInput) {
        alert('እባክዎ ውድቅ ያደረጉበትን ምክንያት ሳይፅፉ ማለፍ አይችሉም!');
        return;
    }

    const updateData = { rejection_reason: reasonInput };

    if (pendingRejectType === 'dept') {
        updateData.dept_status = 'Rejected';
        updateData.admin_status = 'Rejected';
    } else if (pendingRejectType === 'admin') {
        updateData.admin_status = 'Rejected';
    }

    try {
        await db.collection('vehicle_requests').doc(pendingRejectId).update(updateData);
        alert('ጥያቄው ውድቅ ተደርጓል!');
        closeRejectionModal();
        renderAllTables();
    } catch (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    }
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
    pendingRejectId = null;
    pendingRejectType = null;
}

async function assignDriver(requestId, driverName) {
    if (!driverName) return;

    try {
        await db.collection('vehicle_requests').doc(requestId).update({
            assigned_driver: driverName,
            driver_status: 'Assigned'
        });
        alert('አሽከርካሪ በተሳካ ሁኔታ ተመድቧል!');
        renderAllTables();
    } catch (error) {
        alert('አሽከርካሪ መመደብ አልተቻለም: ' + error.message);
    }
}

async function renderDriverAccept() {
    const tbody = document.getElementById('driverAcceptTable');
    if (!tbody) return;

    let ref = db.collection('vehicle_requests');
    let query = ref;
    if (currentProfile && currentProfile.role === 'driver') {
        query = ref.where('assigned_driver', '==', currentProfile.full_name || currentUser.email);
    }

    const snapshot = await query.get();
    tbody.innerHTML = '';
    snapshot.forEach(doc => {
        const r = doc.data();
        if (!r.assigned_driver) return;
        const id = doc.id;
        let actionBtn = '-';
        if (r.driver_status === 'Assigned') {
            actionBtn = `<button class="btn-success" onclick="updateDriverStatus('${id}', 'In Progress')">ጀምር</button>`;
        } else if (r.driver_status === 'In Progress') {
            actionBtn = `<button class="btn-success" style="background:#059669;" onclick="updateDriverStatus('${id}', 'Completed')">ጨርስ</button>`;
        } else if (r.driver_status === 'Completed') {
            actionBtn = `<span class="badge badge-active">ተጠናቋል</span>`;
        }

        tbody.innerHTML += `<tr>
            <td>${r.destination}</td>
            <td>${r.department}</td>
            <td>${r.assigned_driver}</td>
            <td><span class="badge">${r.driver_status}</span></td>
            <td>${actionBtn}</td>
        </tr>`;
    });
}

async function updateDriverStatus(id, status) {
    try {
        await db.collection('vehicle_requests').doc(id).update({ driver_status: status });
        alert(`የጉዞ ሁኔታ ወደ '${status}' ተቀይሯል!`);
        renderDriverAccept();
    } catch (err) {
        alert('ስህተት ተፈጥሯል: ' + err.message);
    }
}

async function renderFuelMaintenanceTable() {
    const tbody = document.getElementById('fmTableBody');
    if (!tbody) return;

    const snapshot = await db.collection('fuel_maintenance').get();
    tbody.innerHTML = '';
    const isAdmin = currentProfile && currentProfile.role === 'admin';

    snapshot.forEach(doc => {
        const item = doc.data();
        const id = doc.id;
        let actionCell = `<span class="badge">${item.status}</span>`;

        if (isAdmin && item.status === 'Pending') {
            actionCell = `
                <button class="btn-success" onclick="updateFuelMaintenanceStatus('${id}', 'Approved')" style="padding: 3px 8px; font-size: 11px;">አጽድቅ</button>
                <button class="btn-danger" onclick="updateFuelMaintenanceStatus('${id}', 'Rejected')" style="padding: 3px 8px; font-size: 11px;">ውድቅ</button>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td><b>${item.driver}</b> (${item.car})</td>
                <td>${item.type}</td>
                <td>${item.value}</td>
                <td>${item.note || '-'}</td>
                <td>${actionCell}</td>
            </tr>`;
    });
}

async function updateFuelMaintenanceStatus(id, newStatus) {
    try {
        await db.collection('fuel_maintenance').doc(id).update({ status: newStatus });
        alert(`ጥያቄው ${newStatus === 'Approved' ? 'ጸድቋል' : 'ውድቅ ተደርጓል'}!`);
        renderFuelMaintenanceTable();
        renderReportsTable();
    } catch (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    }
}

async function saveFuelMaintenance() {
    const car = document.getElementById('fmCarSelect').value;
    const type = document.getElementById('fmTypeSelect').value;
    const value = document.getElementById('fmValueInput').value.trim();
    const note = document.getElementById('fmNoteInput').value.trim();
    if (!car || !value) { alert('መረጃ ይሙሉ!'); return; }

    const driverName = (currentProfile && currentProfile.full_name) ? currentProfile.full_name : (currentUser ? currentUser.email : 'Unknown Driver');

    try {
        await db.collection('fuel_maintenance').add({
            driver: driverName,
            car,
            type,
            value,
            note,
            status: 'Pending',
            created_at: new Date().toISOString()
        });
        alert('ማመልከቻው በተሳካ ሁኔታ ተልኳል!');
        document.getElementById('fmValueInput').value = '';
        document.getElementById('fmNoteInput').value = '';
        renderFuelMaintenanceTable();
    } catch (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    }
}

async function registerNewDepartment() {
    const name = document.getElementById('newDeptNameInput').value.trim();
    if (!name) return;

    await db.collection('departments').add({
        name,
        created_at: new Date().toISOString()
    });
    alert('ዳይሬክቶሬት ተፈጥሯል!');
    document.getElementById('newDeptNameInput').value = '';
    renderAdminDepartmentListTable();
    populateDepartmentDropdowns();
}

async function renderAdminDepartmentListTable() {
    const tbody = document.getElementById('adminDepartmentListTable');
    if (!tbody) return;

    const snapshot = await db.collection('departments').get();
    tbody.innerHTML = '';
    snapshot.forEach(doc => {
        const d = doc.data();
        tbody.innerHTML += `<tr>
            <td><b>${d.name}</b></td>
            <td><button class="btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteDepartment('${doc.id}')">ሰርዝ</button></td>
        </tr>`;
    });
}

async function deleteDepartment(id) {
    if (!confirm('እርግጠኛ ነዎት ይህንን ዳይሬክቶሬት መሰረዝ ይፈልጋሉ?')) return;
    await db.collection('departments').doc(id).delete();
    renderAdminDepartmentListTable();
    populateDepartmentDropdowns();
}

async function populateDepartmentDropdowns() {
    const reqSelect = document.getElementById('reqDepartmentSelect');
    const configSelect = document.getElementById('adminConfigDeptName');
    const snapshot = await db.collection('departments').get();

    if (reqSelect) {
        reqSelect.innerHTML = `<option value="">-- ዳይሬክቶሬት ይምረጡ --</option>`;
        snapshot.forEach(doc => { reqSelect.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
    }
    if (configSelect) {
        configSelect.innerHTML = `<option value="">-- ዳይሬክቶሬት ይምረጡ --</option>`;
        snapshot.forEach(doc => { configSelect.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
    }
}

async function saveDepartmentConfiguration() {
    const dept_name = document.getElementById('adminConfigDeptName').value;
    const head_username = document.getElementById('adminConfigHeadUsername').value.trim();
    const staffs = document.getElementById('adminConfigStaffs').value.trim();
    if (!dept_name || !head_username) return;

    await db.collection('department_configs').add({
        dept_name,
        head_username,
        staffs,
        created_at: new Date().toISOString()
    });
    alert('ተዋቅሯል!');
    document.getElementById('adminConfigHeadUsername').value = '';
    document.getElementById('adminConfigStaffs').value = '';
}

async function registerDriverAndCar() {
    const driver = document.getElementById('adminDriverName').value.trim();
    const car = document.getElementById('adminCarPlate').value.trim();
    const status = document.getElementById('adminCarStatus').value;
    if (!driver || !car) return;

    await db.collection('cars').add({
        car,
        driver,
        status,
        created_at: new Date().toISOString()
    });
    alert('ተመዝግቧል!');
    document.getElementById('adminDriverName').value = '';
    document.getElementById('adminCarPlate').value = '';
    renderAdminCarsTable();
    populateCarDropdown();
}

async function renderAdminCarsTable() {
    const tbody = document.getElementById('adminRegisteredCarsTable');
    if (!tbody) return;

    const snapshot = await db.collection('cars').get();
    tbody.innerHTML = '';
    snapshot.forEach(doc => {
        const c = doc.data();
        tbody.innerHTML += `<tr>
            <td><b>${c.car}</b></td>
            <td>${c.driver}</td>
            <td><span class="badge ${c.status === 'Active' ? 'badge-active' : 'badge-garage'}">${c.status}</span></td>
            <td><button class="btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteCar('${doc.id}')">ሰርዝ</button></td>
        </tr>`;
    });
}

async function deleteCar(id) {
    if (!confirm('እርግጠኛ ነዎት ይህንን ተሽከርካሪ መሰረዝ ይፈልጋሉ?')) return;
    await db.collection('cars').doc(id).delete();
    renderAdminCarsTable();
    populateCarDropdown();
}

async function populateCarDropdown() {
    const fmSelect = document.getElementById('fmCarSelect');
    if (!fmSelect) return;

    const snapshot = await db.collection('cars').get();
    fmSelect.innerHTML = `<option value="">-- መኪና ይምረጡ --</option>`;
    snapshot.forEach(doc => {
        const c = doc.data();
        fmSelect.innerHTML += `<option value="${c.car}">${c.car} (${c.driver})</option>`;
    });
}

async function registerSystemAccount() {
    const email = document.getElementById('newAccEmail').value.trim();
    const password = document.getElementById('newAccPassword').value.trim();
    const fullName = document.getElementById('newAccFullName').value.trim();
    const role = document.getElementById('newAccRole').value;

    if (!email || !password || !fullName) {
        alert('እባክዎ መረጃዎችን በሙሉ ይሙሉ!');
        return;
    }

    if (password.length < 6) {
        alert('የይለፍ ቃል ቢያንስ 6 ፊደላት/ቁጥሮች መሆን አለበት!');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;

        await db.collection('users').doc(newUser.uid).set({
            user_id: newUser.uid,
            full_name: fullName,
            username: email,
            role: role,
            created_at: new Date().toISOString()
        });

        alert('አካውንት በተሳካ ሁኔታ ተፈጥሯል!');
        document.getElementById('newAccEmail').value = '';
        document.getElementById('newAccPassword').value = '';
        document.getElementById('newAccFullName').value = '';
        renderUsersListTable();
    } catch (error) {
        alert('የመመዝገቢያ ስህተት: ' + error.message);
    }
}

async function renderReportsTable() {
    const tbody = document.getElementById('repTableRequestsBody');
    if (!tbody) return;

    const reqSnap = await db.collection('vehicle_requests').get();
    const fmSnap = await db.collection('fuel_maintenance').get();

    tbody.innerHTML = '';
    let rejectedCount = 0;

    reqSnap.forEach(doc => {
        const r = doc.data();
        if (r.admin_status === 'Rejected' || r.dept_status === 'Rejected') {
            rejectedCount++;
        }
        const rejectionNote = r.rejection_reason ? `<br><small style="color: #ff6b6b;">ምክንያት፦ ${r.rejection_reason}</small>` : '';
        tbody.innerHTML += `
            <tr>
                <td><b>${r.staff_name}</b></td>
                <td>${r.department}</td>
                <td>${r.destination}</td>
                <td>${r.reason}</td>
                <td>${r.date}</td>
                <td>
                    <span class="badge ${r.admin_status === 'Approved' ? 'badge-active' : 'badge-garage'}">
                        Dept: ${r.dept_status} | Admin: ${r.admin_status}
                    </span>
                    ${rejectionNote}
                </td>
            </tr>`;
    });

    let fuelTotal = 0;
    let maintTotal = 0;

    fmSnap.forEach(doc => {
        const item = doc.data();
        const val = parseFloat(item.value) || 0;
        if (item.type === 'Fuel') fuelTotal += val;
        if (item.type === 'Maintenance') maintTotal += val;
    });

    if (document.getElementById('totalFuelCost')) document.getElementById('totalFuelCost').innerText = fuelTotal.toLocaleString() + ' ብር';
    if (document.getElementById('totalMaintCost')) document.getElementById('totalMaintCost').innerText = maintTotal.toLocaleString() + ' ብር';
    if (document.getElementById('totalRejectedReq')) document.getElementById('totalRejectedReq').innerText = rejectedCount;
}

async function submitTechSupportIssue() {
    const issueInput = document.getElementById('techIssueInput');
    const issue = issueInput ? issueInput.value.trim() : '';

    if (!issue) {
        alert('እባክዎ ያጋጠመዎትን ችግር ይጻፉ!');
        return;
    }

    const userName = (currentProfile && currentProfile.full_name) ? currentProfile.full_name : (currentUser ? currentUser.email : 'Unknown User');

    try {
        await db.collection('tech_support').add({
            user_name: userName,
            issue: issue,
            status: 'Pending',
            created_at: new Date().toISOString()
        });
        alert('የቴክኒክ ድጋፍ ጥያቄዎ ተልኳል!');
        if (issueInput) issueInput.value = '';
        renderTechSupportTable();
    } catch (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    }
}

async function renderTechSupportTable() {
    const tbody = document.getElementById('adminTechSupportTable');
    if (!tbody) return;

    const snapshot = await db.collection('tech_support').get();
    tbody.innerHTML = '';

    snapshot.forEach(doc => {
        const item = doc.data();
        const id = doc.id;
        const actionBtn = item.status === 'Pending' 
            ? `<button class="btn-success" onclick="resolveTechSupport('${id}')">ተፈቷል</button>`
            : `<span style="color: #10b981; font-weight: bold;">ተፈትቷል</span>`;

        tbody.innerHTML += `
            <tr>
                <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
                <td>${item.user_name}</td>
                <td>${item.issue}</td>
                <td><span class="badge">${item.status}</span></td>
                <td>${actionBtn}</td>
            </tr>`;
    });
}

async function resolveTechSupport(id) {
    try {
        await db.collection('tech_support').doc(id).update({ status: 'Resolved' });
        alert('የቴክኒክ ችግሩ መፈታቱ ተመዝግቧል!');
        renderTechSupportTable();
    } catch (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    }
}

async function renderUsersListTable() {
    const tbody = document.getElementById('usersListTableBody');
    if (!tbody) return;

    const snapshot = await db.collection('users').get();
    tbody.innerHTML = '';

    snapshot.forEach(doc => {
        const u = doc.data();
        tbody.innerHTML += `
            <tr>
                <td><b>${u.full_name || '-'}</b></td>
                <td>${u.username || '-'}</td>
                <td><span class="badge badge-active">${u.role}</span></td>
                <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
            </tr>`;
    });
}

async function refreshDashboardStats() {
    const carsSnap = await db.collection('cars').get();
    const reqSnap = await db.collection('vehicle_requests').get();

    let activeCars = 0;
    let garageCars = 0;
    carsSnap.forEach(doc => {
        if (doc.data().status === 'Active') activeCars++;
        if (doc.data().status === 'Garage') garageCars++;
    });

    let pendingReq = 0;
    reqSnap.forEach(doc => {
        if (doc.data().admin_status === 'Pending') pendingReq++;
    });

    document.getElementById('statActiveCars').innerText = activeCars;
    document.getElementById('statGarageCars').innerText = garageCars;
    document.getElementById('statPendingReq').innerText = pendingReq;
}

window.onload = function () { initSession(); };
