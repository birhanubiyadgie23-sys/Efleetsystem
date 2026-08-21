// --- Supabase connection configuration ---
const SUPABASE_URL = 'https://hovkdxdcfwqxhkqlfmgx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdmtkeGRjZndxeGhrcWxmbWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTU3NTksImV4cCI6MjEwMjUzMTc1OX0.Ljjcwo858v7zU1hTrbVSvPOXUiFplUVLJono8V3rpiA';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;

let pendingRejectId = null;
let pendingRejectType = null; 

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value.trim();

    if (!email || !password) {
        alert('እባክዎ ኢሜይል እና የይለፍ ቃል ያስገቡ!');
        return;
    }

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) {
        alert('የመግቢያ ስህተት: ' + error.message);
        return;
    }

    currentUser = data.user;
    await fetchUserProfile();
    initSession();
}

async function fetchUserProfile() {
    if (!currentUser) return;

    const { data } = await _supabase
        .from('users')
        .select('*')
        .eq('user_id', currentUser.id);

    if (data && data.length > 0) {
        currentProfile = data[0];
    } else {
        const { data: emailData } = await _supabase
            .from('users')
            .select('*')
            .eq('username', currentUser.email);

        if (emailData && emailData.length > 0) {
            currentProfile = emailData[0];
            await _supabase.from('users').update({ user_id: currentUser.id }).eq('id', currentProfile.id);
        } else {
            currentProfile = { full_name: currentUser.email, role: 'staff', department: '' };
        }
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('mainAppContainer').style.display = 'none';
}

async function initSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('mainAppContainer').style.display = 'none';
        return;
    }
    currentUser = session.user;
    await fetchUserProfile();

    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainAppContainer').style.display = 'flex';
    document.getElementById('currentUserName').innerText = `${currentProfile.full_name || currentUser.email} (${currentProfile.role})`;

    applyRolePermissions();
    renderAllTables();
    populateCarDropdown();
    populateDepartmentDropdowns();
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

async function submitVehicleRequest() {
    const dept = document.getElementById('reqDepartmentSelect').value;
    const dest = document.getElementById('reqDestination').value.trim();
    const reason = document.getElementById('reqReason').value.trim();
    const date = document.getElementById('reqDate').value;

    if (!dept || !dest || !reason || !date) { alert('እባክዎ መረጃዎችን በሙሉ ይሙሉ!'); return; }

    const { error } = await _supabase.from('vehicle_requests').insert([{
        staff_name: (currentProfile && currentProfile.full_name) ? currentProfile.full_name : currentUser.email,
        department: dept,
        destination: dest,
        reason: reason,
        date: date,
        created_at: new Date().toISOString().split('T')[0],
        dept_status: 'Pending',
        admin_status: 'Pending',
        driver_status: 'Pending'
    }]);

    if (error) { alert('ስህተት ተፈጥሯል: ' + error.message); }
    else {
        alert('ጥያቄው በተሳካ ሁኔታ ተልኳል!');
        document.getElementById('reqDestination').value = '';
        document.getElementById('reqReason').value = '';
        renderAllTables();
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
    let query = _supabase.from('vehicle_requests').select('*');
    if (currentProfile && currentProfile.role !== 'admin') {
        query = query.eq('staff_name', currentProfile.full_name || currentUser.email);
    }
    const { data: requests } = await query;
    tbody.innerHTML = '';
    (requests || []).forEach(r => {
        const rejectionNote = r.rejection_reason ? `<br><small style="color: #ff6b6b;">ምክንያት፦ ${r.rejection_reason}</small>` : '';
        tbody.innerHTML += `<tr><td><b>${r.department}</b></td><td>${r.destination}</td><td>${r.reason}</td><td>${r.date}</td><td><span class="badge ${r.dept_status === 'Approved' ? 'badge-active' : 'badge-garage'}">${r.dept_status}</span></td><td><span class="badge ${r.admin_status === 'Approved' ? 'badge-active' : 'badge-garage'}">${r.admin_status}</span>${rejectionNote}</td></tr>`;
    });
}

async function renderDeptApproval() {
    const tbody = document.getElementById('deptApprovalTable');
    if (!tbody) return;

    let query = _supabase.from('vehicle_requests').select('*');
    if (currentProfile && currentProfile.role === 'dept' && currentProfile.department) {
        query = query.eq('department', currentProfile.department);
    }

    const { data: requests } = await query;
    tbody.innerHTML = '';

    (requests || []).forEach(r => {
        let actionButtons = '';
        if (r.dept_status === 'Pending') {
            actionButtons = `
                <button class="btn-success" onclick="updateDeptApproval('${r.id}', 'Approved')" style="margin-right: 5px;">አጽድቅ</button>
                <button class="btn-danger" onclick="updateDeptApproval('${r.id}', 'Rejected')">ውድቅ አድርግ</button>
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

        const { error } = await _supabase
            .from('vehicle_requests')
            .update({ dept_status: 'Approved', admin_status: 'Pending' })
            .eq('id', id);

        if (error) {
            alert('ስህተት ተፈጥሯል: ' + error.message);
        } else {
            alert('ጥያቄው በተሳካ ሁኔታ ጸድቋል!');
            renderAllTables();
        }
    }
}

async function renderAdminDispatch() {
    const tbody = document.getElementById('adminDispatchTable');
    if (!tbody) return;

    const { data: requests } = await _supabase.from('vehicle_requests').select('*');
    const { data: cars } = await _supabase.from('cars').select('*');

    tbody.innerHTML = '';

    (requests || []).forEach(r => {
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
                <button class="btn-success" onclick="updateAdminDispatch('${r.id}', 'Approved')" style="margin-right: 5px;">አጽድቅ</button>
                <button class="btn-danger" onclick="updateAdminDispatch('${r.id}', 'Rejected')">ውድቅ አድርግ</button>
            `;
        }

        let driverSelectOptions = `<option value="">-- አሽከርካሪ ይምረጡ --</option>`;
        (cars || []).forEach(c => {
            const selected = (r.assigned_driver === c.driver) ? 'selected' : '';
            driverSelectOptions += `<option value="${c.driver}" ${selected}>${c.driver} (${c.car})</option>`;
        });

        let driverDropdown = '';
        if (r.admin_status === 'Approved') {
            driverDropdown = `
                <select onchange="assignDriver('${r.id}', this.value)" style="padding: 5px; border-radius: 4px; background: #1a233a; color: white; border: 1px solid #2e3d63;">
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
    const { data: request } = await _supabase.from('vehicle_requests').select('dept_status').eq('id', id).single();

    if (!request || request.dept_status !== 'Approved') {
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

        const { error } = await _supabase
            .from('vehicle_requests')
            .update({ admin_status: 'Approved' })
            .eq('id', id);

        if (error) {
            alert('ስህተት ተፈጥሯል: ' + error.message);
        } else {
            alert('ጥያቄው በስኬት ጸድቋል!');
            renderAllTables();
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

    const { error } = await _supabase
        .from('vehicle_requests')
        .update(updateData)
        .eq('id', pendingRejectId);

    if (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    } else {
        alert('ጥያቄው ውድቅ ተደርጓል!');
        closeRejectionModal();
        renderAllTables();
    }
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
    pendingRejectId = null;
    pendingRejectType = null;
}

async function assignDriver(requestId, driverName) {
    if (!driverName) return;

    const { error } = await _supabase
        .from('vehicle_requests')
        .update({ assigned_driver: driverName, driver_status: 'Assigned' })
        .eq('id', requestId);

    if (error) {
        alert('አሽከርካሪ መመደብ አልተቻለም: ' + error.message);
    } else {
        alert('አሽከርካሪ በተሳካ ሁኔታ ተመድቧል!');
        renderAllTables();
    }
}

async function renderDriverAccept() {
    const tbody = document.getElementById('driverAcceptTable');
    if (!tbody) return;
    
    let query = _supabase.from('vehicle_requests').select('*').not('assigned_driver', 'is', null);
    if (currentProfile && currentProfile.role === 'driver') {
        query = query.eq('assigned_driver', currentProfile.full_name || currentUser.email);
    }
    
    const { data: requests } = await query;
    tbody.innerHTML = '';
    (requests || []).forEach(r => {
        let actionBtn = '-';
        if (r.driver_status === 'Assigned') {
            actionBtn = `<button class="btn-success" onclick="updateDriverStatus('${r.id}', 'In Progress')">ጀምር</button>`;
        } else if (r.driver_status === 'In Progress') {
            actionBtn = `<button class="btn-success" style="background:#059669;" onclick="updateDriverStatus('${r.id}', 'Completed')">ጨርስ</button>`;
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
    const { error } = await _supabase.from('vehicle_requests').update({ driver_status: status }).eq('id', id);
    if (!error) {
        alert(`የጉዞ ሁኔታ ወደ '${status}' ተቀይሯል!`);
        renderDriverAccept();
    }
}

async function renderFuelMaintenanceTable() {
    const tbody = document.getElementById('fmTableBody');
    if (!tbody) return;
    const { data: list } = await _supabase.from('fuel_maintenance').select('*');
    tbody.innerHTML = '';
    
    const isAdmin = currentProfile && currentProfile.role === 'admin';

    (list || []).forEach(item => {
        let actionCell = `<span class="badge">${item.status}</span>`;
        
        if (isAdmin && item.status === 'Pending') {
            actionCell = `
                <button class="btn-success" onclick="updateFuelMaintenanceStatus('${item.id}', 'Approved')" style="padding: 3px 8px; font-size: 11px;">አጽድቅ</button>
                <button class="btn-danger" onclick="updateFuelMaintenanceStatus('${item.id}', 'Rejected')" style="padding: 3px 8px; font-size: 11px;">ውድቅ</button>
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
    const { error } = await _supabase
        .from('fuel_maintenance')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    } else {
        alert(`ጥያቄው ${newStatus === 'Approved' ? 'ጸድቋል' : 'ውድቅ ተደርጓል'}!`);
        renderFuelMaintenanceTable();
        renderReportsTable();
    }
}

async function saveFuelMaintenance() {
    const car = document.getElementById('fmCarSelect').value;
    const type = document.getElementById('fmTypeSelect').value;
    const value = document.getElementById('fmValueInput').value.trim();
    const note = document.getElementById('fmNoteInput').value.trim();
    if (!car || !value) { alert('መረጃ ይሙሉ!'); return; }

    const driverName = (currentProfile && currentProfile.full_name) ? currentProfile.full_name : (currentUser ? currentUser.email : 'Unknown Driver');

    const { error } = await _supabase.from('fuel_maintenance').insert([{
        driver: driverName,
        car,
        type,
        value,
        note,
        status: 'Pending'
    }]);

    if (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    } else {
        alert('ማመልከቻው በተሳካ ሁኔታ ተልኳል!');
        document.getElementById('fmValueInput').value = '';
        document.getElementById('fmNoteInput').value = '';
        renderFuelMaintenanceTable();
    }
}

async function registerNewDepartment() {
    const name = document.getElementById('newDeptNameInput').value.trim();
    if (!name) return;
    await _supabase.from('departments').insert([{ name }]);
    alert('ዳይሬክቶሬት ተፈጥሯል!');
    document.getElementById('newDeptNameInput').value = '';
    renderAdminDepartmentListTable();
    populateDepartmentDropdowns();
}

async function renderAdminDepartmentListTable() {
    const tbody = document.getElementById('adminDepartmentListTable');
    if (!tbody) return;
    const { data: depts } = await _supabase.from('departments').select('*');
    tbody.innerHTML = '';
    (depts || []).forEach(d => {
        tbody.innerHTML += `<tr>
            <td><b>${d.name}</b></td>
            <td><button class="btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteDepartment('${d.id}')">ሰርዝ</button></td>
        </tr>`;
    });
}

async function deleteDepartment(id) {
    if (!confirm('እርግጠኛ ነዎት ይህንን ዳይሬክቶሬት መሰረዝ ይፈልጋሉ?')) return;
    await _supabase.from('departments').delete().eq('id', id);
    renderAdminDepartmentListTable();
    populateDepartmentDropdowns();
}

async function populateDepartmentDropdowns() {
    const reqSelect = document.getElementById('reqDepartmentSelect');
    const configSelect = document.getElementById('adminConfigDeptName');
    const { data: depts } = await _supabase.from('departments').select('*');
    if (reqSelect) {
        reqSelect.innerHTML = `<option value="">-- ዳይሬክቶሬት ይምረጡ --</option>`;
        (depts || []).forEach(d => { reqSelect.innerHTML += `<option value="${d.name}">${d.name}</option>`; });
    }
    if (configSelect) {
        configSelect.innerHTML = `<option value="">-- ዳይሬክቶሬት ይምረጡ --</option>`;
        (depts || []).forEach(d => { configSelect.innerHTML += `<option value="${d.name}">${d.name}</option>`; });
    }
}

async function saveDepartmentConfiguration() {
    const dept_name = document.getElementById('adminConfigDeptName').value;
    const head_username = document.getElementById('adminConfigHeadUsername').value.trim();
    const staffs = document.getElementById('adminConfigStaffs').value.trim();
    if (!dept_name || !head_username) return;
    await _supabase.from('department_configs').insert([{ dept_name, head_username, staffs }]);
    alert('ተዋቅሯል!');
    document.getElementById('adminConfigHeadUsername').value = '';
    document.getElementById('adminConfigStaffs').value = '';
}

async function registerDriverAndCar() {
    const driver = document.getElementById('adminDriverName').value.trim();
    const car = document.getElementById('adminCarPlate').value.trim();
    const status = document.getElementById('adminCarStatus').value;
    if (!driver || !car) return;
    await _supabase.from('cars').insert([{ car, driver, status }]);
    alert('ተመዝግቧል!');
    document.getElementById('adminDriverName').value = '';
    document.getElementById('adminCarPlate').value = '';
    renderAdminCarsTable();
    populateCarDropdown();
}

async function renderAdminCarsTable() {
    const tbody = document.getElementById('adminRegisteredCarsTable');
    if (!tbody) return;
    const { data: cars } = await _supabase.from('cars').select('*');
    tbody.innerHTML = '';
    (cars || []).forEach(c => {
        tbody.innerHTML += `<tr>
            <td><b>${c.car}</b></td>
            <td>${c.driver}</td>
            <td><span class="badge ${c.status === 'Active' ? 'badge-active' : 'badge-garage'}">${c.status}</span></td>
            <td><button class="btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteCar('${c.id}')">ሰርዝ</button></td>
        </tr>`;
    });
}

async function deleteCar(id) {
    if (!confirm('እርግጠኛ ነዎት ይህንን ተሽከርካሪ መሰረዝ ይፈልጋሉ?')) return;
    await _supabase.from('cars').delete().eq('id', id);
    renderAdminCarsTable();
    populateCarDropdown();
}

async function populateCarDropdown() {
    const fmSelect = document.getElementById('fmCarSelect');
    if (!fmSelect) return;
    const { data: cars } = await _supabase.from('cars').select('*');
    fmSelect.innerHTML = `<option value="">-- መኪና ይምረጡ --</option>`;
    (cars || []).forEach(c => { fmSelect.innerHTML += `<option value="${c.car}">${c.car} (${c.driver})</option>`; });
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

    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert('የመመዝገቢያ ስህተት: ' + error.message);
        return;
    }

    if (data.user) {
        const { error: dbError } = await _supabase.from('users').insert([{
            user_id: data.user.id,
            full_name: fullName,
            username: email,
            role: role
        }]);

        if (dbError) {
            alert('በ Database ላይ መመዝገብ አልተቻለም: ' + dbError.message);
        } else {
            alert('አካውንት በተሳካ ሁኔታ ተፈጥሯል!');
            document.getElementById('newAccEmail').value = '';
            document.getElementById('newAccPassword').value = '';
            document.getElementById('newAccFullName').value = '';
            renderUsersListTable();
        }
    }
}

async function renderReportsTable() {
    const tbody = document.getElementById('repTableRequestsBody');
    if (!tbody) return;

    const { data: requests } = await _supabase.from('vehicle_requests').select('*');
    const { data: fmList } = await _supabase.from('fuel_maintenance').select('*');

    tbody.innerHTML = '';
    let rejectedCount = 0;

    (requests || []).forEach(r => {
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

    (fmList || []).forEach(item => {
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

    const { error } = await _supabase.from('tech_support').insert([{
        user_name: userName,
        issue: issue,
        status: 'Pending'
    }]);

    if (error) {
        alert('ስህተት ተፈጥሯል: ' + error.message);
    } else {
        alert('የቴክኒክ ድጋፍ ጥያቄዎ ተልኳል!');
        if (issueInput) issueInput.value = '';
        renderTechSupportTable();
    }
}

async function renderTechSupportTable() {
    const tbody = document.getElementById('adminTechSupportTable');
    if (!tbody) return;

    const { data: list } = await _supabase.from('tech_support').select('*');
    tbody.innerHTML = '';

    (list || []).forEach(item => {
        const actionBtn = item.status === 'Pending' 
            ? `<button class="btn-success" onclick="resolveTechSupport('${item.id}')">ተፈቷል</button>`
            : `<span style="color: #10b981; font-weight: bold;">ተፈትቷል</span>`;

        tbody.innerHTML += `
            <tr>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>${item.user_name}</td>
                <td>${item.issue}</td>
                <td><span class="badge">${item.status}</span></td>
                <td>${actionBtn}</td>
            </tr>`;
    });
}

async function resolveTechSupport(id) {
    const { error } = await _supabase.from('tech_support').update({ status: 'Resolved' }).eq('id', id);
    if (!error) {
        alert('የቴክኒክ ችግሩ መፈታቱ ተመዝግቧል!');
        renderTechSupportTable();
    }
}

async function renderUsersListTable() {
    const tbody = document.getElementById('usersListTableBody');
    if (!tbody) return;

    const { data: users } = await _supabase.from('users').select('*');
    tbody.innerHTML = '';

    (users || []).forEach(u => {
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
    const { data: cars } = await _supabase.from('cars').select('*');
    const { data: requests } = await _supabase.from('vehicle_requests').select('*');
    if (cars) {
        document.getElementById('statActiveCars').innerText = cars.filter(c => c.status === 'Active').length;
        document.getElementById('statGarageCars').innerText = cars.filter(c => c.status === 'Garage').length;
    }
    if (requests) {
        document.getElementById('statPendingReq').innerText = requests.filter(r => r.admin_status === 'Pending').length;
    }
}

window.onload = function () { initSession(); };