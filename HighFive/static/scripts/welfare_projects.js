// Enhanced form submission for add welfare schema with validation
document.getElementById('addWelfareSchemaForm').addEventListener('submit', function (e) {
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

    // Handle announcement edit and delete buttons
    document.getElementById('announcements-list').addEventListener('click', function(event) {
        if (event.target.closest('.edit-announcement')) {
            const announcementId = event.target.closest('.edit-announcement').getAttribute('data-id');
            const editAnnouncementModal = new bootstrap.Modal(document.getElementById('editAnnouncementModal'));
            
            // Fetch announcement details and populate the form
            fetch(`${getAnnouncementUrl}${announcementId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('editAnnouncementHeading').value = data.announcement.heading;
                        document.getElementById('editAnnouncementDetail').value = data.announcement.detail;
                        document.getElementById('updateAnnouncementBtn').setAttribute('data-id', announcementId);
                        editAnnouncementModal.show();
                    } else {
                        console.error('Error fetching announcement details:', data.message);
                    }
                })
                .catch(error => console.error('Error fetching announcement details:', error));
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
});

// Function to load announcements
function loadAnnouncements() {
    fetch(getAnnouncementsUrl)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const announcementsList = document.getElementById('announcements-list