function showActionModal(requestId, status) {
    document.getElementById('request_id').value = requestId;
    document.getElementById('status').value = status;
    document.getElementById('actionModalLabel').textContent = status + ' Service Request';

    // Change modal header color based on status
    const header = document.getElementById('actionModalHeader');
    if (status === 'Resolved') {
        header.className = 'modal-header bg-success text-white';
    } else if (status === 'Rejected') {
        header.className = 'modal-header bg-danger text-white';
    } else {
        header.className = 'modal-header bg-primary text-white';
    }

    // Clear previous description
    document.getElementById('description').value = '';

    // Show the modal
    var actionModal = new bootstrap.Modal(document.getElementById('actionModal'));
    actionModal.show();
}

function showEditServiceModal(serviceId, serviceType, serviceDescription) {
    // Set values in the edit service modal
    document.getElementById('edit_service_id').value = serviceId;
    document.getElementById('edit_service_type').value = serviceType;
    document.getElementById('edit_service_description').value = serviceDescription;

    // Show the modal
    var editServiceModal = new bootstrap.Modal(document.getElementById('editServiceModal'));
    editServiceModal.show();
}

function showWelfareActionModal(requestId, status) {
    document.getElementById('welfare_request_id').value = requestId;
    document.getElementById('welfare_status').value = status;
    document.getElementById('welfareActionModalLabel').textContent = status + ' Welfare Request';

    // Change modal header color based on status
    const header = document.getElementById('welfareActionModalHeader');
    if (status === 'Resolved') {
        header.className = 'modal-header bg-success text-white';
    } else if (status === 'Rejected') {
        header.className = 'modal-header bg-danger text-white';
    } else {
        header.className = 'modal-header bg-primary text-white';
    }

    // Clear previous description
    document.getElementById('welfare_description').value = '';

    // Show the modal
    var welfareActionModal = new bootstrap.Modal(document.getElementById('welfareActionModal'));
    welfareActionModal.show();
}

function showWelfareActionModal(enrollmentId, status) {
    document.getElementById('welfare_enrollment_id').value = enrollmentId;
    document.getElementById('welfare_status').value = status;
    document.getElementById('welfareActionModalLabel').textContent = status + ' Welfare Enrollment';

    // Change modal header color based on status
    const header = document.getElementById('welfareActionModalHeader');
    if (status === 'Enrolled') {
        header.className = 'modal-header bg-success text-white';
    } else if (status === 'Rejected') {
        header.className = 'modal-header bg-danger text-white';
    } else {
        header.className = 'modal-header bg-primary text-white';
    }

    // Clear previous description
    document.getElementById('welfare_description').value = '';

    // Show the modal
    var welfareActionModal = new bootstrap.Modal(document.getElementById('welfareActionModal'));
    welfareActionModal.show();
}

function showEditWelfareProjectModal(projectId, projectType, projectDescription) {
    // Set values in the edit welfare project modal
    document.getElementById('edit_project_id').value = projectId;
    document.getElementById('edit_project_type').value = projectType;
    document.getElementById('edit_project_description').value = projectDescription;

    // Show the modal
    var editWelfareProjectModal = new bootstrap.Modal(document.getElementById('editWelfareProjectModal'));
    editWelfareProjectModal.show();
}

// Enhanced form submission for add service with validation
document.getElementById('addServiceForm').addEventListener('submit', function (e) {
    // Log form data before submission
    console.log('Form submitted at ' + new Date().toISOString());
    console.log('Service Type:', document.getElementById('service_type').value);
    console.log('Description:', document.getElementById('service_description').value);
    console.log('User ID:', '{{ user_id }}');
    console.log('Employee ID:', '{{ employee_id }}');

    // Basic validation
    const serviceType = document.getElementById('service_type').value.trim();
    const serviceDesc = document.getElementById('service_description').value.trim();

    if (serviceType === '' || serviceDesc === '') {
        e.preventDefault();
        alert('Please fill out all fields');
        return false;
    }

    // Disable button to prevent double submission
    document.getElementById('addServiceBtn').disabled = true;
    document.getElementById('addServiceBtn').textContent = 'Adding...';
});

// Also add validation for the edit form
document.querySelector('#editServiceModal form').addEventListener('submit', function (e) {
    // Log form data before submission
    console.log('Edit form submitted at ' + new Date().toISOString());

    // Basic validation
    const serviceType = document.getElementById('edit_service_type').value.trim();
    const serviceDesc = document.getElementById('edit_service_description').value.trim();

    if (serviceType === '' || serviceDesc === '') {
        e.preventDefault();
        alert('Please fill out all fields');
        return false;
    }
});

// Auto dismiss flash messages after 5 seconds
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, setting up flash message timers');
    
    // Load announcements when the page loads
    loadAnnouncements();
    
    setTimeout(function () {
        const alerts = document.querySelectorAll('.alert-container .alert');
        alerts.forEach(function (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Force page reload when navigated to via back button
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            console.log('Page was loaded from cache, reloading...');
            window.location.reload();
        }
    });
    
    // Add announcement button click handler
    document.getElementById('addAnnouncementBtn').addEventListener('click', function() {
        const addAnnouncementModal = new bootstrap.Modal(document.getElementById('addAnnouncementModal'));
        addAnnouncementModal.show();
    });

    // Save announcement click handler
    document.getElementById('saveAnnouncementBtn').addEventListener('click', function() {
        const heading = document.getElementById('announcementHeading').value;
        const detail = document.getElementById('announcementDetail').value;

        if (heading.trim() === '' || detail.trim() === '') {
            alert('Please fill in all fields.');
            return;
        }

        fetch(addAnnouncementUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ heading, detail })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadAnnouncements();
                document.getElementById('announcementHeading').value = '';
                document.getElementById('announcementDetail').value = '';
                const addAnnouncementModal = bootstrap.Modal.getInstance(document.getElementById('addAnnouncementModal'));
                addAnnouncementModal.hide();
            } else {
                console.error('Error adding announcement:', data.message);
            }
        })
        .catch(error => console.error('Error adding announcement:', error));
    });

    // Update announcement button click handler
    document.getElementById('updateAnnouncementBtn').addEventListener('click', function() {
        const announcementId = this.getAttribute('data-id');
        const heading = document.getElementById('editAnnouncementHeading').value;
        const detail = document.getElementById('editAnnouncementDetail').value;

        if (heading.trim() === '' || detail.trim() === '') {
            alert('Please fill in all fields.');
            return;
        }

        fetch(`${updateAnnouncementUrl}/${announcementId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ heading, detail })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadAnnouncements();
                const editAnnouncementModal = bootstrap.Modal.getInstance(document.getElementById('editAnnouncementModal'));
                editAnnouncementModal.hide();
            } else {
                console.error('Error updating announcement:', data.message);
            }
        })
        .catch(error => console.error('Error updating announcement:', error));
    });

    // Handle announcement edit and delete buttons
    document.getElementById('announcements-list').addEventListener('click', function(event) {
        if (event.target.closest('.edit-announcement')) {
            const announcementId = event.target.closest('.edit-announcement').getAttribute('data-id');
            const editAnnouncementModal = new bootstrap.Modal(document.getElementById('editAnnouncementModal'));
            
            console.log("Editing announcement ID:", announcementId);
            console.log("API URL:", `${getAnnouncementUrl}${announcementId}`);
            
            // Fetch announcement details and populate the form
            fetch(`${getAnnouncementUrl}${announcementId}`)
                .then(response => {
                    console.log("Response status:", response.status);
                    return response.json();
                })
                .then(data => {
                    console.log("Announcement data:", data);
                    if (data.success) {
                        document.getElementById('editAnnouncementHeading').value = data.announcement.heading;
                        document.getElementById('editAnnouncementDetail').value = data.announcement.detail;
                        document.getElementById('updateAnnouncementBtn').setAttribute('data-id', announcementId);
                        editAnnouncementModal.show();
                    } else {
                        console.error('Error fetching announcement details:', data.message);
                        alert('Error fetching announcement details: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error fetching announcement details:', error);
                    alert('Error fetching announcement details. Please try again.');
                });
        } else if (event.target.closest('.delete-announcement')) {
            if (confirm('Are you sure you want to delete this announcement?')) {
                const announcementId = event.target.closest('.delete-announcement').getAttribute('data-id');
                fetch(`${deleteAnnouncementUrl}/${announcementId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        loadAnnouncements();
                    } else {
                        console.error('Error deleting announcement:', data.message);
                    }
                })
                .catch(error => console.error('Error deleting announcement:', error));
            }
        }
    });

    const addWelfareForm = document.getElementById('addWelfareProjectForm');
    if (addWelfareForm) {
        addWelfareForm.addEventListener('submit', function (e) {
            // Log form data before submission
            console.log('Welfare Project Form submitted at ' + new Date().toISOString());
            console.log('Project Type:', document.getElementById('project_type').value);
            console.log('Description:', document.getElementById('project_description').value);

            // Basic validation
            const projectType = document.getElementById('project_type').value.trim();
            const projectDesc = document.getElementById('project_description').value.trim();

            if (projectType === '' || projectDesc === '') {
                e.preventDefault();
                alert('Please fill out all fields');
                return false;
            }

            // Disable button to prevent double submission
            document.getElementById('addWelfareProjectBtn').disabled = true;
            document.getElementById('addWelfareProjectBtn').textContent = 'Adding...';
        });
    }

    // Also add validation for the edit welfare project form
    const editWelfareForm = document.querySelector('#editWelfareProjectModal form');
    if (editWelfareForm) {
        editWelfareForm.addEventListener('submit', function (e) {
            // Log form data before submission
            console.log('Edit welfare project form submitted at ' + new Date().toISOString());

            // Basic validation
            const projectType = document.getElementById('edit_project_type').value.trim();
            const projectDesc = document.getElementById('edit_project_description').value.trim();

            if (projectType === '' || projectDesc === '') {
                e.preventDefault();
                alert('Please fill out all fields');
                return false;
            }
        });
    }

    // Additional validation for welfare schema form
    const addWelfareSchemaForm = document.getElementById('addWelfareSchemaForm');
    if (addWelfareSchemaForm) {
        addWelfareSchemaForm.addEventListener('submit', function (e) {
            // Log form data before submission
            console.log('Welfare Schema Form submitted at ' + new Date().toISOString());
            console.log('Schema Type:', document.getElementById('schema_type').value);
            console.log('Description:', document.getElementById('schema_description').value);

            // Basic validation
            const schemaType = document.getElementById('schema_type').value.trim();
            const schemaDesc = document.getElementById('schema_description').value.trim();

            if (schemaType === '' || schemaDesc === '') {
                e.preventDefault();
                alert('Please fill out all fields');
                return false;
            }

            // Disable button to prevent double submission
            document.getElementById('addWelfareSchemaBtn').disabled = true;
            document.getElementById('addWelfareSchemaBtn').textContent = 'Adding...';
        });
    }

    // Also add validation for the edit welfare schema form
    const editSchemaForm = document.querySelector('#editSchemaModal form');
    if (editSchemaForm) {
        editSchemaForm.addEventListener('submit', function (e) {
            // Log form data before submission
            console.log('Edit welfare schema form submitted at ' + new Date().toISOString());

            // Basic validation
            const schemaType = document.getElementById('edit_schema_type').value.trim();
            const schemaDesc = document.getElementById('edit_schema_description').value.trim();

            if (schemaType === '' || schemaDesc === '') {
                e.preventDefault();
                alert('Please fill out all fields');
                return false;
            }
        });
    }
});

// Function to load announcements
function loadAnnouncements() {
    fetch(getAnnouncementsUrl)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const announcementsList = document.getElementById('announcements-list');
                announcementsList.innerHTML = '';
                
                if (data.announcements.length === 0) {
                    const emptyRow = document.createElement('tr');
                    emptyRow.innerHTML = '<td colspan="4" style="text-align: center;">No announcements till now</td>';
                    announcementsList.appendChild(emptyRow);
                } else {
                    data.announcements.forEach(announcement => {
                        const announcementItem = document.createElement('tr');
                        announcementItem.innerHTML = `
                            <td>${announcement.heading}</td>
                            <td>${announcement.detail}</td>
                            <td>${announcement.date}</td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn btn-primary edit-announcement" data-id="${announcement.id}" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-danger delete-announcement" data-id="${announcement.id}" title="Delete"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        `;
                        announcementsList.appendChild(announcementItem);
                    });
                }
            } else {
                console.error('Error loading announcements:', data.message);
            }
        })
        .catch(error => console.error('Error loading announcements:', error));
}

const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
const passwordForm = document.getElementById('changePasswordForm');
const passwordMessage = document.getElementById('passwordMessage');

document.getElementById('savePasswordBtn').addEventListener('click', function () {
    // Get form values
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Basic validation
    if (newPassword !== confirmPassword) {
        passwordMessage.textContent = 'New passwords do not match!';
        passwordMessage.classList.remove('d-none', 'alert-success');
        passwordMessage.classList.add('alert-danger');
        return;
    }

    // Get the user_id from a hidden field or data attribute
    const userId = document.getElementById('savePasswordBtn').getAttribute('data-user-id');
    
    // Send change password request using the correct URL (no template literals in the URL)
    fetch(`/change_password/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            'current-password': currentPassword,
            'new-password': newPassword,
            'confirm-password': confirmPassword
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                passwordMessage.textContent = data.message;
                passwordMessage.classList.remove('d-none', 'alert-danger');
                passwordMessage.classList.add('alert-success');

                // Clear the form
                document.getElementById('changePasswordForm').reset();

                // Close the modal after 2 seconds
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
                    passwordMessage.classList.add('d-none');
                }, 2000);
            } else {
                passwordMessage.textContent = data.message;
                passwordMessage.classList.remove('d-none', 'alert-success');
                passwordMessage.classList.add('alert-danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            passwordMessage.textContent = 'An error occurred while updating the password.';
            passwordMessage.classList.remove('d-none', 'alert-success');
            passwordMessage.classList.add('alert-danger');
        });
});

// Function to show announcement modal
function showAnnouncementModal(announcementId, title, content) {
    document.getElementById('announcement_id').value = announcementId;
    document.getElementById('announcement_title').value = title;
    document.getElementById('announcement_content').value = content;

    var announcementModal = new bootstrap.Modal(document.getElementById('announcementModal'));
    announcementModal.show();
}

// Function to navigate to a specific section
function navigateToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}