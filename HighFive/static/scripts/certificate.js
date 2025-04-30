function showActionModal(certificateId, status) {
    document.getElementById('certificate_id').value = certificateId;
    document.getElementById('status').value = status;
    document.getElementById('actionModalLabel').textContent = status + ' Certificate';

    // Clear previous description
    document.getElementById('description').value = '';

    // Show the modal
    var actionModal = new bootstrap.Modal(document.getElementById('actionModal'));
    actionModal.show();

    // Fetch certificate details - commenting this out as it may be causing issues
    // and doesn't seem to be used in the form submission
    /*
    fetch('/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            'certificate_id': certificateId,
            'status': status
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Certificate details fetched successfully:', data);
                // You can use the returned data here if needed
            } else {
                console.error('Error:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    */
}

// Certificate Type Management Functions
function showEditCertificateModal(typeId, type, description) {
    document.getElementById('edit_type_id').value = typeId;
    document.getElementById('edit_certificate_type').value = type;
    document.getElementById('edit_certificate_description').value = description;

    // Show the modal
    var editCertificateModal = new bootstrap.Modal(document.getElementById('editCertificateModal'));
    editCertificateModal.show();
}

function confirmDeleteCertificate(typeId, certificateType) {
    if (confirm(`Are you sure you want to delete the certificate type "${certificateType}"? This action cannot be undone.`)) {
        // Create a form to submit the delete request
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = "/delete_certificate_type"; // This should match the URL in Flask

        // Add the necessary fields
        const typeIdField = document.createElement('input');
        typeIdField.type = 'hidden';
        typeIdField.name = 'type_id';
        typeIdField.value = typeId;

        // Try to get user_id and employee_id from hidden inputs in any form
        let userId = '';
        let employeeId = '';
        
        // Find user_id and employee_id from existing hidden inputs
        const userIdInput = document.querySelector('input[name="user_id"]');
        if (userIdInput) {
            userId = userIdInput.value;
        }
        
        const employeeIdInput = document.querySelector('input[name="employee_id"]');
        if (employeeIdInput) {
            employeeId = employeeIdInput.value;
        }

        const userIdField = document.createElement('input');
        userIdField.type = 'hidden';
        userIdField.name = 'user_id';
        userIdField.value = userId;

        const employeeIdField = document.createElement('input');
        employeeIdField.type = 'hidden';
        employeeIdField.name = 'employee_id';
        employeeIdField.value = employeeId;

        // Append fields to form
        form.appendChild(typeIdField);
        form.appendChild(userIdField);
        form.appendChild(employeeIdField);

        // Append form to body and submit
        document.body.appendChild(form);
        form.submit();
    }
}

// Event listeners for certificate type management
document.addEventListener('DOMContentLoaded', function() {
    // Add New Certificate Type button
    const addNewCertificateBtn = document.getElementById('addNewCertificateBtn');
    if (addNewCertificateBtn) {
        addNewCertificateBtn.addEventListener('click', function() {
            const addCertificateModal = new bootstrap.Modal(document.getElementById('addCertificateModal'));
            addCertificateModal.show();
        });
    }

    // Form validation for adding certificate type
    const addCertificateForm = document.getElementById('addCertificateForm');
    if (addCertificateForm) {
        addCertificateForm.addEventListener('submit', function(e) {
            const certificateType = document.getElementById('certificate_type').value.trim();
            const description = document.getElementById('certificate_description').value.trim();
            
            if (certificateType === '' || description === '') {
                e.preventDefault();
                alert('Please fill in all fields');
                return false;
            }
            
            // Disable button to prevent double submission
            document.getElementById('addCertificateBtn').disabled = true;
            document.getElementById('addCertificateBtn').textContent = 'Adding...';
        });
    }
    
    // Form validation for editing certificate type
    const editCertificateForm = document.querySelector('#editCertificateModal form');
    if (editCertificateForm) {
        editCertificateForm.addEventListener('submit', function(e) {
            const certificateType = document.getElementById('edit_certificate_type').value.trim();
            const description = document.getElementById('edit_certificate_description').value.trim();
            
            if (certificateType === '' || description === '') {
                e.preventDefault();
                alert('Please fill in all fields');
                return false;
            }
        });
    }
    
    // Auto dismiss flash messages after 5 seconds
    setTimeout(function() {
        const alerts = document.querySelectorAll('.alert-container .alert');
        alerts.forEach(function(alert) {
            if (bootstrap.Alert && alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            } else if (alert) {
                alert.classList.add('d-none');
            }
        });
    }, 5000);
});

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

    // Extract user_id from hidden input in the form or from page context
    const userId = document.getElementById('user_id') ? document.getElementById('user_id').value : null;

    if (!userId) {
        passwordMessage.textContent = 'User ID not found!';
        passwordMessage.classList.remove('d-none', 'alert-success');
        passwordMessage.classList.add('alert-danger');
        return;
    }

    // Send change password request
    fetch('/change_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            'user_id': userId,
            'current_password': currentPassword,
            'new_password': newPassword
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                passwordMessage.textContent = data.message;
                passwordMessage.classList.remove('d-none', 'alert-danger');
                passwordMessage.classList.add('alert-success');

                // Clear the form
                passwordForm.reset();

                // Close the modal after 2 seconds
                setTimeout(() => {
                    changePasswordModal.hide();
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