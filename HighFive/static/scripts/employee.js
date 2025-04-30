document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar navigation
    initSidebar();
    
    // Initialize modals
    initModals();
    
    // Initialize charts
    initCharts();
    
    // Set up event listeners for action buttons
    document.getElementById('addLandBtn').addEventListener('click', function() {
        showModal('landModal');
        document.getElementById('landModalTitle').textContent = 'Add New Land Record';
        document.getElementById('landForm').reset();
    });
    
    document.getElementById('addEnvInitiativeBtn').addEventListener('click', function() {
        showModal('envInitiativeModal');
        document.getElementById('envInitiativeModalTitle').textContent = 'Add Environmental Initiative';
        document.getElementById('envInitiativeForm').reset();
    });
    
    document.getElementById('addIrrigationBtn').addEventListener('click', function() {
        showModal('irrigationModal');
        document.getElementById('irrigationModalTitle').textContent = 'Add Irrigation System';
        document.getElementById('irrigationForm').reset();
    });
    
    // Form submissions
    document.getElementById('saveLandBtn').addEventListener('click', saveLandRecord);
    document.getElementById('saveEnvInitiativeBtn').addEventListener('click', saveEnvironmentalInitiative);
    document.getElementById('saveIrrigationBtn').addEventListener('click', saveIrrigationSystem);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/landing';
            }
        });
    });
});

function initSidebar() {
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    const sections = document.querySelectorAll('.data-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionName = this.getAttribute('data-section');
            
            // Update active menu item
            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');
            
            // Show active section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionName + '-section') {
                    section.classList.add('active');
                }
            });
        });
    });
}

function initModals() {
    // Close buttons for all modals
    document.querySelectorAll('.modal-close, .btn-secondary[id$="Btn"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.closest('.modal-overlay').id;
            hideModal(modalId);
        });
    });
}

function initCharts() {
    // Land distribution chart
    const landChartCtx = document.getElementById('landDistributionChart').getContext('2d');
    new Chart(landChartCtx, {
        type: 'pie',
        data: {
            labels: ['Agricultural', 'Residential', 'Commercial'],
            datasets: [{
                data: [
                    parseFloat(document.getElementById('agricultural-area').textContent) || 0,
                    parseFloat(document.getElementById('residential-area').textContent) || 0,
                    parseFloat(document.getElementById('commercial-area').textContent) || 0
                ],
                backgroundColor: ['#4CAF50', '#2196F3', '#FFC107']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Environmental projects chart
    const envChartCtx = document.getElementById('environmentalProjectsChart').getContext('2d');
    const envTable = document.getElementById('envInitiativesTable');
    const envTypes = {};
    
    // Count initiatives by type
    if (envTable) {
        const rows = envTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const type = row.cells[4].textContent;
            envTypes[type] = (envTypes[type] || 0) + 1;
        });
    }
    
    new Chart(envChartCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(envTypes),
            datasets: [{
                label: 'Number of Initiatives',
                data: Object.values(envTypes),
                backgroundColor: '#4CAF50'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Modal management
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// CRUD operations for Land Records
function editLand(landId) {
    // Fetch land record details
    fetch(`/api/land/${landId}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const land = data.land;
            document.getElementById('landId').value = land.id;
            document.getElementById('citizenId').value = land.citizenId;
            document.getElementById('landArea').value = land.area;
            document.getElementById('landType').value = land.type;
            document.getElementById('cropType').value = land.cropType;
            
            document.getElementById('landModalTitle').textContent = 'Edit Land Record';
            showModal('landModal');
        } else {
            alert('Error: ' + data.message);
        }
    });
}

function deleteLand(landId) {
    if (confirm('Are you sure you want to delete this land record? This action cannot be undone.')) {
        fetch(`/api/land/delete/${landId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        });
    }
}

function saveLandRecord() {
    const landId = document.getElementById('landId').value;
    const data = {
        citizenId: parseInt(document.getElementById('citizenId').value),
        area: parseFloat(document.getElementById('landArea').value),
        type: document.getElementById('landType').value,
        cropType: document.getElementById('cropType').value
    };
    
    const url = landId ? `/api/land/update/${landId}` : '/api/land/create';
    const method = landId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert('Error: ' + data.message);
        }
    });
}

// CRUD operations for Environmental Initiatives
function editInitiative(initiativeId) {
    // Fetch initiative details
    fetch(`/api/initiative/${initiativeId}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const initiative = data.initiative;
            document.getElementById('initiativeId').value = initiative.id;
            document.getElementById('panchayatId').value = initiative.panchayatId;
            document.getElementById('initiativeName').value = initiative.name;
            document.getElementById('startDate').value = initiative.startDate;
            document.getElementById('areaCovered').value = initiative.areaCovered;
            document.getElementById('initiativeType').value = initiative.type;
            document.getElementById('initiativeStatus').value = initiative.status;
            document.getElementById('initiativeDescription').value = initiative.description;
            
            document.getElementById('envInitiativeModalTitle').textContent = 'Edit Environmental Initiative';
            showModal('envInitiativeModal');
        } else {
            alert('Error: ' + data.message);
        }
    });
}

function deleteInitiative(initiativeId) {
    if (confirm('Are you sure you want to delete this environmental initiative? This action cannot be undone.')) {
        fetch(`/api/initiative/delete/${initiativeId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        });
    }
}

function saveEnvironmentalInitiative() {
    const initiativeId = document.getElementById('initiativeId').value;
    const data = {
        panchayatId: parseInt(document.getElementById('panchayatId').value),
        name: document.getElementById('initiativeName').value,
        startDate: document.getElementById('startDate').value,
        areaCovered: parseFloat(document.getElementById('areaCovered').value),
        type: document.getElementById('initiativeType').value,
        status: document.getElementById('initiativeStatus').value,
        description: document.getElementById('initiativeDescription').value
    };
    
    const url = initiativeId ? `/api/initiative/update/${initiativeId}` : '/api/initiative/create';
    const method = initiativeId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert('Error: ' + data.message);
        }
    });
}

// CRUD operations for Irrigation Systems
function editSystem(systemId) {
    // Fetch system details
    fetch(`/api/irrigation/${systemId}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const system = data.system;
            document.getElementById('systemId').value = system.id;
            document.getElementById('systemName').value = system.name;
            document.getElementById('systemLocation').value = system.location;
            document.getElementById('areaCoverage').value = system.coverage;
            document.getElementById('waterSource').value = system.source;
            document.getElementById('systemStatus').value = system.status;
            document.getElementById('systemNotes').value = system.description;
            
            document.getElementById('irrigationModalTitle').textContent = 'Edit Irrigation System';
            showModal('irrigationModal');
        } else {
            alert('Error: ' + data.message);
        }
    });
}

function deleteSystem(systemId) {
    if (confirm('Are you sure you want to delete this irrigation system? This action cannot be undone.')) {
        fetch(`/api/irrigation/delete/${systemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        });
    }
}

function saveIrrigationSystem() {
    const systemId = document.getElementById('systemId').value;
    const data = {
        panchayatId: parseInt(document.getElementById('panchayatId') ? document.getElementById('panchayatId').value : 1),
        name: document.getElementById('systemName').value,
        location: document.getElementById('systemLocation').value,
        coverage: parseFloat(document.getElementById('areaCoverage').value),
        waterSource: document.getElementById('waterSource').value,
        status: document.getElementById('systemStatus').value,
        description: document.getElementById('systemNotes').value
    };
    
    const url = systemId ? `/api/irrigation/update/${systemId}` : '/api/irrigation/create';
    const method = systemId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert('Error: ' + data.message);
        }
    });
}

// Announcements
function editAnnouncement(id) {
    fetch(`/get_announcement/${id}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const announcement = data.announcement;
            // Implement the edit announcement modal and form
            alert('Edit announcement feature will be implemented soon.');
        } else {
            alert('Error: ' + data.message);
        }
    });
}

function deleteAnnouncement(id) {
    if (confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
        fetch(`/delete_announcement/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        });
    }
}