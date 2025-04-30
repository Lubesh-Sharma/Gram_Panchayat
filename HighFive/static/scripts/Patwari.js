

function setupNavigation() {
    console.log("Setting up navigation...");
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    const dataSections = document.querySelectorAll('.data-section');
    
    console.log("Found", menuItems.length, "menu items and", dataSections.length, "data sections");

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sectionName = this.getAttribute('data-section');
            console.log("Clicked menu item for section:", sectionName);

            // Remove active class from all menu items
            menuItems.forEach(mi => mi.classList.remove('active'));

            // Add active class to clicked menu item
            this.classList.add('active');

            // Hide all data sections
            dataSections.forEach(section => {
                section.classList.remove('active');
            });

            // Show the corresponding section
            const targetSection = document.getElementById(sectionName + '-section');
            if (targetSection) {
                targetSection.classList.add('active');
                console.log("Activated section:", sectionName + '-section');
            } else {
                console.error("Could not find section:", sectionName + '-section');
            }
        });
    });
}








document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    createLandDistributionChart();
    createEnvironmentalProjectsChart();
    
    // Initialize demographics chart if we're on the census section
    if (document.getElementById('demographicsChart')) {
        createDemographicsChart();
    }
    
    // Setup navigation
    setupNavigation();
    
    // Setup modal handlers
    setupModalHandlers();
    
    // Setup event listeners for actions - this was duplicated in the file
    setupActionListeners();
    
    // Debug: Log to ensure the script is running
    console.log("Patwari dashboard initialized");
});



// Add this function if it's missing
function createDemographicsChart() {
    const ctx = document.getElementById('demographicsChart');
    if (!ctx) {
        console.error('Demographics chart canvas not found');
        return;
    }
    
    console.log('Creating demographics chart with data:', censusData);
    
    // Destroy any existing chart
    if (window.demographicsChartInstance) {
        window.demographicsChartInstance.destroy();
    }
    
    window.demographicsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Gender Distribution'],
            datasets: [
                {
                    label: 'Male',
                    data: [censusData.male_citizens],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Female',
                    data: [censusData.female_citizens],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Citizen Demographics'
                },
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Create the Land Distribution chart
function createLandDistributionChart() {
    const ctx = document.getElementById('landDistributionChart').getContext('2d');
    const landChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Agricultural', 'Residential', 'Commercial'],
            datasets: [{
                data: [
                    statsData.agriculturalArea, 
                    statsData.residentialArea, 
                    statsData.commercialArea
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Total Land Distribution (All Panchayats)'
                }
            }
        }
    });
}

function createEnvironmentalProjectsChart() {
    const ctx = document.getElementById('environmentalProjectsChart').getContext('2d');
    const envChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Afforestation', 'Waste Management', 'Renewable Energy', 'Water Conservation'],
            datasets: [{
                label: 'Environmental Projects',
                data: [2, 1, 1, 0],
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
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



function setupModalHandlers() {
    // Add Land Record
    document.getElementById('addLandBtn').addEventListener('click', function() {
        document.getElementById('landForm').reset();
        document.getElementById('landModalTitle').textContent = 'Add New Land Record';
        document.getElementById('landId').value = '';
        showModal('landModal');
    });

    // Add Environmental Initiative
    document.getElementById('addEnvInitiativeBtn').addEventListener('click', function() {
        document.getElementById('envInitiativeForm').reset();
        document.getElementById('envInitiativeModalTitle').textContent = 'Add Environmental Initiative';
        document.getElementById('initiativeId').value = '';
        showModal('envInitiativeModal');
    });

    // Add Irrigation System
    document.getElementById('addIrrigationBtn').addEventListener('click', function() {
        document.getElementById('irrigationForm').reset();
        document.getElementById('irrigationModalTitle').textContent = 'Add Irrigation System';
        document.getElementById('systemId').value = '';
        showModal('irrigationModal');
    });

    // Add Announcement
    document.getElementById('addAnnouncementBtn').addEventListener('click', function() {
        document.getElementById('announcementForm').reset();
        document.getElementById('announcementModalTitle').textContent = 'Add Announcement';
        document.getElementById('announcementId').value = '';
        showModal('announcementModal');
    });

    // Close modal buttons
    document.querySelectorAll('.modal-close, .btn-secondary[id$="Btn"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.closest('.modal-overlay').id;
            hideModal(modalId);
        });
    });
}

function setupActionListeners() {
    // Fix: Consolidate all event listeners in one place
    
    // Save buttons
    document.getElementById('saveLandBtn').addEventListener('click', saveLandRecord);
    document.getElementById('saveEnvInitiativeBtn').addEventListener('click', saveEnvironmentalInitiative);
    document.getElementById('saveIrrigationBtn').addEventListener('click', saveIrrigationSystem);
    document.getElementById('saveAnnouncementBtn').addEventListener('click', saveAnnouncement);

    // Refresh buttons
    document.getElementById('refreshStatsBtn').addEventListener('click', function() {
        window.location.reload();
    });

    document.getElementById('switchToCitizenBtn').addEventListener('click', function() {
        const citizenId = employeeData.citizen_id;
        if (citizenId) {
            window.location.href = `/citizen/${userId}/${citizenId}`;
        } else {
            alert('No associated citizen account found.');
        }
    });
    
    const refreshCensusBtn = document.getElementById('refreshCensusBtn');
    if (refreshCensusBtn) {
        refreshCensusBtn.addEventListener('click', function() {
            refreshCensusData();
        });
    }

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logout();
    });

    

    // Change password button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            showModal('changePasswordModal');
        });
    }
    
    // Submit change password form
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', function() {
            changePassword();
        });
    }

    

    // Cancel password change
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', function() {
            hideModal('changePasswordModal');
        });
    }

    // Close password modal by X
    const closePasswordModal = document.getElementById('closePasswordModal');
    if (closePasswordModal) {
        closePasswordModal.addEventListener('click', function() {
            hideModal('changePasswordModal');
        });
    }

    // Land Filter
    const landFilter = document.getElementById('landFilter');
    if (landFilter) {
        landFilter.addEventListener('change', function() {
            const filterValue = this.value;
            const rows = document.querySelectorAll('#citizenLandsTable tbody tr');

            rows.forEach(row => {
                const panchayatId = row.getAttribute('data-panchayat');

                if (filterValue === 'all') {
                    row.style.display = '';
                } else if (filterValue === 'panchayat' && panchayatId === panchayat_id.toString()) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

function refreshCensusData() {
    fetch(`/api/census/refresh/${employeeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const totalCitizens = document.getElementById('total-citizens-count');
                const maleCitizens = document.getElementById('male-citizens');
                const femaleCitizens = document.getElementById('female-citizens');
                const households = document.getElementById('households');
                
                if (totalCitizens) totalCitizens.innerText = data.census.total_citizens;
                if (maleCitizens) maleCitizens.innerText = data.census.male_citizens;
                if (femaleCitizens) femaleCitizens.innerText = data.census.female_citizens;
                if (households) households.innerText = data.census.households;
                
                // Recreate the demographics chart with new data
                createDemographicsChart();
                
                alert('Census data refreshed successfully!');
            } else {
                alert('Failed to refresh census data: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error refreshing census data:', error);
            alert('Error refreshing census data. Please try again.');
        });
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// CRUD Operations for Land Records
function editLand(landId) {
    fetch(`/api/land/${landId}`)
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
                alert('Error loading land record: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching land record:', error);
            alert('Error loading land record. Please try again.');
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
                    alert('Error deleting land record: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting land record:', error);
                alert('Error deleting land record. Please try again.');
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
                alert('Error saving land record: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving land record:', error);
            alert('Error saving land record. Please try again.');
        });
}

// CRUD Operations for Environmental Initiatives
function editInitiative(initiativeId) {
    fetch(`/api/initiative/${initiativeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const initiative = data.initiative;
                document.getElementById('initiativeId').value = initiative.id;
                document.getElementById('initiativeName').value = initiative.name;
                document.getElementById('startDate').value = initiative.startDate;
                document.getElementById('areaCovered').value = initiative.areaCovered;
                document.getElementById('initiativeType').value = initiative.type;
                document.getElementById('initiativeStatus').value = initiative.status;
                document.getElementById('initiativeDescription').value = initiative.description;

                document.getElementById('envInitiativeModalTitle').textContent = 'Edit Environmental Initiative';
                showModal('envInitiativeModal');
            } else {
                alert('Error loading initiative: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching initiative:', error);
            alert('Error loading initiative. Please try again.');
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
                    alert('Error deleting initiative: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting initiative:', error);
                alert('Error deleting initiative. Please try again.');
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
                alert('Error saving initiative: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving initiative:', error);
            alert('Error saving initiative. Please try again.');
        });
}

// CRUD Operations for Irrigation Systems
function editSystem(systemId) {
    fetch(`/api/irrigation/${systemId}`)
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
                alert('Error loading irrigation system: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching irrigation system:', error);
            alert('Error loading irrigation system. Please try again.');
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
                    alert('Error deleting irrigation system: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting irrigation system:', error);
                alert('Error deleting irrigation system. Please try again.');
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
                alert('Error saving irrigation system: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving irrigation system:', error);
            alert('Error saving irrigation system. Please try again.');
        });
}

// CRUD Operations for Announcements
function editAnnouncement(announcementId) {
    fetch(`/api/announcement/${announcementId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const announcement = data.announcement;
                document.getElementById('announcementId').value = announcement.id;
                document.getElementById('announcementHeading').value = announcement.heading;
                document.getElementById('announcementDetail').value = announcement.detail;

                document.getElementById('announcementModalTitle').textContent = 'Edit Announcement';
                showModal('announcementModal');
            } else {
                alert('Error loading announcement: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching announcement:', error);
            alert('Error loading announcement. Please try again.');
        });
}

function deleteAnnouncement(announcementId) {
    if (confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
        fetch(`/api/announcement/delete/${announcementId}`, {
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
                    alert('Error deleting announcement: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting announcement:', error);
                alert('Error deleting announcement. Please try again.');
            });
    }
}

function saveAnnouncement() {
    const announcementId = document.getElementById('announcementId').value;
    const data = {
        heading: document.getElementById('announcementHeading').value,
        detail: document.getElementById('announcementDetail').value
    };

    const url = announcementId ? `/api/announcement/update/${announcementId}` : '/api/announcement/create';
    const method = announcementId ? 'PUT' : 'POST';

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
                alert('Error saving announcement: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving announcement:', error);
            alert('Error saving announcement. Please try again.');
        });
}

// Logout function
function logout() {
    // Simple form POST to the logout route
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout_ptw';
    document.body.appendChild(form);
    form.submit();
}

// Change password function
function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Simple validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('New password and confirmation do not match');
        return;
    }
    
    // Create a form element and submit it directly
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/change_password_ptw/${userId}`;
    
    // Add hidden fields for the passwords
    const currentPasswordField = document.createElement('input');
    currentPasswordField.type = 'hidden';
    currentPasswordField.name = 'current-password';
    currentPasswordField.value = currentPassword;
    form.appendChild(currentPasswordField);
    
    const newPasswordField = document.createElement('input');
    newPasswordField.type = 'hidden';
    newPasswordField.name = 'new-password';
    newPasswordField.value = newPassword;
    form.appendChild(newPasswordField);
    
    // Add the form to the document and submit it
    document.body.appendChild(form);
    form.submit();
}





