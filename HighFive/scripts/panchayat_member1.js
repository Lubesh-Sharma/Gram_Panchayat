// Mock data for demonstration
const memberData = {
    certificate: {
        name: "Anita Sharma",
        id: "MP-2025-001",
        department: "Certificate",
        email: "anita.sharma@panchayat.gov.in",
        phone: "+91 9876543210",
        address: "Ward 3, House #12, Village"
    },
    service: {
        name: "Rajiv Kumar",
        id: "MP-2025-002",
        department: "Service",
        email: "rajiv.kumar@panchayat.gov.in",
        phone: "+91 9876543211",
        address: "Ward 1, House #45, Village"
    },
    budget: {
        name: "Suresh Patel",
        id: "MP-2025-003",
        department: "Budget",
        email: "suresh.patel@panchayat.gov.in",
        phone: "+91 9876543212",
        address: "Ward 2, House #78, Village"
    },
    tax: {
        name: "Meera Singh",
        id: "MP-2025-004",
        department: "Tax",
        email: "meera.singh@panchayat.gov.in",
        phone: "+91 9876543213",
        address: "Ward 4, House #23, Village"
    },
    agriculture: {
        name: "Dinesh Verma",
        id: "MP-2025-005",
        department: "Agriculture",
        email: "dinesh.verma@panchayat.gov.in",
        phone: "+91 9876543214",
        address: "Ward 5, House #56, Village"
    }
};

// Get URL parameter to determine member role (for testing purposes)
const urlParams = new URLSearchParams(window.location.search);
const memberRole = urlParams.get('role') || 'certificate'; // Default to tax if not specified

// Load member profile data based on role
const currentMember = memberData[memberRole];

// Update profile data in the UI
document.getElementById('memberName').innerText = currentMember.name;
document.getElementById('memberRole').innerText = `${currentMember.department} Department`;
document.getElementById('profileName').innerText = currentMember.name;
document.getElementById('profileDepartment').innerText = currentMember.department;
document.getElementById('profileId').innerText = currentMember.id;
document.getElementById('memberAvatar').innerText = currentMember.name.split(' ').map(n => n[0]).join('');

// Update profile section data
document.getElementById('profile-full-name').innerText = currentMember.name;
document.getElementById('profile-member-id').innerText = currentMember.id;
document.getElementById('profile-department').innerText = currentMember.department;
document.getElementById('profile-email').innerText = currentMember.email;
document.getElementById('profile-phone').innerText = currentMember.phone;
document.getElementById('profile-address').innerText = currentMember.address;

// Show only relevant sections based on department
function showDepartmentSections() {
    // Hide all department-specific sections first
    document.querySelectorAll('.department-menu').forEach(item => {
        item.style.display = 'none';
    });

    document.querySelectorAll('.department-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show common sections for all departments
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'block';
    });

    // Show only the current member's department sections
    document.querySelectorAll(`.${memberRole}-dept`).forEach(section => {
        section.style.display = 'block';
    });
}

// Navigation functionality
document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        // Remove 'active' class from all links
        document.querySelectorAll('.sidebar-menu a').forEach(item => {
            item.classList.remove('active');
        });

        // Add 'active' class to clicked link
        this.classList.add('active');

        // Get the section ID to show
        const sectionId = this.getAttribute('data-section');

        // Hide all sections
        document.querySelectorAll('.department-section, .content-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Show the selected section
        const selectedSection = document.getElementById(`${sectionId}-section`);
        if (selectedSection) {
            selectedSection.classList.add('active');
            selectedSection.style.display = 'block';
        }
    });
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function () {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'login.html'; // Redirect to login page
    }
});

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function () {
    // Show dashboard as the default section
    document.querySelector('a[data-section="dashboard"]').click();

    // Show only relevant department sections
    showDepartmentSections();
});
