* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
    background-color: #0f172a;
    color: #f8fafc;
    min-height: 100vh;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-card {
    background: #1e293b;
    padding: 30px;
    border-radius: 12px;
    width: 100%;
    max-width: 450px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    border: 1px solid #334155;
}

.modal-card h2, .modal-card h3 {
    margin-bottom: 20px;
    color: #38bdf8;
}

.app-layout {
    display: flex;
    min-height: 100vh;
}

.sidebar {
    width: 260px;
    background: #1e293b;
    border-right: 1px solid #334155;
    display: flex;
    flex-direction: column;
    padding: 20px 10px;
}

.brand {
    padding: 10px;
    margin-bottom: 20px;
    text-align: center;
}

.brand h2 {
    color: #38bdf8;
}

.nav-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-grow: 1;
}

.nav-item {
    background: transparent;
    color: #94a3b8;
    border: none;
    padding: 12px 15px;
    text-align: left;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.nav-item:hover, .nav-item.active {
    background: #334155;
    color: #38bdf8;
    font-weight: bold;
}

.user-profile {
    padding: 15px 10px;
    border-top: 1px solid #334155;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.user-profile span {
    font-size: 13px;
    color: #cbd5e1;
    word-break: break-all;
}

.content-area {
    flex-grow: 1;
    padding: 30px;
    overflow-y: auto;
}

.card {
    display: none;
    background: #1e293b;
    padding: 25px;
    border-radius: 12px;
    border: 1px solid #334155;
}

.card.active-section {
    display: block;
}

.card h2 {
    color: #f8fafc;
    margin-bottom: 20px;
    font-size: 22px;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
}

.form-group label {
    font-size: 13px;
    color: #94a3b8;
}

input, select, textarea {
    background: #0f172a;
    border: 1px solid #334155;
    color: #f8fafc;
    padding: 10px;
    border-radius: 6px;
    font-size: 14px;
    width: 100%;
}

input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #38bdf8;
}

.btn-primary {
    background: #0284c7;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
}

.btn-primary:hover {
    background: #0369a1;
}

.btn-success {
    background: #16a34a;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
}

.btn-danger {
    background: #dc2626;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
}

.btn-logout {
    background: #e11d48;
    color: white;
    border: none;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
}

.table-container {
    width: 100%;
    overflow-x: auto;
    margin-top: 15px;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th, .data-table td {
    border: 1px solid #334155;
    padding: 12px;
    text-align: left;
    font-size: 14px;
}

.data-table th {
    background: #0f172a;
    color: #38bdf8;
}

.badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    background: #475569;
}

.badge-active {
    background: #16a34a;
}

.badge-garage {
    background: #dc2626;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.stat-card {
    background: #0f172a;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #334155;
    text-align: center;
}

.stat-num {
    font-size: 28px;
    font-weight: bold;
    color: #38bdf8;
    margin-top: 10px;
}

/* Print Stylesheet */
@media print {
    body { background: white !important; color: black !important; }
    .sidebar, .nav-menu, .user-profile, .print-btn, .btn-primary, .btn-danger, .btn-success, .modal-overlay { 
        display: none !important; 
    }
    .app-layout { display: block !important; }
    .content-area { padding: 0 !important; width: 100% !important; overflow: visible !important; }
    .card { border: none !important; box-shadow: none !important; display: none !important; padding: 0 !important;}
    #tab-reports { display: block !important; }
    
    .data-table { border-collapse: collapse; width: 100%; }
    .data-table th { background: #f3f4f6 !important; color: black !important; border: 1px solid #000 !important; }
    .data-table td { border: 1px solid #000 !important; color: black !important; }
    .stat-card { border: 1px solid #000 !important; background: transparent !important; }
    .stat-num { color: black !important; }
}
