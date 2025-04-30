document.addEventListener('DOMContentLoaded', function () {
    // Initialize modal
    const taxModal = new bootstrap.Modal(document.getElementById('taxUpdateModal'));
    let currentCitizenId, newTaxAmount;

    // Handle update button click
    document.querySelectorAll('.update-tax').forEach(button => {
        button.addEventListener('click', function () {
            // Get data from button attributes
            const citizenId = this.getAttribute('data-citizen-id');
            const citizenName = this.getAttribute('data-name');
            const currentTax = parseFloat(this.getAttribute('data-tax-due'));
            const annualIncome = parseFloat(this.getAttribute('data-income'));

            // Calculate the new tax (33% of annual income + current tax)
            const newTax = currentTax + (annualIncome * 0.33);

            // Store values for later use
            currentCitizenId = citizenId;
            newTaxAmount = newTax;

            // Update modal content
            document.getElementById('modal-citizen-name').textContent = citizenName;
            document.getElementById('modal-current-tax').textContent = `₹ ${currentTax.toFixed(2)}`;
            document.getElementById('modal-updated-tax').textContent = `₹ ${newTax.toFixed(2)}`;

            // Show the modal
            taxModal.show();
        });
    });

    // Handle change password functionality
    const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    const passwordForm = document.getElementById('changePasswordForm');
    const passwordMessage = document.getElementById('passwordMessage');

    document.getElementById('savePasswordBtn').addEventListener('click', function () {
        // Get form values
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Basic validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            passwordMessage.textContent = 'All password fields are required!';
            passwordMessage.classList.remove('d-none', 'alert-success');
            passwordMessage.classList.add('alert-danger');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            passwordMessage.textContent = 'New passwords do not match!';
            passwordMessage.classList.remove('d-none', 'alert-success');
            passwordMessage.classList.add('alert-danger');
            return;
        }

        // Show a loading message
        passwordMessage.textContent = 'Processing...';
        passwordMessage.classList.remove('d-none', 'alert-danger');
        passwordMessage.classList.add('alert-info');

        // Send change password request - fixed URL
        fetch(changePasswordUrl, {
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
            // Debugging
            console.log('Password change response:', data);
            
            if (data.success) {
                passwordMessage.textContent = data.message;
                passwordMessage.classList.remove('d-none', 'alert-danger', 'alert-info');
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
                passwordMessage.classList.remove('d-none', 'alert-success', 'alert-info');
                passwordMessage.classList.add('alert-danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            passwordMessage.textContent = 'An error occurred while updating the password.';
            passwordMessage.classList.remove('d-none', 'alert-success', 'alert-info');
            passwordMessage.classList.add('alert-danger');
        });
    });

    // Handle confirm update button click
    document.getElementById('confirm-update').addEventListener('click', function () {
        // Get the tax due element to update
        const taxDueElement = document.getElementById(`tax-due-${currentCitizenId}`);

        // Update the displayed tax amount
        taxDueElement.textContent = `₹ ${newTaxAmount.toFixed(2)}`;

        // Send updated tax to the server
        fetch(updateTaxUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                'citizen_id': currentCitizenId,
                'tax_due_amount': newTaxAmount,
                'user_id': userId,
                'employee_id': employeeId
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Highlight the updated row
                    taxDueElement.parentElement.classList.add('table-success');
                    setTimeout(() => {
                        taxDueElement.parentElement.classList.remove('table-success');
                    }, 2000);

                    // Close the modal
                    taxModal.hide();
                } else {
                    alert('Error updating tax: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the tax amount.');
            });
    });

    // Load announcements
    function loadAnnouncements() {
        fetch(getAnnouncementsUrl)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const announcementsList = document.getElementById('announcements-list');
                    announcementsList.innerHTML = '';
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
                } else {
                    console.error('Error loading announcements:', data.message);
                }
            })
            .catch(error => console.error('Error loading announcements:', error));
    }

    loadAnnouncements();

    // Add announcement button
    document.getElementById('addAnnouncementBtn').addEventListener('click', function () {
        const addAnnouncementModal = new bootstrap.Modal(document.getElementById('addAnnouncementModal'));
        addAnnouncementModal.show();
    });

    document.getElementById('saveAnnouncementBtn').addEventListener('click', function () {
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

    // Edit and delete announcement buttons
    document.getElementById('announcements-list').addEventListener('click', function (event) {
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
    });

    document.getElementById('updateAnnouncementBtn').addEventListener('click', function () {
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

    // Sidebar navigation
    const dashboardLink = document.querySelector('.menu-item[data-section="dashboard"]');
    const taxInfoLink = document.querySelector('.menu-item[data-section="tax-info"]');
    const changePasswordLink = document.querySelector('.menu-item[data-section="change-password"]');
    const citizenPortalLink = document.querySelector('.menu-item[data-section="citizen-portal"]');
    const dashboardContent = document.getElementById('dashboard');
    const taxInfoContent = document.getElementById('tax-info');
    const changePasswordContent = document.getElementById('change-password');
    const citizenPortalContent = document.getElementById('citizen-portal');
    const announcementsContent = document.getElementById('announcements');

    dashboardLink.addEventListener('click', function () {
        dashboardContent.classList.add('active');
        taxInfoContent.classList.remove('active');
        changePasswordContent.classList.remove('active');
        citizenPortalContent.classList.remove('active');
        announcementsContent.classList.remove('active');
    });

    taxInfoLink.addEventListener('click', function () {
        dashboardContent.classList.remove('active');
        taxInfoContent.classList.add('active');
        changePasswordContent.classList.remove('active');
        citizenPortalContent.classList.remove('active');
        announcementsContent.classList.remove('active');
    });

    changePasswordLink.addEventListener('click', function () {
        dashboardContent.classList.remove('active');
        taxInfoContent.classList.remove('active');
        changePasswordContent.classList.add('active');
        citizenPortalContent.classList.remove('active');
        announcementsContent.classList.remove('active');
    });

    citizenPortalLink.addEventListener('click', function () {
        dashboardContent.classList.remove('active');
        taxInfoContent.classList.remove('active');
        changePasswordContent.classList.remove('active');
        citizenPortalContent.classList.add('active');
        announcementsContent.classList.remove('active');
    });

    // Handle change password button click in the sidebar
    document.querySelector('.menu-item[data-section="change-password"]').addEventListener('click', function () {
        changePasswordContent.classList.add('active');
        dashboardContent.classList.remove('active');
        taxInfoContent.classList.remove('active');
        citizenPortalContent.classList.remove('active');
        announcementsContent.classList.remove('active');
    });

    // Handle citizen portal button click in the sidebar
    document.querySelector('.menu-item[data-section="citizen-portal"]').addEventListener('click', function () {
        citizenPortalContent.classList.add('active');
        dashboardContent.classList.remove('active');
        taxInfoContent.classList.remove('active');
        changePasswordContent.classList.remove('active');
        announcementsContent.classList.remove('active');
    });

    // Fix issue with change password popup
    document.querySelector('.dropdown-item[data-bs-target="#changePasswordModal"]').addEventListener('click', function () {
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();
    });

    function confirmLogout() {
        if (confirm("Are you sure you wish to logout?")) {
            fetch(logoutUrl, {
                method: 'POST'
            })
                .then(response => {
                    if (response.ok) {
                        window.location.href = landingUrl;
                    } else {
                        alert('Logout failed');
                    }
                });
        }
    }

    // Refresh page on cancel button click
    document.querySelectorAll('.btn-close, .btn-secondary').forEach(button => {
        button.addEventListener('click', function () {
            location.reload();
        });
    });
});