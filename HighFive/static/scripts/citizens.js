// Mobile Menu Toggle
document.querySelector('.menu-toggle').addEventListener('click', function () {
  document.querySelector('nav').classList.toggle('active');
});



function showWelfareDetails(enrollmentId) {
  // Display the modal
  const modal = document.getElementById('certificate-details-modal');
  modal.style.display = 'flex';

  // COMPLETELY REPLACE the modal's content
  const modalContent = document.querySelector('#certificate-details-modal .modal-content');

  // Show loading indicator
  modalContent.innerHTML = `
    <button class="modal-close" onclick="document.getElementById('certificate-details-modal').style.display='none'">✖</button>
    <h3 class="dashboard-title">Welfare Scheme Details</h3>
    <div style="text-align:center; padding: 20px;">
      <div class="loading-spinner"></div>
      <p>Loading welfare scheme details...</p>
    </div>
  `;

  // Fetch welfare details from server
  fetch(`/get_welfare_details/${enrollmentId}`)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.welfare) {
        // Format dates
        const joinDate = new Date(data.welfare.joining_date);
        const formattedJoinDate = joinDate.toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric'
        });

        const requestDate = new Date(data.welfare.request_date);
        const formattedRequestDate = requestDate.toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric'
        });

        // Get status class for styling
        const statusClass = getStatusClass(data.welfare.status);

        // COMPLETELY REPLACE the modal content
        modalContent.innerHTML = `
          <button class="modal-close" onclick="document.getElementById('certificate-details-modal').style.display='none'">✖</button>
          <h3 class="dashboard-title">Welfare Scheme Details</h3>
          <div class="service-details">
            <div class="details-row">
              <div class="detail-label">Scheme Type:</div>
              <div class="detail-value">${data.welfare.type}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Enrollment ID:</div>
              <div class="detail-value">ENR-${data.welfare.enrollment_id}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Application Date:</div>
              <div class="detail-value">${formattedRequestDate}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Enrollment Date:</div>
              <div class="detail-value">${formattedJoinDate}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">
                <span class="status-badge ${statusClass}">
                  ${data.welfare.status}
                </span>
              </div>
            </div>
            <div class="details-row">
              <div class="detail-label">Scheme Description:</div>
              <div class="detail-value">
                <p>${data.welfare.scheme_description || 'No description available'}</p>
              </div>
            </div>
            <div class="details-row">
              <div class="detail-label">Application Reason:</div>
              <div class="detail-value">
                <p>${data.welfare.description || 'Not provided'}</p>
              </div>
            </div>
          </div>
          <div class="form-actions" style="margin-top:20px;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('certificate-details-modal').style.display='none'">Close</button>
          </div>
        `;
      } else {
        modalContent.innerHTML = `
          <button class="modal-close" onclick="document.getElementById('certificate-details-modal').style.display='none'">✖</button>
          <h3 class="dashboard-title">Welfare Scheme Details</h3>
          <div class="alert" style="background-color:#f8d7da; color:#721c24; padding:1rem; border:1px solid #f5c6cb; border-radius:4px;">
            Error loading welfare scheme details. ${data.message || 'Please try again later.'}
          </div>
          <div class="form-actions" style="margin-top:20px;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('certificate-details-modal').style.display='none'">Close</button>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching welfare details:', error);
      modalContent.innerHTML = `
        <button class="modal-close" onclick="document.getElementById('certificate-details-modal').style.display='none'">✖</button>
        <h3 class="dashboard-title">Welfare Scheme Details</h3>
        <div class="alert" style="background-color:#f8d7da; color:#721c24; padding:1rem; border:1px solid #f5c6cb; border-radius:4px;">
          An error occurred while loading welfare scheme details. Please try again later.
        </div>
        <div class="form-actions" style="margin-top:20px;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('certificate-details-modal').style.display='none'">Close</button>
        </div>
      `;
    });
}

// Add this helper function if it doesn't already exist

// Helper function to get status class for styling
function getStatusClass(status) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'pending') return 'status-pending';
  if (statusLower === 'approved' || statusLower === 'enrolled') return 'status-approved';
  if (statusLower === 'rejected') return 'status-rejected';
  if (statusLower === 'in progress') return 'status-progress';
  if (statusLower === 'resolved' || statusLower === 'completed') return 'status-completed';
  return '';
}

// Function to show a tax payment receipt
// Function to show a tax payment receipt
function showReceipt(paymentId, paymentDate, paymentMode, citizenName, panchayatName, amount) {
  // Get the receipt modal
  const modal = document.getElementById('receipt-modal');
  
  // Parse the amount safely
  let formattedAmount = "0.00";
  if (amount && !isNaN(parseFloat(amount))) {
    formattedAmount = parseFloat(amount).toFixed(2);
  }
  
  // Format the receipt content
  document.getElementById('receipt-content').innerHTML = `
    <div class="receipt">
      <div class="receipt-header">
        <h2>${panchayatName}</h2>
        <h3>Tax Payment Receipt</h3>
      </div>
      
      <div class="receipt-body">
        <div class="receipt-row">
          <div class="receipt-label">Receipt No:</div>
          <div class="receipt-value">TXN-${paymentId}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Date:</div>
          <div class="receipt-value">${paymentDate}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Paid By:</div>
          <div class="receipt-value">${citizenName}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Payment Mode:</div>
          <div class="receipt-value">${paymentMode}</div>
        </div>
        <div class="receipt-row receipt-amount">
          <div class="receipt-label">Amount Paid:</div>
          <div class="receipt-value">₹${formattedAmount}</div>
        </div>
      </div>
      
      <div class="receipt-footer">
        <p>Thank you for your payment</p>
        <p class="receipt-note">This is a computer-generated receipt and does not require a physical signature.</p>
      </div>
      
      <div class="receipt-actions">
        <button class="btn" onclick="window.print()">Print Receipt</button>
        <button class="btn btn-outline" onclick="document.getElementById('receipt-modal').style.display='none'">Close</button>
      </div>
    </div>
  `;
  
  // Show the modal
  modal.style.display = 'flex';
}

// Function to show the welfare application modal
function showWelfareForm(scheme) {
  // Set the welfare scheme in the modal
  document.getElementById('selected-welfare-scheme').innerText = scheme + " Welfare Scheme";
  document.getElementById('welfare-scheme-input').value = scheme;

  // Set the form action dynamically with the current URL parameters
  const userId = new URLSearchParams(window.location.search).get('user_id') ||
    window.location.pathname.split('/')[2];
  const citizenId = new URLSearchParams(window.location.search).get('citizen_id') ||
    window.location.pathname.split('/')[3];

  const form = document.getElementById('welfare-application-form');
  form.action = `/apply_welfare/${userId}/${citizenId}`;

  // Show the modal
  document.getElementById('welfare-modal').style.display = 'flex';
}

// Function to reset and hide the welfare application modal
function resetWelfareForm() {
  // Clear form fields
  document.getElementById('welfare-reason').value = '';
  document.getElementById('family-income').value = '';

  // Clear any uploaded documents
  document.getElementById('welfare-doc-list').innerHTML = '';

  // Hide the modal
  document.getElementById('welfare-modal').style.display = 'none';
}

// Optional: Add document upload handling for welfare form
document.addEventListener('DOMContentLoaded', function () {
  const welfareDocArea = document.getElementById('welfare-doc-upload-area');
  if (welfareDocArea) {
    welfareDocArea.addEventListener('click', function () {
      alert('Document upload functionality would be implemented here');
      // In a real implementation, you would trigger a file input element
    });
  }
});

// Tab Switching Functionality
document.addEventListener('DOMContentLoaded', function () {
  const tabItems = document.querySelectorAll('.tab-item');
  const tabContents = document.querySelectorAll('.tab-content');

  tabItems.forEach(item => {
    item.addEventListener('click', function () {
      // Remove active class from all tabs
      tabItems.forEach(i => i.classList.remove('active'));
      // Add active class to clicked tab
      this.classList.add('active');

      // Get target content ID
      const target = this.getAttribute('data-target');

      // Hide all tab contents
      tabContents.forEach(content => {
        content.classList.remove('active');
      });

      // Show the target content
      document.getElementById(target).classList.add('active');

      // If services tab is selected, fetch services
      if (target === 'services') {
        fetchAndDisplayServices();
      }
    });
  });
});

// Notification System
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.style.backgroundColor =
    type === 'success' ? varToColor('--success') :
      type === 'warning' ? varToColor('--warning') :
        varToColor('--secondary');

  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 4000);
}

function varToColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Tax Payment Modal
document.addEventListener('DOMContentLoaded', function () {
  const payButtons = document.querySelectorAll('.pay-tax');
  payButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const taxType = this.getAttribute('data-type');
      const taxAmount = this.getAttribute('data-amount');
      showPaymentModal(taxType, taxAmount);
    });
  });
});

/// Certificate Application Functions

// Function to show the certificate application modal with certificate-specific fields
// Function to show the certificate application modal with certificate-specific fields
function showCertificateForm(type) {
  // Set the certificate type in the modal
  document.getElementById('selected-certificate-type').innerText = type + " Certificate";
  document.getElementById('certificate-type-input').value = type;

  // Hide all certificate-specific sections first
  const sections = document.querySelectorAll('.certificate-specific-section');
  sections.forEach(sec => sec.style.display = 'none');

  // Show specific sections based on certificate type (lowercase and normalize)
  const lcType = type.toLowerCase();

  if (lcType === 'birth') {
    document.getElementById('birth-certificate-section').style.display = 'block';
  } else if (lcType === 'income') {
    document.getElementById('income-certificate-section').style.display = 'block';
  } else if (lcType === 'aadhar') {
    document.getElementById('aadhar-certificate-section').style.display = 'block';
  } else if (lcType === 'voter') {
    document.getElementById('voter-certificate-section').style.display = 'block';
  } else if (lcType === 'bpl') {
    document.getElementById('bpl-certificate-section').style.display = 'block';
  } else {
    // For any new certificate types, show a generic form section
    const genericSection = document.getElementById('generic-certificate-section');
    if (genericSection) {
      genericSection.style.display = 'block';
    } else {
      // If no generic section exists, create one dynamically
      const formSection = document.createElement('div');
      formSection.id = 'generic-certificate-section';
      formSection.className = 'certificate-specific-section';
      formSection.innerHTML = `
        <div class="form-group">
          <label for="generic-purpose" class="form-label required-field">Purpose</label>
          <textarea id="generic-purpose" name="generic-purpose" class="form-textarea" required></textarea>
          <p class="field-help">Please explain why you need this certificate</p>
        </div>
      `;

      // Add the generic section to the form
      const formSections = document.querySelector('.form-actions').parentNode;
      formSections.insertBefore(formSection, document.querySelector('.form-actions'));
      formSection.style.display = 'block';
    }
  }

  // Display the certificate modal pop-up
  document.getElementById('certificate-modal').style.display = 'flex';
}

// Function to reset and hide the certificate application modal
function resetCertificateForm() {
  document.getElementById('certificate-application-form').reset();
  document.getElementById('certificate-modal').style.display = 'none';

  // Clear any uploaded documents
  const docList = document.getElementById('doc-list');
  if (docList) {
    docList.innerHTML = '';
  }
}

// Handle document uploads
document.addEventListener('DOMContentLoaded', function () {
  const docUploadArea = document.getElementById('doc-upload-area');
  if (docUploadArea) {
    docUploadArea.addEventListener('click', function () {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.jpg,.jpeg,.png';
      input.multiple = true;

      // Handle file selection
      input.onchange = function (e) {
        const files = e.target.files;
        const docList = document.getElementById('doc-list');

        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Check file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
              showNotification(`${file.name} is too large. Maximum file size is 2MB.`, 'warning');
              continue;
            }

            // Add file to the list
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${file.name}</span>
                <button type="button" class="remove-file">×</button>
              `;

            // Add remove button functionality
            listItem.querySelector('.remove-file').addEventListener('click', function () {
              listItem.remove();
            });

            docList.appendChild(listItem);
          }
        }
      };

      // Trigger file input click
      input.click();
    });

    // Add drag and drop functionality
    docUploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.backgroundColor = '#f0f0f0';
    });

    docUploadArea.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.backgroundColor = '';
    });

    docUploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.backgroundColor = '';

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const docList = document.getElementById('doc-list');

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Check if it's an accepted file type
          const fileType = file.name.split('.').pop().toLowerCase();
          if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileType)) {
            showNotification(`${file.name} is not an accepted file type.`, 'warning');
            continue;
          }

          // Check file size (max 2MB)
          if (file.size > 2 * 1024 * 1024) {
            showNotification(`${file.name} is too large. Maximum file size is 2MB.`, 'warning');
            continue;
          }

          // Add file to the list
          const listItem = document.createElement('li');
          listItem.innerHTML = `
              <span>${file.name}</span>
              <button type="button" class="remove-file">×</button>
            `;

          // Add remove button functionality
          listItem.querySelector('.remove-file').addEventListener('click', function () {
            listItem.remove();
          });

          docList.appendChild(listItem);
        }
      }
    });
  }

  // Form submission validation
  const certificateForm = document.getElementById('certificate-application-form');
  if (certificateForm) {
    certificateForm.addEventListener('submit', function (e) {
      const certificateType = document.getElementById('certificate-type-input').value;
      const description = document.getElementById('description').value;

      // Basic validation
      if (!certificateType) {
        e.preventDefault();
        showNotification('Please select a certificate type.', 'warning');
        return;
      }

      if (!description) {
        e.preventDefault();
        showNotification('Please provide purpose of the certificate.', 'warning');
        return;
      }

      // Type-specific validation
      if (certificateType === 'Birth') {
        const birthDate = document.getElementById('birth-date').value;
        const birthPlace = document.getElementById('birth-place').value;

        if (!birthDate || !birthPlace) {
          e.preventDefault();
          showNotification('Please fill all required fields for Birth Certificate.', 'warning');
          return;
        }
      } else if (certificateType === 'Income') {
        const incomeAmount = document.getElementById('income-amount').value;
        const incomeSource = document.getElementById('income-source').value;

        if (!incomeAmount || !incomeSource) {
          e.preventDefault();
          showNotification('Please fill all required fields for Income Certificate.', 'warning');
          return;
        }
      } else if (certificateType === 'Aadhar') {
        const aadharMobile = document.getElementById('aadhar-mobile').value;

        if (!aadharMobile) {
          e.preventDefault();
          showNotification('Please provide mobile number for Aadhar Card.', 'warning');
          return;
        }
      } else if (certificateType === 'Voter') {
        const voterAge = document.getElementById('voter-age').value;

        if (!voterAge || parseInt(voterAge) < 18) {
          e.preventDefault();
          showNotification('Please provide valid age (18+) for Voter ID.', 'warning');
          return;
        }
      } else if (certificateType === 'BPL') {
        const familyMembers = document.getElementById('bpl-family-members').value;
        const bplReason = document.getElementById('bpl-reason').value;

        if (!familyMembers || !bplReason) {
          e.preventDefault();
          showNotification('Please fill all required fields for BPL Certificate.', 'warning');
          return;
        }
      }

      // All validation passed
      showNotification('Submitting your application...', 'info');
    });
  }
});

// Welfare Scheme Application Functions

// Function to show the welfare application modal
// Function to show the welfare application modal
function showWelfareForm(scheme) {
  // Set the welfare scheme in the modal
  document.getElementById('selected-welfare-scheme').innerText = scheme;
  document.getElementById('welfare-scheme-input').value = scheme;

  // Set the form action dynamically with the current URL parameters
  const pathParts = window.location.pathname.split('/');
  const userId = pathParts[2]; // Assuming URL is like /citizen/5/4
  const citizenId = pathParts[3];

  const form = document.getElementById('welfare-application-form');
  form.action = `/apply_welfare/${userId}/${citizenId}`;

  // Display the welfare modal pop-up
  document.getElementById('welfare-modal').style.display = 'flex';
}

// Function to reset and hide the welfare application modal
function resetWelfareForm() {
  document.getElementById('welfare-application-form').reset();
  document.getElementById('welfare-modal').style.display = 'none';

  // Clear any uploaded documents
  const docList = document.getElementById('welfare-doc-list');
  if (docList) {
    docList.innerHTML = '';
  }
}

// Handle document uploads for welfare form
document.addEventListener('DOMContentLoaded', function () {
  const docUploadArea = document.getElementById('welfare-doc-upload-area');
  if (docUploadArea) {
    docUploadArea.addEventListener('click', function () {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.jpg,.jpeg,.png';
      input.multiple = true;

      // Handle file selection
      input.onchange = function (e) {
        const files = e.target.files;
        const docList = document.getElementById('welfare-doc-list');

        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Check file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
              showNotification(`${file.name} is too large. Maximum file size is 2MB.`, 'warning');
              continue;
            }

            // Add file to the list
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                            <span>${file.name}</span>
                            <button type="button" class="remove-file">×</button>
                        `;

            // Add remove button functionality
            listItem.querySelector('.remove-file').addEventListener('click', function () {
              listItem.remove();
            });

            docList.appendChild(listItem);
          }
        }
      };

      // Trigger file input click
      input.click();
    });

    // Add drag and drop functionality
    docUploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.backgroundColor = '#f0f0f0';
    });

    docUploadArea.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.backgroundColor = '';
    });

    docUploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.backgroundColor = '';

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const docList = document.getElementById('welfare-doc-list');

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Check if it's an accepted file type
          const fileType = file.name.split('.').pop().toLowerCase();
          if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileType)) {
            showNotification(`${file.name} is not an accepted file type.`, 'warning');
            continue;
          }

          // Check file size (max 2MB)
          if (file.size > 2 * 1024 * 1024) {
            showNotification(`${file.name} is too large. Maximum file size is 2MB.`, 'warning');
            continue;
          }

          // Add file to the list
          const listItem = document.createElement('li');
          listItem.innerHTML = `
                        <span>${file.name}</span>
                        <button type="button" class="remove-file">×</button>
                    `;

          // Add remove button functionality
          listItem.querySelector('.remove-file').addEventListener('click', function () {
            listItem.remove();
          });

          docList.appendChild(listItem);
        }
      }
    });
  }
});
// Service Request Functions
function showServiceForm(serviceType, serviceId) {
  console.log(`Opening service request form for: ${serviceType} (ID: ${serviceId})`);

  // Set the service type and ID in the modal form
  document.getElementById('selected-service-type').innerText = serviceType;
  document.getElementById('service-type-input').value = serviceType;
  document.getElementById('service-id-input').value = serviceId;

  // Clear any previous form data
  const serviceForm = document.getElementById('service-request-form');
  if (serviceForm) {
    serviceForm.reset();
  }

  // Display the modal overlay
  document.getElementById('service-modal').style.display = 'flex';
}

// Fixed Service Request Form Submission
function resetServiceForm() {
  const serviceForm = document.getElementById('service-request-form');
  if (serviceForm) {
    serviceForm.reset();
  }
  document.getElementById('service-modal').style.display = 'none';
}
// Replace or modify the submit event listener for the service form

document.addEventListener('DOMContentLoaded', function () {
  const serviceForm = document.getElementById('service-request-form');
  if (serviceForm) {
    serviceForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Prevent default form submission

      // Get form values - add more specific selectors
      const serviceType = document.getElementById('service-type-input').value;
      const serviceId = document.getElementById('service-id-input').value;
      const description = document.querySelector('#service-request-form #description').value;

      console.log(`Submitting service request - Type: ${serviceType}, ID: ${serviceId}, Description: ${description}`);

      // Validate required fields
      if (!serviceId || !serviceType) {
        showNotification('Invalid service selection', 'warning');
        return;
      }

      if (!description || !description.trim()) {
        showNotification('Please provide a description of your service request', 'warning');
        return;
      }

      // If everything is valid, show a loading notification
      showNotification('Submitting your service request...', 'info');

      // Create form data for submission
      const formData = new FormData();
      formData.append('service-type', serviceType);
      formData.append('service-id', serviceId);
      formData.append('description', description);

      // Get the form action URL
      const actionUrl = serviceForm.getAttribute('action');

      // Submit the form via fetch API
      fetch(actionUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin' // Include cookies for session
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
          }
          return response.json().catch(() => {
            // If the response is not JSON, assume it was successful
            return { success: true };
          });
        })
        .then(data => {
          if (data.success || !data.error) {
            showNotification('Service request submitted successfully!', 'success');
            // Close the modal
            document.getElementById('service-modal').style.display = 'none';

            // Reload the page after a short delay to show the new request
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            throw new Error(data.message || 'Unknown error');
          }
        })
        .catch(error => {
          console.error('Error submitting service request:', error);
          showNotification('Error submitting request: ' + error.message, 'warning');
        });
    });
  }
});

// Make sure services are loaded when the page is first loaded
document.addEventListener('DOMContentLoaded', function () {
  // Load services immediately if we're on the services tab
  if (document.querySelector('.tab-item[data-target="services"]').classList.contains('active')) {
    fetchAndDisplayServices();
  }
});

// Function to ensure service cards are properly created
function createServiceCard(service) {
  // Create a service card element
  const card = document.createElement('div');
  card.className = 'service-card';
  card.setAttribute('data-service-id', service.id);

  // Determine emoji for service icon
  let emoji = '🔧'; // Default service emoji

  // Try to match the service type to an appropriate emoji
  const serviceType = service.type.toLowerCase();
  if (serviceType.includes('water')) emoji = '🚰';
  else if (serviceType.includes('electric')) emoji = '🔌';
  else if (serviceType.includes('sewage') || serviceType.includes('sanitation')) emoji = '🚽';
  else if (serviceType.includes('road')) emoji = '🛣️';
  else if (serviceType.includes('waste')) emoji = '🗑️';
  else if (serviceType.includes('health')) emoji = '🏥';
  else if (serviceType.includes('education')) emoji = '🏫';
  else if (serviceType.includes('agriculture')) emoji = '🌾';
  else (emoji = '🔧'); // Default emoji

  // Create the card HTML
  card.innerHTML = `
    <div class="service-icon">${emoji}</div>
    <div class="service-content">
      <h4>${service.type}</h4>
      <p>${service.description || 'Request this service from the Gram Panchayat'}</p>
      <a href="#" class="service-btn request-service" data-service-id="${service.id}" data-service-type="${service.type}">Request Now</a>
    </div>
  `;

  // Add click event to request button
  card.querySelector('.request-service').addEventListener('click', function (e) {
    e.preventDefault();
    showServiceForm(service.type, service.id);
  });

  return card;
}

// Add debugging to fetchAndDisplayServices to ensure it's working correctly
function fetchAndDisplayServices() {
  console.log('Fetching services from server...');

  // Display loading indicator
  const servicesGrid = document.querySelector('#services .services-grid');
  servicesGrid.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto; text-align: center;">Loading services...</div>';

  // Fetch services from the server
  fetch('/get_services')
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Services data received:', data);

      if (data.success && data.services) {
        // Clear any existing content
        servicesGrid.innerHTML = '';

        if (data.services.length === 0) {
          servicesGrid.innerHTML = '<div class="alert" style="width:100%; text-align:center;">No services are currently available.</div>';
          return;
        }

        // Add service cards
        console.log(`Creating ${data.services.length} service cards`);
        data.services.forEach(service => {
          console.log(`Creating card for ${service.type} (ID: ${service.id})`);
          const serviceCard = createServiceCard(service);
          servicesGrid.appendChild(serviceCard);
        });
      } else {
        console.error('Failed to load services:', data.message);
        servicesGrid.innerHTML = '<div class="alert" style="background-color: #f8d7da; color: #721c24; padding: 1rem; border: 1px solid #f5c6cb; border-radius: 4px; margin: 1rem auto; max-width: 600px;">Failed to load services. Please refresh the page.</div>';
      }
    })
    .catch(error => {
      console.error('Error fetching services:', error);
      servicesGrid.innerHTML = '<div class="alert" style="background-color: #f8d7da; color: #721c24; padding: 1rem; border: 1px solid #f5c6cb; border-radius: 4px; margin: 1rem auto; max-width: 600px;">Server error. Please try again later.</div>';
    });
}

// Tax Payment Functions
function showPaymentModal(type, amount) {
  document.getElementById('payment-amount').value = amount;
  document.getElementById('payment-amount').max = amount;

  // Display the payment modal
  document.getElementById('payment-modal').style.display = 'flex';
}

function hidePaymentModal() {
  document.getElementById('tax-payment-form').reset();
  document.getElementById('payment-modal').style.display = 'none';
}

function showServiceDetails(requestId) {
  // Create a modal to display service request details
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.display = 'flex';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '600px';

  // Show loading
  modalContent.innerHTML = `
    <button class="modal-close" onclick="this.parentNode.parentNode.remove()">✖</button>
    <h3 class="dashboard-title">Service Request Details</h3>
    <div style="text-align:center; padding: 20px;">
      <div class="loading-spinner"></div>
      <p>Loading request details...</p>
    </div>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Fetch service request details from the server
  fetch(`/get_service_request/${requestId}`)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.request) {
        const request = data.request;

        // Replace loading spinner with details
        modalContent.innerHTML = `
          <button class="modal-close" onclick="this.parentNode.parentNode.remove()">✖</button>
          <h3 class="dashboard-title">Service Request Details</h3>
          <div class="service-details">
            <div class="details-row">
              <div class="detail-label">Request ID:</div>
              <div class="detail-value">REQ-${request.id}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Service Type:</div>
              <div class="detail-value">${request.type}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Request Date:</div>
              <div class="detail-value">${request.date}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">
                <span class="status-badge ${getStatusClass(request.status)}">
                  ${request.status}
                </span>
              </div>
            </div>
            <div class="details-row">
              <div class="detail-label">Description:</div>
              <div class="detail-value">
                <p>${request.description || 'No description available'}</p>
              </div>
            </div>
          </div>
          <div class="form-actions" style="margin-top:20px;">
            <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        `;
      } else {
        // If request not found
        modalContent.innerHTML = `
          <button class="modal-close" onclick="this.parentNode.parentNode.remove()">✖</button>
          <h3 class="dashboard-title">Service Request Details</h3>
          <div class="alert" style="background-color:#f8d7da; color:#721c24; margin:20px 0;">
            Request details not found.
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching service request details:', error);
      modalContent.innerHTML = `
        <button class="modal-close" onclick="this.parentNode.parentNode.remove()">✖</button>
        <h3 class="dashboard-title">Service Request Details</h3>
        <div class="alert" style="background-color:#f8d7da; color:#721c24; margin:20px 0;">
          An error occurred while fetching request details.
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      `;
    });
}

// Helper function to get status class for styling
function getStatusClass(status) {
  switch (status) {
    case 'Approved':
    case 'Resolved':
      return 'status-success';
    case 'Pending':
      return 'status-pending';
    case 'In Progress':
      return 'status-progress';
    case 'Rejected':
      return 'status-danger';
    default:
      return 'status-other';
  }
}

// Add this utility function to find elements by text content
if (!document.querySelector(':contains')) {
  // This is needed because we don't have jQuery's :contains selector
  document.querySelectorAll = (function (originalQSA) {
    return function (selector) {
      // Extract the search text from the contains selector
      if (selector.includes(':contains')) {
        const containsText = selector.match(/:contains\("(.+?)"\)/)[1];
        // Get all elements matching the basic selector
        const basicSelector = selector.replace(/:contains\("(.+?)"\)/, '');
        const elements = originalQSA.call(this, basicSelector || '*');
        // Filter for elements containing the text
        return Array.prototype.filter.call(elements, el =>
          el.textContent.includes(containsText)
        );
      }
      return originalQSA.call(this, selector);
    };
  })(document.querySelectorAll);
}

// Function to fetch and display services
function fetchAndDisplayServices() {
  console.log('Fetching services from server...');

  // Display loading indicator
  const servicesGrid = document.querySelector('#services .services-grid');
  if (servicesGrid) {
    servicesGrid.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto; text-align: center;">Loading services...</div>';
  }

  // Fetch services from the server
  fetch('/get_services')
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Services data received:', data);

      if (data.success && data.services) {
        // Clear any existing content
        servicesGrid.innerHTML = '';

        if (data.services.length === 0) {
          servicesGrid.innerHTML = '<div class="alert" style="width:100%; text-align:center;">No services are currently available.</div>';
          return;
        }

        // Add service cards
        console.log(`Creating ${data.services.length} service cards`);
        data.services.forEach(service => {
          console.log(`Creating card for ${service.type} (ID: ${service.id})`);
          const serviceCard = createServiceCard(service);
          servicesGrid.appendChild(serviceCard);
        });
      } else {
        console.error('Failed to load services:', data.message);
        servicesGrid.innerHTML = '<div class="alert" style="background-color: #f8d7da; color: #721c24; padding: 1rem; border: 1px solid #f5c6cb; border-radius: 4px; margin: 1rem auto; max-width: 600px;">Failed to load services. Please refresh the page.</div>';
      }
    })
    .catch(error => {
      console.error('Error fetching services:', error);
      servicesGrid.innerHTML = '<div class="alert" style="background-color: #f8d7da; color: #721c24; padding: 1rem; border: 1px solid #f5c6cb; border-radius: 4px; margin: 1rem auto; max-width: 600px;">Server error. Please try again later.</div>';
    });
}

// Make sure services are loaded when the page is first loaded and services tab is active
document.addEventListener('DOMContentLoaded', function () {
  // Check if we're on the services tab by default
  const servicesTab = document.querySelector('.tab-content#services');
  if (servicesTab && servicesTab.classList.contains('active')) {
    fetchAndDisplayServices();
  }

  // Also check if user navigates directly to services with a hash in URL
  if (window.location.hash === '#services') {
    // Activate services tab
    const servicesTabButton = document.querySelector('.tab-item[data-target="services"]');
    if (servicesTabButton) {
      servicesTabButton.click();
    }
  }
});


function showChangePasswordModal() {
  document.getElementById('change-password-modal').style.display = 'flex';
}

function hideChangePasswordModal() {
  document.getElementById('change-password-form').reset();
  document.getElementById('change-password-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  const changePasswordForm = document.getElementById('change-password-form');
  const newPasswordField = document.getElementById('new-password');
  const confirmPasswordField = document.getElementById('confirm-password');
  const passwordMatchMessage = document.getElementById('password-match-message');

  if (changePasswordForm && newPasswordField && confirmPasswordField) {
    // Form submission validation and AJAX handling
    changePasswordForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Prevent default form submission
      console.log('Form submission handler triggered'); // Debug statement

      if (!checkPasswords()) {
        showNotification('New passwords do not match', 'warning');
        return;
      }

      // Get form data
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = newPasswordField.value;
      const confirmPassword = confirmPasswordField.value;

      // Show loading notification
      showNotification('Changing password...', 'info');

      // Create form data
      const formData = new FormData();
      formData.append('current-password', currentPassword);
      formData.append('new-password', newPassword);
      formData.append('confirm-password', confirmPassword);

      // Submit using fetch API
      fetch(changePasswordForm.getAttribute('action'), {
        method: 'POST',
        body: formData,
        credentials: 'same-origin' // Include cookies
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Success case - use the message from the server
            showNotification(data.message || 'Password changed successfully!', 'success');
            hideChangePasswordModal(); // Close the modal
          } else {
            // Error case
            showNotification(data.message || 'Failed to change password', 'warning');
          }
        })
        .catch(error => {
          console.error('Error changing password:', error);
          showNotification('An error occurred while changing the password', 'warning');
        });
    });
  }
});

// Certificate Details Function
function showCertificateDetails(certificateId) {
  // Display the modal
  const modal = document.getElementById('certificate-details-modal');
  if (!modal) {
    console.error("Certificate details modal not found in the DOM");
    showNotification('Could not display certificate details', 'warning');
    return;
  }

  modal.style.display = 'flex';

  // Show loading indicator
  const contentDiv = document.getElementById('certificate-details-content');
  if (!contentDiv) {
    console.error("Certificate details content container not found");
    return;
  }

  contentDiv.innerHTML = `
    <div style="text-align:center; padding: 20px;">
      <div class="loading-spinner"></div>
      <p>Loading certificate details...</p>
    </div>
  `;

  // Fetch certificate details from server
  fetch(`/get_certificate_details/${certificateId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.success && data.certificate) {
        const cert = data.certificate;

        // Format the status with appropriate color
        let statusClass = 'status-other';
        if (cert.status === 'Approved') statusClass = 'status-success';
        else if (cert.status === 'Pending') statusClass = 'status-pending';
        else if (cert.status === 'Rejected') statusClass = 'status-danger';

        // Update modal content with certificate details
        contentDiv.innerHTML = `
          <div class="service-details">
            <div class="details-row">
              <div class="detail-label">Certificate ID:</div>
              <div class="detail-value">CERT-${cert.id}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Type:</div>
              <div class="detail-value">${cert.type} Certificate</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Application Date:</div>
              <div class="detail-value">${cert.date}</div>
            </div>
            <div class="details-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">
                <span class="status-badge ${statusClass}">
                  ${cert.status}
                </span>
              </div>
            </div>
            <div class="details-row">
              <div class="detail-label">Description:</div>
              <div class="detail-value">
                <p>${cert.description || 'No description provided'}</p>
              </div>
            </div>
            ${cert.feedback ? `
            <div class="details-row">
              <div class="detail-label">Feedback:</div>
              <div class="detail-value">
                <p>${cert.feedback}</p>
              </div>
            </div>` : ''}
          </div>
        `;
      } else {
        // If certificate not found or error occurred
        contentDiv.innerHTML = `
          <div class="alert" style="background-color:#f8d7da; color:#721c24; margin:20px 0;">
            ${data.message || 'Certificate details not found.'}
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching certificate details:', error);
      contentDiv.innerHTML = `
        <div class="alert" style="background-color:#f8d7da; color:#721c24; margin:20px 0;">
          An error occurred while fetching certificate details.
        </div>
      `;
    });
}
