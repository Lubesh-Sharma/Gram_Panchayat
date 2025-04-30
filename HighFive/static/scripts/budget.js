// Set default date for form fields to today
document.addEventListener('DOMContentLoaded', function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incomeDate').value = today;
    document.getElementById('expenseDate').value = today;

    // Add section activation for sidebar navigation
    initSidebarNavigation();

    // Set up change password functionality
    initChangePasswordHandlers();
    
    // Set up announcements functionality
    initAnnouncementsHandlers();
});

// Sidebar navigation function
function activateSection(sectionId) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show the selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Mark the menu item as active
    document.querySelector(`.menu-item[data-section="${sectionId}"]`).classList.add('active');
}

// Initialize sidebar navigation
function initSidebarNavigation() {
    // Handle click on each menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        const sectionId = item.getAttribute('data-section');
        if (sectionId) {
            item.addEventListener('click', function() {
                activateSection(sectionId);
            });
        }
    });
    
    // Special handling for change password menu item
    const changePasswordMenu = document.getElementById('changePasswordMenu');
    if (changePasswordMenu) {
        changePasswordMenu.addEventListener('click', function() {
            document.getElementById('changePasswordModal').style.display = 'block';
        });
    }
}

// Initialize change password functionality
function initChangePasswordHandlers() {
    // Fix change password modal trigger
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            document.getElementById('changePasswordModal').style.display = 'block';
        });
    }
    
    // Password change form submission
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate passwords match
            if (newPassword !== confirmPassword) {
                alert('New passwords do not match!');
                return;
            }
            
            // Get the user_id from the form action URL
            const formActionUrl = this.getAttribute('action');
            
            // Send the password change request
            fetch(formActionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'current-password': currentPassword,
                    'new-password': newPassword,
                    'confirm-password': confirmPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data && data.success) {
                    alert('Password changed successfully!');
                    closeChangePasswordModal();
                    location.reload();
                } else if (data && data.message) {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while changing password.');
            });
        });
    }
    
    // Explicitly wire up change password modal close button
    const closePasswordBtn = document.querySelector('#changePasswordModal .close');
    if (closePasswordBtn) {
        closePasswordBtn.addEventListener('click', function() {
            closeChangePasswordModal();
        });
    }
    
    // Explicitly wire up cancel button in change password modal
    const cancelPasswordBtn = document.querySelector('#changePasswordModal .cancel-btn');
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', function() {
            closeChangePasswordModal();
        });
    }
}

// Modal control functions
function openIncomeModal() {
    document.getElementById('incomeModal').style.display = 'block';
}

function closeIncomeModal() {
    document.getElementById('incomeModal').style.display = 'none';
    document.getElementById('incomeForm').reset();
    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incomeDate').value = today;
}

function openExpenseModal() {
    document.getElementById('expenseModal').style.display = 'block';
}

function closeExpenseModal() {
    document.getElementById('expenseModal').style.display = 'none';
    document.getElementById('expenseForm').reset();
    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;
}

// Delete confirmation functions for Revenue
function confirmDeleteRevenue(revenueId) {
    document.getElementById('delete_revenue_id').value = revenueId;
    document.getElementById('deleteRevenueModal').style.display = 'block';
}

function closeDeleteRevenueModal() {
    document.getElementById('deleteRevenueModal').style.display = 'none';
}

// Delete confirmation functions for Expense
function confirmDeleteExpense(expenseId) {
    document.getElementById('delete_expense_id').value = expenseId;
    document.getElementById('deleteExpenseModal').style.display = 'block';
}

function closeDeleteExpenseModal() {
    document.getElementById('deleteExpenseModal').style.display = 'none';
}

// Change Password Modal
function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form if it exists
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();
    }
}

// New function to close password modal and refresh the page
function closeChangePasswordModalAndRefresh() {
    closeChangePasswordModal();
    window.location.reload();
}

// Initialize announcements functionality
function initAnnouncementsHandlers() {
    const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
    if (addAnnouncementBtn) {
        addAnnouncementBtn.addEventListener('click', function() {
            // Display the add announcement modal
            const addAnnouncementModal = new bootstrap.Modal(document.getElementById('addAnnouncementModal'));
            addAnnouncementModal.show();
        });
    }
    
    const saveAnnouncementBtn = document.getElementById('saveAnnouncementBtn');
    if (saveAnnouncementBtn) {
        saveAnnouncementBtn.addEventListener('click', function() {
            const heading = document.getElementById('announcementHeading').value;
            const detail = document.getElementById('announcementDetail').value;
            
            if (!heading.trim() || !detail.trim()) {
                alert('Please fill in both heading and detail fields');
                return;
            }
            
            // Send the announcement data to the server
            fetch('/add_announcement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    heading: heading,
                    detail: detail
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Announcement added successfully!');
                    location.reload(); // Reload to show the new announcement
                } else {
                    alert('Failed to add announcement: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while adding the announcement.');
            });
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addAnnouncementModal'));
            modal.hide();
        });
    }
    
    // Handle edit and delete buttons for announcements
    document.addEventListener('click', function(event) {
        // Handle edit announcement button click
        if (event.target.closest('.edit-announcement')) {
            const button = event.target.closest('.edit-announcement');
            const announcementId = button.getAttribute('data-id');
            
            // Fetch the announcement details
            fetch(`/get_announcement/${announcementId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Populate the edit modal with the announcement details
                    document.getElementById('editAnnouncementHeading').value = data.announcement.heading;
                    document.getElementById('editAnnouncementDetail').value = data.announcement.detail;
                    document.getElementById('updateAnnouncementBtn').setAttribute('data-id', announcementId);
                    
                    // Show the edit modal
                    const editModal = new bootstrap.Modal(document.getElementById('editAnnouncementModal'));
                    editModal.show();
                } else {
                    alert('Failed to get announcement details: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while fetching announcement details.');
            });
        }
        
        // Handle delete announcement button click
        if (event.target.closest('.delete-announcement')) {
            const button = event.target.closest('.delete-announcement');
            const announcementId = button.getAttribute('data-id');
            
            if (confirm('Are you sure you want to delete this announcement?')) {
                // Delete the announcement
                fetch(`/delete_announcement/${announcementId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Announcement deleted successfully!');
                        location.reload(); // Reload to update the list
                    } else {
                        alert('Failed to delete announcement: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while deleting the announcement.');
                });
            }
        }
    });
    
    // Handle update announcement button click
    const updateAnnouncementBtn = document.getElementById('updateAnnouncementBtn');
    if (updateAnnouncementBtn) {
        updateAnnouncementBtn.addEventListener('click', function() {
            const announcementId = this.getAttribute('data-id');
            const heading = document.getElementById('editAnnouncementHeading').value;
            const detail = document.getElementById('editAnnouncementDetail').value;
            
            if (!heading.trim() || !detail.trim()) {
                alert('Please fill in both heading and detail fields');
                return;
            }
            
            // Send the updated announcement data to the server
            fetch(`/update_announcement/${announcementId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    heading: heading,
                    detail: detail
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Announcement updated successfully!');
                    location.reload(); // Reload to show the updated announcement
                } else {
                    alert('Failed to update announcement: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the announcement.');
            });
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editAnnouncementModal'));
            modal.hide();
        });
    }
    
    // Add refresh behavior to all cancel buttons in modals
    document.querySelectorAll('.modal .cancel-btn').forEach(button => {
        button.addEventListener('click', function() {
            window.location.reload();
        });
    });
}

// Close all modals when clicking outside of them
window.onclick = function (event) {
    const incomeModal = document.getElementById('incomeModal');
    const expenseModal = document.getElementById('expenseModal');
    const deleteRevenueModal = document.getElementById('deleteRevenueModal');
    const deleteExpenseModal = document.getElementById('deleteExpenseModal');
    const changePasswordModal = document.getElementById('changePasswordModal');

    if (event.target == incomeModal) {
        closeIncomeModal();
    }
    if (event.target == expenseModal) {
        closeExpenseModal();
    }
    if (event.target == deleteRevenueModal) {
        closeDeleteRevenueModal();
    }
    if (event.target == deleteExpenseModal) {
        closeDeleteExpenseModal();
    }
    if (event.target == changePasswordModal) {
        closeChangePasswordModal();
    }
}