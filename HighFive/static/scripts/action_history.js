/**
 * Action & Approval History JS Module
 * Provides reusable lazy-loading chunked pagination (25 records per page) and debounced search.
 */

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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 25px; color: #6c757d; font-weight: 500;"><i class="fas fa-folder-open" style="font-size: 24px; color: #adb5bd; display: block; margin-bottom: 8px;"></i> No application actions or approval history records found (Retained max 6 months).</td></tr>`;
        return;
    }

    let html = '';
    records.forEach(item => {
        let statusBadge = '';
        const statusUpper = (item.action_taken || '').toUpperCase();
        if (statusUpper.includes('APPROVED') || statusUpper.includes('RESOLVED') || statusUpper.includes('ENROLLED') || statusUpper.includes('COMPLETED')) {
            statusBadge = `<span class="badge bg-success" style="background-color: #28a745; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;"><i class="fas fa-check-circle me-1"></i> ${item.action_taken}</span>`;
        } else if (statusUpper.includes('DECLINED') || statusUpper.includes('REJECTED')) {
            statusBadge = `<span class="badge bg-danger" style="background-color: #dc3545; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;"><i class="fas fa-times-circle me-1"></i> ${item.action_taken}</span>`;
        } else {
            statusBadge = `<span class="badge bg-secondary" style="background-color: #6c757d; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">${item.action_taken}</span>`;
        }

        let docButton = '';
        if (item.generated_doc_path) {
            docButton = `<a href="${item.generated_doc_path}" target="_blank" class="btn btn-sm btn-outline-primary" style="padding: 4px 8px; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid #007bff; border-radius: 4px; color: #007bff; display: inline-block; margin-bottom: 4px;"><i class="fas fa-file-pdf me-1"></i> View Official PDF</a>`;
        } else {
            docButton = `<span style="color: #6c757d; font-size: 12px;">N/A</span>`;
        }

        let citizenAttachmentBtn = '';
        if (item.citizen_doc_path) {
            citizenAttachmentBtn = `<div style="margin-top: 4px;"><a href="${item.citizen_doc_path}" target="_blank" style="font-size: 11px; color: #17a2b8; font-weight: 600; text-decoration: underline;"><i class="fas fa-paperclip me-1"></i> View Citizen Uploaded File</a></div>`;
        }

        html += `
            <tr style="border-bottom: 1px solid #e9ecef; vertical-align: top;">
                <td style="padding: 10px; font-size: 12px; white-space: nowrap;">${item.action_date}</td>
                <td style="padding: 10px; font-size: 13px; font-weight: 600; color: #073763;">${item.document_tracking_id}</td>
                <td style="padding: 10px; font-size: 13px;">
                    <span style="text-transform: capitalize; font-weight: 600; color: #1d4ed8;">${item.module_type}</span> <br>
                    <small style="color: #64748b;">(${item.doc_type})</small>
                    <div style="margin-top: 6px; font-size: 11px; color: #334155; background: #f8fafc; padding: 5px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                        <strong><i class="fas fa-user-edit me-1" style="color: #64748b;"></i> Citizen Request Note:</strong><br>
                        ${item.citizen_notes || 'No specific note provided'}
                        ${citizenAttachmentBtn}
                    </div>
                </td>
                <td style="padding: 10px; font-size: 13px;">${item.target_citizen_name} <br><small style="color: #6c757d;">(ID: ${item.target_citizen_id || 'N/A'})</small></td>
                <td style="padding: 10px; font-size: 13px;">${item.action_by_name} <br><small style="color: #6c757d;">(ID: ${item.action_by_user_id} - ${item.action_by_role})</small></td>
                <td style="padding: 10px;">
                    <div style="text-align: center;">${statusBadge}</div>
                    <div style="margin-top: 6px; font-size: 11px; color: #1e293b; background: #f1f5f9; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #0284c7;">
                        <strong style="color: #0369a1;"><i class="fas fa-comment-dots me-1"></i> Feedback / Remarks:</strong><br>
                        ${item.remarks_description || 'No feedback recorded'}
                    </div>
                </td>
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
        prevBtn.disabled = (currentPage <= 1 || totalPages === 0);
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                const searchVal = document.getElementById('actionHistorySearchInput')?.value || '';
                loadActionHistory(currentPage - 1, searchVal);
            }
        };
    }

    if (nextBtn) {
        nextBtn.disabled = (currentPage >= totalPages || totalPages === 0);
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
                numHtml += `<button class="btn btn-primary btn-sm" style="font-weight: bold; padding: 4px 10px; margin: 0 2px;">${i}</button>`;
            } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                numHtml += `<button class="btn btn-outline-secondary btn-sm action-history-page-btn" data-page="${i}" style="padding: 4px 10px; margin: 0 2px;">${i}</button>`;
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

document.addEventListener('DOMContentLoaded', () => {
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

    // Auto-load history on page ready if table container exists
    if (document.getElementById('actionHistoryTableBody')) {
        loadActionHistory(1);
    }

    // Auto-load history when history section is clicked/activated
    document.querySelectorAll('[data-section="action_history"], [data-section="action-history"], [data-bs-target="#action_history"]').forEach(item => {
        item.addEventListener('click', () => {
            loadActionHistory(1);
        });
    });
});
