document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Fix sidebar toggle functionality for all sections
    document.querySelectorAll('.toggle-sidebar').forEach(toggleBtn => {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('sidebar-active');
        });
    });

    // Existing menu items functionality
    const menuItems = document.querySelectorAll('.menu-item');
    const contentSections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        if (!item.getAttribute('onclick')) {  // Skip the logout item
            item.addEventListener('click', () => {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const section = item.getAttribute('data-section');
                contentSections.forEach(section => section.classList.remove('active'));
                document.getElementById(section).classList.add('active');
            });
        }
    });

    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const addEmployeeModal = document.getElementById('addEmployeeModal');
    const closeEmployeeModal = document.getElementById('closeEmployeeModal');
    const cancelEmployeeModal = document.getElementById('cancelEmployeeModal');

    addEmployeeBtn.addEventListener('click', () => {
        addEmployeeModal.style.display = 'flex';
    });

    closeEmployeeModal.addEventListener('click', () => {
        addEmployeeModal.style.display = 'none';
    });

    cancelEmployeeModal.addEventListener('click', () => {
        addEmployeeModal.style.display = 'none';
    });

    const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');

    saveEmployeeBtn.addEventListener('click', () => {
        const citizenId = document.getElementById('employeeCitizenId').value;
        const email = document.getElementById('employeeEmail').value;
        const designation = document.getElementById('employeeDesignation').value;
        const joinDate = document.getElementById('employeeJoinDate').value;
        const endDate = document.getElementById('employeeEndDate').value;
        const department = document.getElementById('employeeDepartment').value;
        const type = document.getElementById('employeeType').value;
        const salary = document.getElementById('employeeSalary').value;
        
        // Removed panchayat parameter

        fetch('/add_employee', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                citizen_id: citizenId, 
                email, 
                designation, 
                join_date: joinDate, 
                end_date: endDate, 
                department, 
                type, 
                salary
                // Removed panchayat from the request
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to add employee: ' + data.message);
            }
        });
    });

    const addCitizenBtn = document.getElementById('addCitizenBtn');
    const addCitizenModal = document.getElementById('addCitizenModal');
    const closeAddCitizenModal = document.getElementById('closeAddCitizenModal');
    const cancelAddCitizenModal = document.getElementById('cancelAddCitizenModal');
    const saveAddCitizenBtn = document.getElementById('saveAddCitizenBtn');

    addCitizenBtn.addEventListener('click', () => {
        // Clear the form fields
        document.getElementById('addCitizenFirstName').value = '';
        document.getElementById('addCitizenLastName').value = '';
        document.getElementById('addCitizenPanchayat').value = '';
        document.getElementById('addCitizenGender').value = '';
        document.getElementById('addCitizenDOB').value = '';
        document.getElementById('addCitizenEducation').value = '';
        document.getElementById('addCitizenOccupation').value = '';
        document.getElementById('addCitizenIncome').value = '';
        document.getElementById('addCitizenTaxDue').value = '';
        document.getElementById('addCitizenMaritalStatus').value = '';
        document.getElementById('addCitizenPhone').value = '';
        document.getElementById('addCitizenEmail').value = '';
        document.getElementById('addCitizenHousehold').value = '';

        // Show the modal
        addCitizenModal.style.display = 'flex';
    });

    closeAddCitizenModal.addEventListener('click', () => {
        addCitizenModal.style.display = 'none';
    });

    cancelAddCitizenModal.addEventListener('click', () => {
        addCitizenModal.style.display = 'none';
    });

    saveAddCitizenBtn.addEventListener('click', () => {
        const firstName = document.getElementById('addCitizenFirstName').value;
        const lastName = document.getElementById('addCitizenLastName').value;
        const panchayatId = document.getElementById('addCitizenPanchayat').value;
        const gender = document.getElementById('addCitizenGender').value;
        const dob = document.getElementById('addCitizenDOB').value;
        const education = document.getElementById('addCitizenEducation').value;
        const occupation = document.getElementById('addCitizenOccupation').value;
        const income = document.getElementById('addCitizenIncome').value;
        const taxDue = document.getElementById('addCitizenTaxDue').value;
        const maritalStatus = document.getElementById('addCitizenMaritalStatus').value;
        const phone = document.getElementById('addCitizenPhone').value;
        const email = document.getElementById('addCitizenEmail').value;
        const householdId = document.getElementById('addCitizenHousehold').value;

        if (!firstName || !lastName || !panchayatId || !gender || !dob || !education || !occupation || !income || !taxDue || !maritalStatus || !phone || !email) {
            alert('All fields except Household ID are required.');
            return;
        }

        const citizenData = {
            first_name: firstName,
            last_name: lastName,
            panchayat_id: panchayatId,
            gender: gender,
            dob: dob,
            educational_qualification: education,
            occupation: occupation,
            annual_income: income,
            tax_due_amount: taxDue,
            marital_status: maritalStatus,
            phone_number: phone,
            email: email,
            household_id: householdId || null
        };

        fetch('/add_citizen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(citizenData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to add citizen: ' + data.message);
            }
        });
    });

    document.querySelectorAll('.delete-citizen').forEach(button => {
        button.addEventListener('click', () => {
            const citizenId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this citizen?')) {
                fetch(`/delete_citizen/${citizenId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Failed to delete citizen: ' + data.message);
                    }
                });
            }
        });
    });

    const editCitizenModal = document.getElementById('editCitizenModal');
    const closeEditCitizenModal = document.getElementById('closeEditCitizenModal');
    const cancelEditCitizenModal = document.getElementById('cancelEditCitizenModal');
    const updateCitizenBtn = document.getElementById('updateCitizenBtn');

    document.querySelectorAll('.edit-citizen').forEach(button => {
        button.addEventListener('click', () => {
            const citizenId = button.getAttribute('data-id');
            fetch(`/get_citizen/${citizenId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('editCitizenFirstName').value = data.citizen.first_name;
                        document.getElementById('editCitizenLastName').value = data.citizen.last_name;
                        document.getElementById('editCitizenPanchayat').value = data.citizen.panchayat_id;
                        document.getElementById('editCitizenGender').value = data.citizen.gender;
                        document.getElementById('editCitizenDOB').value = data.citizen.dob.split('T')[0]; // Ensure date format
                        document.getElementById('editCitizenEducation').value = data.citizen.educational_qualification;
                        document.getElementById('editCitizenOccupation').value = data.citizen.occupation;
                        document.getElementById('editCitizenIncome').value = data.citizen.annual_income;
                        document.getElementById('editCitizenTaxDue').value = data.citizen.tax_due_amount;
                        document.getElementById('editCitizenMaritalStatus').value = data.citizen.marital_status;
                        document.getElementById('editCitizenPhone').value = data.citizen.phone_number;
                        document.getElementById('editCitizenEmail').value = data.citizen.email;
                        document.getElementById('editCitizenHousehold').value = data.citizen.household_id || '';
                        updateCitizenBtn.setAttribute('data-id', citizenId);
                        editCitizenModal.style.display = 'flex';
                    } else {
                        alert('Failed to fetch citizen details: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('Error fetching citizen details: ' + error.message);
                });
        });
    });

    closeEditCitizenModal.addEventListener('click', () => {
        editCitizenModal.style.display = 'none';
    });

    cancelEditCitizenModal.addEventListener('click', () => {
        editCitizenModal.style.display = 'none';
    });

    updateCitizenBtn.addEventListener('click', () => {
        const citizenId = updateCitizenBtn.getAttribute('data-id');
        const firstName = document.getElementById('editCitizenFirstName').value;
        const lastName = document.getElementById('editCitizenLastName').value;
        const panchayatId = document.getElementById('editCitizenPanchayat').value;
        const gender = document.getElementById('editCitizenGender').value;
        const dob = document.getElementById('editCitizenDOB').value;
        const education = document.getElementById('editCitizenEducation').value;
        const occupation = document.getElementById('editCitizenOccupation').value;
        const income = document.getElementById('editCitizenIncome').value;
        const taxDue = document.getElementById('editCitizenTaxDue').value;
        const maritalStatus = document.getElementById('editCitizenMaritalStatus').value;
        const phone = document.getElementById('editCitizenPhone').value;
        const email = document.getElementById('editCitizenEmail').value;
        const householdId = document.getElementById('editCitizenHousehold').value;

        const password = document.getElementById('editCitizenPassword') ? document.getElementById('editCitizenPassword').value : '';

        const updateData = {
            first_name: firstName,
            last_name: lastName,
            panchayat_id: panchayatId,
            gender: gender,
            dob: dob,
            educational_qualification: education,
            occupation: occupation,
            annual_income: income,
            tax_due_amount: taxDue,
            marital_status: maritalStatus,
            phone_number: phone,
            email: email,
            household_id: householdId || null,
            password: password
        };

        fetch(`/update_citizen/${citizenId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to update citizen: ' + data.message);
            }
        })
        .catch(error => {
            alert('Error updating citizen: ' + error.message);
        });
    });

    function confirmLogout() {
        if (confirm("Are you sure you wish to logout?")) {
            fetch('/logout', {
                method: 'POST'
            })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/landing';
                } else {
                    alert('Logout failed');
                }
            });
        }
    }

    document.querySelector('.menu-item[onclick="confirmLogout()"]').addEventListener('click', (event) => {
        event.preventDefault();
        confirmLogout();
    });

    // Search functionality for Employees
    const employeeSearch = document.getElementById('employeeSearch');
    const employeeTableBody = document.getElementById('employeeTableBody');
    employeeSearch.addEventListener('input', () => {
        const searchValue = employeeSearch.value.toLowerCase();
        const rows = employeeTableBody.getElementsByTagName('tr');
        for (let row of rows) {
            const nameCell = row.getElementsByTagName('td')[1];
            if (nameCell) {
                const name = nameCell.textContent.toLowerCase();
                row.style.display = name.includes(searchValue) ? '' : 'none';
            }
        }
    });

    // Search functionality for Citizens
    const citizenSearch = document.getElementById('citizenSearch');
    const citizenTableBody = document.getElementById('citizenTableBody');
    citizenSearch.addEventListener('input', () => {
        const searchValue = citizenSearch.value.toLowerCase();
        const rows = citizenTableBody.getElementsByTagName('tr');
        for (let row of rows) {
            const nameCell = row.getElementsByTagName('td')[1];
            if (nameCell) {
                const name = nameCell.textContent.toLowerCase();
                row.style.display = name.includes(searchValue) ? '' : 'none';
            }
        }
    });

    // Search functionality for Offices
    const officeSearch = document.getElementById('officeSearch');
    const officeTableBody = document.getElementById('officeTableBody');
    officeSearch.addEventListener('input', () => {
        const searchValue = officeSearch.value.toLowerCase();
        const rows = officeTableBody.getElementsByTagName('tr');
        for (let row of rows) {
            const nameCell = row.getElementsByTagName('td')[1];
            if (nameCell) {
                const name = nameCell.textContent.toLowerCase();
                row.style.display = name.includes(searchValue) ? '' : 'none';
            }
        }
    });

    const addOfficeBtn = document.getElementById('addOfficeBtn');
    const addOfficeModal = document.getElementById('addOfficeModal');
    const closeOfficeModal = document.getElementById('closeOfficeModal');
    const cancelOfficeModal = document.getElementById('cancelOfficeModal');
    const saveOfficeBtn = document.getElementById('saveOfficeBtn');

    addOfficeBtn.addEventListener('click', () => {
        addOfficeModal.style.display = 'flex';
    });

    closeOfficeModal.addEventListener('click', () => {
        addOfficeModal.style.display = 'none';
    });

    cancelOfficeModal.addEventListener('click', () => {
        addOfficeModal.style.display = 'none';
    });

    saveOfficeBtn.addEventListener('click', () => {
        const officeName = document.getElementById('officeName').value;
        const establishmentDate = document.getElementById('establishmentDate').value;
        const officeArea = document.getElementById('officeArea').value;
        const officeEmail = document.getElementById('officeEmail').value;
        const officePhone = document.getElementById('officePhone').value;
        const blockName = document.getElementById('blockName').value;
        const districtName = document.getElementById('districtName').value;
        const stateName = document.getElementById('stateName').value;
        const pinCode = document.getElementById('pinCode').value;
        const country = document.getElementById('country').value;

        if (!officeName || !establishmentDate || !officeArea || !officeEmail || !officePhone || !blockName || !districtName || !stateName || !pinCode || !country) {
            alert('All fields are required.');
            return;
        }

        const addressData = {
            block_name: blockName,
            district_name: districtName,
            state_name: stateName,
            pin_code: pinCode,
            country: country
        };

        fetch('/add_address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const addressId = data.address_id;
                const panchayatData = {
                    panchayat_name: officeName,
                    establishment_date: establishmentDate,
                    area_sq_km: officeArea,
                    contact_email: officeEmail,
                    contact_phone: officePhone,
                    address_id: addressId
                };

                return fetch('/add_panchayat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(panchayatData)
                });
            } else {
                throw new Error('Failed to add address: ' + data.message);
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to add panchayat: ' + data.message);
            }
        })
        .catch(error => {
            alert(error.message);
        });
    });

    const editPanchayatModal = document.getElementById('editPanchayatModal');
    const closeEditPanchayatModal = document.getElementById('closeEditPanchayatModal');
    const cancelEditPanchayatModal = document.getElementById('cancelEditPanchayatModal');
    const updatePanchayatBtn = document.getElementById('updatePanchayatBtn');

    document.querySelectorAll('.edit-panchayat').forEach(button => {
        button.addEventListener('click', () => {
            const panchayatId = button.getAttribute('data-id');
            fetch(`/get_panchayat/${panchayatId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('editPanchayatName').value = data.panchayat.panchayat_name;
                        document.getElementById('editEstablishmentDate').value = data.panchayat.establishment_date.split('T')[0];
                        document.getElementById('editPanchayatArea').value = data.panchayat.area_sq_km;
                        document.getElementById('editPanchayatEmail').value = data.panchayat.contact_email;
                        document.getElementById('editPanchayatPhone').value = data.panchayat.contact_phone;
                        document.getElementById('editBlockName').value = data.panchayat.block_name;
                        document.getElementById('editDistrictName').value = data.panchayat.district_name;
                        document.getElementById('editStateName').value = data.panchayat.state_name;
                        document.getElementById('editPinCode').value = data.panchayat.pin_code;
                        document.getElementById('editCountry').value = data.panchayat.country;
                        updatePanchayatBtn.setAttribute('data-id', panchayatId);
                        editPanchayatModal.style.display = 'flex';
                    } else {
                        alert('Failed to fetch panchayat details');
                    }
                });
        });
    });

    closeEditPanchayatModal.addEventListener('click', () => {
        editPanchayatModal.style.display = 'none';
    });

    cancelEditPanchayatModal.addEventListener('click', () => {
        editPanchayatModal.style.display = 'none';
    });

    updatePanchayatBtn.addEventListener('click', () => {
        const panchayatId = updatePanchayatBtn.getAttribute('data-id');
        const panchayatName = document.getElementById('editPanchayatName').value;
        const establishmentDate = document.getElementById('editEstablishmentDate').value;
        const area = document.getElementById('editPanchayatArea').value;
        const contactEmail = document.getElementById('editPanchayatEmail').value;
        const contactPhone = document.getElementById('editPanchayatPhone').value;
        const blockName = document.getElementById('editBlockName').value;
        const districtName = document.getElementById('editDistrictName').value;
        const stateName = document.getElementById('editStateName').value;
        const pinCode = document.getElementById('editPinCode').value;
        const country = document.getElementById('editCountry').value;

        const updateData = {
            panchayat_name: panchayatName,
            establishment_date: establishmentDate,
            area_sq_km: area,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            block_name: blockName,
            district_name: districtName,
            state_name: stateName,
            pin_code: pinCode,
            country: country
        };

        fetch(`/update_panchayat/${panchayatId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to update panchayat');
            }
        });
    });

    document.querySelectorAll('.delete-panchayat').forEach(button => {
        button.addEventListener('click', () => {
            const panchayatId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this panchayat?')) {
                fetch(`/delete_panchayat/${panchayatId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Failed to delete panchayat: ' + data.message);
                    }
                });
            }
        });
    });

    const editEmployeeModal = document.getElementById('editEmployeeModal');
    const closeEditEmployeeModal = document.getElementById('closeEditEmployeeModal');
    const cancelEditEmployeeModal = document.getElementById('cancelEditEmployeeModal');
    const updateEmployeeBtn = document.getElementById('updateEmployeeBtn');

    document.querySelectorAll('.edit-employee').forEach(button => {
        button.addEventListener('click', () => {
            const employeeId = button.getAttribute('data-id');
            fetch(`/get_employee/${employeeId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('editEmployeePanchayat').value = data.employee.panchayat;
                        document.getElementById('editEmployeePosition').value = data.employee.position;
                        document.getElementById('editEmployeeEndDate').value = data.employee.end_date.split('T')[0]; // Ensure date format
                        document.getElementById('editEmployeeSalary').value = data.employee.salary;
                        document.getElementById('editEmployeeType').value = data.employee.type;
                        updateEmployeeBtn.setAttribute('data-id', employeeId);
                        editEmployeeModal.style.display = 'flex';
                    } else {
                        alert('Failed to fetch employee details');
                    }
                });
        });
    });

    closeEditEmployeeModal.addEventListener('click', () => {
        editEmployeeModal.style.display = 'none';
    });

    cancelEditEmployeeModal.addEventListener('click', () => {
        editEmployeeModal.style.display = 'none';
    });

    updateEmployeeBtn.addEventListener('click', () => {
        const employeeId = updateEmployeeBtn.getAttribute('data-id');
        const panchayat = document.getElementById('editEmployeePanchayat').value;
        const position = document.getElementById('editEmployeePosition').value;
        const endDate = document.getElementById('editEmployeeEndDate').value;
        const salary = document.getElementById('editEmployeeSalary').value;
        const type = document.getElementById('editEmployeeType').value;

        const password = document.getElementById('editEmployeePassword') ? document.getElementById('editEmployeePassword').value : '';

        const updateData = {
            panchayat: panchayat,
            position: position,
            end_date: endDate,
            salary: salary,
            type: type,
            password: password
        };

        fetch(`/update_employee/${employeeId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to update employee');
            }
        });
    });

    const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
    const addAnnouncementModal = document.getElementById('addAnnouncementModal');
    const closeAnnouncementModal = document.getElementById('closeAnnouncementModal');
    const cancelAnnouncementModal = document.getElementById('cancelAnnouncementModal');
    const saveAnnouncementBtn = document.getElementById('saveAnnouncementBtn');

    addAnnouncementBtn.addEventListener('click', () => {
        // Clear the form fields
        document.getElementById('announcementHeading').value = '';
        document.getElementById('announcementDetail').value = '';

        // Show the modal
        addAnnouncementModal.style.display = 'flex';
    });

    closeAnnouncementModal.addEventListener('click', () => {
        addAnnouncementModal.style.display = 'none';
    });

    cancelAnnouncementModal.addEventListener('click', () => {
        addAnnouncementModal.style.display = 'none';
    });

    saveAnnouncementBtn.addEventListener('click', () => {
        const heading = document.getElementById('announcementHeading').value;
        const detail = document.getElementById('announcementDetail').value;

        if (!heading || !detail) {
            alert('Both heading and detail are required.');
            return;
        }

        const announcementData = {
            heading: heading,
            detail: detail
        };

        fetch('/add_announcement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(announcementData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to add announcement: ' + data.message);
            }
        })
        .catch(error => {
            alert('Error adding announcement: ' + error.message);
        });
    });

    document.querySelectorAll('.delete-announcement').forEach(button => {
        button.addEventListener('click', () => {
            const announcementId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this announcement?')) {
                fetch(`/delete_announcement/${announcementId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Failed to delete announcement: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('Error deleting announcement: ' + error.message);
                });
            }
        });
    });

    const editAnnouncementModal = document.getElementById('editAnnouncementModal');
    const closeEditAnnouncementModal = document.getElementById('closeEditAnnouncementModal');
    const cancelEditAnnouncementModal = document.getElementById('cancelEditAnnouncementModal');
    const updateAnnouncementBtn = document.getElementById('updateAnnouncementBtn');

    document.querySelectorAll('.edit-announcement').forEach(button => {
        button.addEventListener('click', () => {
            const announcementId = button.getAttribute('data-id');
            fetch(`/get_announcement/${announcementId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('editAnnouncementHeading').value = data.announcement.heading;
                        document.getElementById('editAnnouncementDetail').value = data.announcement.detail;
                        updateAnnouncementBtn.setAttribute('data-id', announcementId);
                        editAnnouncementModal.style.display = 'flex';
                    } else {
                        alert('Failed to fetch announcement details: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('Error fetching announcement details: ' + error.message);
                });
        });
    });

    closeEditAnnouncementModal.addEventListener('click', () => {
        editAnnouncementModal.style.display = 'none';
    });

    cancelEditAnnouncementModal.addEventListener('click', () => {
        editAnnouncementModal.style.display = 'none';
    });

    updateAnnouncementBtn.addEventListener('click', () => {
        const announcementId = updateAnnouncementBtn.getAttribute('data-id');
        const heading = document.getElementById('editAnnouncementHeading').value;
        const detail = document.getElementById('editAnnouncementDetail').value;

        if (!heading || !detail) {
            alert('Both heading and detail are required.');
            return;
        }

        const updateData = {
            heading: heading,
            detail: detail
        };

        fetch(`/update_announcement/${announcementId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Failed to update announcement: ' + data.message);
            }
        })
        .catch(error => {
            alert('Error updating announcement: ' + error.message);
        });
    });

    function populateEmployeeTable(employees) {
        const employeeTableBody = document.getElementById('employeeTableBody');
        employeeTableBody.innerHTML = '';

        employees.forEach(employee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.name}</td>
                <td>${employee.position}</td>
                <td>${employee.department}</td>
                <td>${employee.status}</td>
                <td>
                    <button class="edit-employee" data-id="${employee.id}">Edit</button>
                    <button class="delete-employee" data-id="${employee.id}">Delete</button>
                </td>
            `;
            employeeTableBody.appendChild(row);
        });
    }

    // Add details functionality for panchayat offices
    const panchayatDetailsModal = document.getElementById('panchayatDetailsModal');
    const closePanchayatDetailsModal = document.getElementById('closePanchayatDetailsModal');
    const panchayatDetailsContent = document.getElementById('panchayatDetailsContent');
    
    document.querySelectorAll('.view-panchayat-details').forEach(button => {
        button.addEventListener('click', () => {
            const panchayatId = button.getAttribute('data-id');
            fetch(`/get_panchayat/${panchayatId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const panchayat = data.panchayat;
                        // Fix for undefined office ID
                        const officeId = panchayat.id || panchayatId;
                        
                        panchayatDetailsContent.innerHTML = `
                            <div class="details-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Office ID:</span>
                                    <span class="detail-value">${officeId}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Name:</span>
                                    <span class="detail-value">${panchayat.panchayat_name}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Establishment Date:</span>
                                    <span class="detail-value">${new Date(panchayat.establishment_date).toLocaleDateString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Area (sq km):</span>
                                    <span class="detail-value">${panchayat.area_sq_km}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Email:</span>
                                    <span class="detail-value">${panchayat.contact_email}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Phone:</span>
                                    <span class="detail-value">${panchayat.contact_phone}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Address:</span>
                                    <span class="detail-value">${panchayat.block_name}, ${panchayat.district_name}, ${panchayat.state_name}, ${panchayat.pin_code}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Country:</span>
                                    <span class="detail-value">${panchayat.country}</span>
                                </div>
                            </div>
                        `;
                        panchayatDetailsModal.style.display = 'flex';
                    } else {
                        alert('Failed to fetch panchayat details');
                    }
                });
        });
    });
    
    if (closePanchayatDetailsModal) {
        closePanchayatDetailsModal.addEventListener('click', () => {
            panchayatDetailsModal.style.display = 'none';
        });
    }

    // Add details functionality for citizens
    const citizenDetailsModal = document.getElementById('citizenDetailsModal');
    const closeCitizenDetailsModal = document.getElementById('closeCitizenDetailsModal');
    const citizenDetailsContent = document.getElementById('citizenDetailsContent');
    
    document.querySelectorAll('.view-citizen-details').forEach(button => {
        button.addEventListener('click', () => {
            const citizenId = button.getAttribute('data-id');
            fetch(`/get_citizen/${citizenId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const citizen = data.citizen;
                        let age = new Date().getFullYear() - new Date(citizen.dob).getFullYear();
                        
                        // Debug output to check what's coming from the server
                        console.log("Citizen data:", citizen);
                        
                        // Create registration status display
                        let registrationStatus;
                        
                        // Check if user_id exists and is not null
                        if (citizen.user_id) {
                            registrationStatus = `
                                <div class="detail-item">
                                    <span class="detail-label">Registration Status:</span>
                                    <span class="detail-value">Registered (User ID: ${citizen.user_id})</span>
                                </div>`;
                        } else {
                            registrationStatus = `
                                <div class="detail-item">
                                    <span class="detail-label">Registration Status:</span>
                                    <span class="detail-value">Not Registered</span>
                                </div>`;
                        }
                        
                        // First create and display the citizen details
                        citizenDetailsContent.innerHTML = `
                            <div class="details-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Citizen ID:</span>
                                    <span class="detail-value">${citizenId}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Name:</span>
                                    <span class="detail-value">${citizen.first_name} ${citizen.last_name}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Gender:</span>
                                    <span class="detail-value">${citizen.gender}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Date of Birth:</span>
                                    <span class="detail-value">${new Date(citizen.dob).toLocaleDateString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Age:</span>
                                    <span class="detail-value">${age} years</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Education:</span>
                                    <span class="detail-value">${citizen.educational_qualification}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Occupation:</span>
                                    <span class="detail-value">${citizen.occupation}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Income:</span>
                                    <span class="detail-value">₹${citizen.annual_income}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Tax Due:</span>
                                    <span class="detail-value">₹${citizen.tax_due_amount}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Marital Status:</span>
                                    <span class="detail-value">${citizen.marital_status.replace('_', ' ')}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Phone:</span>
                                    <span class="detail-value">${citizen.phone_number}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Email:</span>
                                    <span class="detail-value">${citizen.email}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Panchayat:</span>
                                    <span class="detail-value">${citizen.panchayat_name || 'Not Specified'} (ID: ${citizen.panchayat_id || 'N/A'})</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Household ID:</span>
                                    <span class="detail-value">${citizen.household_id || 'Not Assigned'}</span>
                                </div>
                                ${registrationStatus}
                                <div id="employeeStatusDetail" class="detail-item">
                                    <span class="detail-label">Employee Status:</span>
                                    <span class="detail-value">Checking...</span>
                                </div>
                            </div>
                        `;
                        
                        citizenDetailsModal.style.display = 'flex';
                        
                        // Then fetch employee data separately
                        fetch(`/check_citizen_employee/${citizenId}`)
                            .then(response => response.json())
                            .then(empData => {
                                const employeeStatusElement = document.getElementById('employeeStatusDetail');
                                if (empData.isEmployee) {
                                    employeeStatusElement.innerHTML = `
                                        <span class="detail-label">Employee Status:</span>
                                        <span class="detail-value">Employee (ID: ${empData.employeeId})</span>
                                    `;
                                } else {
                                    employeeStatusElement.innerHTML = `
                                        <span class="detail-label">Employee Status:</span>
                                        <span class="detail-value">Not an Employee</span>
                                    `;
                                }
                            })
                            .catch(error => {
                                const employeeStatusElement = document.getElementById('employeeStatusDetail');
                                employeeStatusElement.innerHTML = `
                                    <span class="detail-label">Employee Status:</span>
                                    <span class="detail-value">Error checking status</span>
                                `;
                            });
                    } else {
                        alert('Failed to fetch citizen details: ' + data.message);
                    }
                });
        });
    });
    
    if (closeCitizenDetailsModal) {
        closeCitizenDetailsModal.addEventListener('click', () => {
            citizenDetailsModal.style.display = 'none';
        });
    }

    // Add details functionality for employees
    const employeeDetailsModal = document.getElementById('employeeDetailsModal');
    const closeEmployeeDetailsModal = document.getElementById('closeEmployeeDetailsModal');
    const employeeDetailsContent = document.getElementById('employeeDetailsContent');
    
    document.querySelectorAll('.view-employee-details').forEach(button => {
        button.addEventListener('click', () => {
            const employeeId = button.getAttribute('data-id');
            fetch(`/get_employee/${employeeId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const employee = data.employee;
                        
                        // Format dates properly
                        const joinDate = employee.join_date ? new Date(employee.join_date).toLocaleDateString() : 'N/A';
                        const endDate = employee.end_date ? new Date(employee.end_date).toLocaleDateString() : 'N/A';
                        
                        employeeDetailsContent.innerHTML = `
                            <div class="details-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Employee ID:</span>
                                    <span class="detail-value">${employee.id || employeeId}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Name:</span>
                                    <span class="detail-value">${employee.first_name} ${employee.last_name}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Citizen ID:</span>
                                    <span class="detail-value">${employee.citizen_id || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Position:</span>
                                    <span class="detail-value">${employee.designation || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Department:</span>
                                    <span class="detail-value">${employee.department || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Employment Type:</span>
                                    <span class="detail-value">${employee.employment_type || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Join Date:</span>
                                    <span class="detail-value">${joinDate}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">End Date:</span>
                                    <span class="detail-value">${endDate}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Salary:</span>
                                    <span class="detail-value">₹${employee.salary || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Panchayat:</span>
                                    <span class="detail-value">${employee.panchayat || 'N/A'} ${employee.panchayat_id ? '(ID: ' + employee.panchayat_id + ')' : ''}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Email:</span>
                                    <span class="detail-value">${employee.email || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">User ID:</span>
                                    <span class="detail-value">${employee.user_id || 'N/A'}</span>
                                </div>
                            </div>
                        `;
                        employeeDetailsModal.style.display = 'flex';
                    } else {
                        alert('Failed to fetch employee details: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error("Error fetching employee details:", error);
                    alert('An error occurred while fetching employee details');
                });
        });
    });
    
    if (closeEmployeeDetailsModal) {
        closeEmployeeDetailsModal.addEventListener('click', () => {
            employeeDetailsModal.style.display = 'none';
        });
    }

    // Add delete employee functionality
    document.querySelectorAll('.btn-danger.delete-employee').forEach(button => {
        button.addEventListener('click', () => {
            const employeeId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this employee? They will still remain as a citizen but will no longer be employed.')) {
                fetch(`/delete_employee/${employeeId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Remove the row from the table or reload the page
                        location.reload();
                    } else {
                        alert('Failed to delete employee: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error("Error deleting employee:", error);
                    alert('An error occurred while deleting the employee');
                });
            }
        });
    });

    // Close all modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === panchayatDetailsModal) {
            panchayatDetailsModal.style.display = 'none';
        }
        if (event.target === citizenDetailsModal) {
            citizenDetailsModal.style.display = 'none';
        }
        if (event.target === employeeDetailsModal) {
            employeeDetailsModal.style.display = 'none';
        }
        const adminResetPasswordModal = document.getElementById('adminResetPasswordModal');
        if (event.target === adminResetPasswordModal) {
            adminResetPasswordModal.style.display = 'none';
        }
    });

    // Dedicated Reset Password Modal Logic
    const adminResetPasswordModal = document.getElementById('adminResetPasswordModal');
    const closeResetPasswordModal = document.getElementById('closeResetPasswordModal');
    const cancelResetPasswordModal = document.getElementById('cancelResetPasswordModal');
    const confirmResetPasswordBtn = document.getElementById('confirmResetPasswordBtn');
    const resetPasswordTargetName = document.getElementById('resetPasswordTargetName');
    const resetPasswordTargetType = document.getElementById('resetPasswordTargetType');
    const resetPasswordTargetId = document.getElementById('resetPasswordTargetId');
    const newResetPasswordInput = document.getElementById('newResetPasswordInput');

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.reset-password-btn');
        if (btn) {
            e.preventDefault();
            const type = btn.getAttribute('data-type');
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name') || 'User';

            if (resetPasswordTargetType) resetPasswordTargetType.value = type;
            if (resetPasswordTargetId) resetPasswordTargetId.value = id;
            if (resetPasswordTargetName) resetPasswordTargetName.textContent = `${name} (${type.toUpperCase()} ID: ${id})`;
            if (newResetPasswordInput) newResetPasswordInput.value = '';
            
            if (adminResetPasswordModal) {
                adminResetPasswordModal.style.display = 'flex';
            }
        }
    });

    if (closeResetPasswordModal) {
        closeResetPasswordModal.addEventListener('click', () => {
            adminResetPasswordModal.style.display = 'none';
        });
    }

    if (cancelResetPasswordModal) {
        cancelResetPasswordModal.addEventListener('click', () => {
            adminResetPasswordModal.style.display = 'none';
        });
    }

    if (confirmResetPasswordBtn) {
        confirmResetPasswordBtn.addEventListener('click', () => {
            const type = resetPasswordTargetType ? resetPasswordTargetType.value : '';
            const id = resetPasswordTargetId ? resetPasswordTargetId.value : '';
            const newPassword = newResetPasswordInput ? newResetPasswordInput.value : '';

            if (!newPassword || !newPassword.trim()) {
                alert('Please enter a valid new password.');
                return;
            }

            fetch('/admin/reset_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type, id: id, new_password: newPassword.trim() })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Password updated successfully!');
                    adminResetPasswordModal.style.display = 'none';
                } else {
                    alert('Failed to reset password: ' + data.message);
                }
            })
            .catch(err => {
                alert('Error resetting password: ' + err.message);
            });
        });
    }

    // Approval / Action History Logic
    let currentActionHistoryPage = 1;
    let actionHistorySearchTimeout = null;

    function loadActionHistory(page = 1, search = '') {
        const tbody = document.getElementById('actionHistoryTableBody');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading action history...</td></tr>`;

        const url = `/api/action_history?page=${page}&per_page=25&search=${encodeURIComponent(search)}`;
        fetch(url)
            .then(response => response.json())
            .then(res => {
                if (res.success) {
                    currentActionHistoryPage = res.page;
                    renderActionHistoryTable(res.data);
                    renderActionHistoryPagination(res.page, res.total_pages, res.total_items, res.per_page);
                } else {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red; padding: 20px;">Failed to load history: ${res.message}</td></tr>`;
                }
            })
            .catch(err => {
                console.error("Action History Error:", err);
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red; padding: 20px;">An error occurred while fetching history data.</td></tr>`;
            });
    }

    function renderActionHistoryTable(records) {
        const tbody = document.getElementById('actionHistoryTableBody');
        if (!tbody) return;

        if (!records || records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #6c757d;">No application actions or history records found.</td></tr>`;
            return;
        }

        let html = '';
        records.forEach(item => {
            let statusBadge = '';
            const statusUpper = (item.action_taken || '').toUpperCase();
            if (statusUpper.includes('APPROVED') || statusUpper.includes('RESOLVED') || statusUpper.includes('ENROLLED') || statusUpper.includes('COMPLETED')) {
                statusBadge = `<span class="badge" style="background-color: #28a745; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;"><i class="fas fa-check-circle"></i> ${item.action_taken}</span>`;
            } else if (statusUpper.includes('DECLINED') || statusUpper.includes('REJECTED')) {
                statusBadge = `<span class="badge" style="background-color: #dc3545; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;"><i class="fas fa-times-circle"></i> ${item.action_taken}</span>`;
            } else {
                statusBadge = `<span class="badge" style="background-color: #6c757d; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">${item.action_taken}</span>`;
            }

            let docButton = '';
            if (item.generated_doc_path) {
                docButton = `<a href="${item.generated_doc_path}" target="_blank" class="btn btn-sm btn-outline-primary" style="padding: 4px 8px; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid #007bff; border-radius: 4px; color: #007bff;"><i class="fas fa-file-download"></i> View / PDF</a>`;
            } else {
                docButton = `<span style="color: #6c757d; font-size: 12px;">N/A</span>`;
            }

            html += `
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px; font-size: 13px;">${item.action_date}</td>
                    <td style="padding: 10px; font-size: 13px; font-weight: 600; color: #073763;">${item.document_tracking_id}</td>
                    <td style="padding: 10px; font-size: 13px;"><span style="text-transform: capitalize; font-weight: 600;">${item.module_type}</span> (${item.doc_type})</td>
                    <td style="padding: 10px; font-size: 13px;">${item.target_citizen_name} <br><small style="color: #6c757d;">(ID: ${item.target_citizen_id || 'N/A'})</small></td>
                    <td style="padding: 10px; font-size: 13px;">${item.action_by_name} <br><small style="color: #6c757d;">(ID: ${item.action_by_user_id} - ${item.action_by_role})</small></td>
                    <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 10px; text-align: center;">${docButton}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    function renderActionHistoryPagination(currentPage, totalPages, totalItems, perPage) {
        const pageInfo = document.getElementById('actionHistoryPageInfo');
        const prevBtn = document.getElementById('actionHistoryPrevBtn');
        const nextBtn = document.getElementById('actionHistoryNextBtn');
        const pageNumbers = document.getElementById('actionHistoryPageNumbers');

        if (pageInfo) {
            const start = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
            const end = Math.min(currentPage * perPage, totalItems);
            pageInfo.textContent = `Showing ${start} to ${end} of ${totalItems} entries`;
        }

        if (prevBtn) {
            prevBtn.disabled = (currentPage <= 1);
            prevBtn.onclick = () => {
                if (currentPage > 1) {
                    const searchVal = document.getElementById('actionHistorySearchInput')?.value || '';
                    loadActionHistory(currentPage - 1, searchVal);
                }
            };
        }

        if (nextBtn) {
            nextBtn.disabled = (currentPage >= totalPages);
            nextBtn.onclick = () => {
                if (currentPage < totalPages) {
                    const searchVal = document.getElementById('actionHistorySearchInput')?.value || '';
                    loadActionHistory(currentPage + 1, searchVal);
                }
            };
        }

        if (pageNumbers) {
            let numHtml = '';
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentPage) {
                    numHtml += `<button class="btn btn-primary btn-sm" style="font-weight: bold; padding: 4px 10px;">${i}</button>`;
                } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                    numHtml += `<button class="btn btn-outline-secondary btn-sm action-history-page-btn" data-page="${i}" style="padding: 4px 10px;">${i}</button>`;
                } else if (i === currentPage - 3 || i === currentPage + 3) {
                    numHtml += `<span style="padding: 4px 6px;">...</span>`;
                }
            }
            pageNumbers.innerHTML = numHtml;

            pageNumbers.querySelectorAll('.action-history-page-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const p = parseInt(e.target.getAttribute('data-page'));
                    const searchVal = document.getElementById('actionHistorySearchInput')?.value || '';
                    loadActionHistory(p, searchVal);
                });
            });
        }
    }

    // Attach listeners for action history controls
    const searchInput = document.getElementById('actionHistorySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(actionHistorySearchTimeout);
            actionHistorySearchTimeout = setTimeout(() => {
                loadActionHistory(1, e.target.value);
            }, 300);
        });
    }

    const refreshBtn = document.getElementById('refreshActionHistoryBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const searchVal = searchInput?.value || '';
            loadActionHistory(currentActionHistoryPage, searchVal);
        });
    }

    // Load initial action history when tab is clicked
    document.querySelectorAll('.menu-item[data-section="action_history"]').forEach(item => {
        item.addEventListener('click', () => {
            loadActionHistory(1);
        });
    });
});