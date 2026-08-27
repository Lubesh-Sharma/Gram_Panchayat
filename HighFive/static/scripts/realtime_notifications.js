/**
 * Real-Time WebSocket Push & Live Refresh Engine for Gram Panchayat Management System
 * Automatically notifies employees and citizens when new applications arrive or statuses change.
 */
(function () {
    if (window.GPMS_REALTIME_NOTIFICATIONS_LOADED) return;
    window.GPMS_REALTIME_NOTIFICATIONS_LOADED = true;

    if (typeof io === 'undefined') {
        console.warn('Socket.IO library not loaded.');
        return;
    }

    // Cache to prevent duplicate toast rendering within 3 seconds
    const recentNotifications = new Set();

    // Initialize Socket.IO connection
    const socket = io();

    // Helper: Play subtle notification sound using Web Audio API
    function playNotificationSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note
            
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            // Audio context policy might require user gesture; fail gracefully
        }
    }

    // Connect event
    socket.on('connect', () => {
        console.log('⚡ Real-time WebSocket engine connected.');
        const panchayatId = window.CURRENT_PANCHAYAT_ID || '';
        if (panchayatId) {
            socket.emit('subscribe_panchayat', { panchayat_id: panchayatId });
        }
    });

    // Toast Container builder
    function getToastContainer() {
        let container = document.getElementById('gpms-realtime-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'gpms-realtime-toast-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 12px; max-width: 380px; width: calc(100vw - 40px); pointer-events: none;';
            document.body.appendChild(container);
        }
        return container;
    }

    // Show floating Real-time Notification Toast
    function showRealtimeToast(title, message, iconClass, onRefresh) {
        const notifKey = `${title}|${message}`;
        if (recentNotifications.has(notifKey)) {
            console.log('⚡ [Realtime] Suppressed duplicate toast notification:', notifKey);
            return;
        }
        recentNotifications.add(notifKey);
        setTimeout(() => recentNotifications.delete(notifKey), 3000);

        playNotificationSound();
        const container = getToastContainer();

        const toast = document.createElement('div');
        toast.className = 'gpms-realtime-toast';
        toast.style.cssText = 'pointer-events: auto; background: #0f172a; color: #f8fafc; border-left: 5px solid #3b82f6; border-radius: 10px; padding: 14px 18px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; gap: 8px; transform: translateY(-20px); opacity: 0; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);';

        toast.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; color: #60a5fa;">
                    <i class="${iconClass || 'fas fa-bell'}"></i>
                    <span>${title}</span>
                </div>
                <button type="button" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;" onclick="this.closest('.gpms-realtime-toast').remove()">&times;</button>
            </div>
            <div style="font-size: 13px; color: #cbd5e1; line-height: 1.4;">${message}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                <button class="btn-toast-refresh" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(37,99,235,0.3); transition: transform 0.1s;">
                    <i class="fas fa-sync-alt"></i> Refresh Page Now
                </button>
                <span style="font-size: 11px; color: #64748b;">Just now</span>
            </div>
        `;

        container.appendChild(toast);

        // Animate entrance
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        const refreshBtn = toast.querySelector('.btn-toast-refresh');
        refreshBtn.addEventListener('click', () => {
            if (typeof onRefresh === 'function') {
                onRefresh();
            } else {
                window.location.reload();
            }
        });

        // Auto dismiss after 12 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-10px)';
                setTimeout(() => toast.remove(), 400);
            }
        }, 12000);
    }

    // 1. Listen for new applications (Employee & Admin views)
    socket.on('new_application', (data) => {
        console.log('⚡ [Realtime] New application received:', data);
        const appType = data.type || 'Application';
        const title = data.title ? ` (${data.title})` : '';
        const msg = `A new ${appType}${title} was submitted by Citizen #${data.citizen_id || ''}.`;
        
        showRealtimeToast(
            `New ${appType} Received!`,
            msg,
            'fas fa-file-import',
            () => window.location.reload()
        );
    });

    // 2. Listen for status updates (Citizen & Employee views)
    socket.on('status_updated', (data) => {
        console.log('⚡ [Realtime] Status update received:', data);
        const appType = data.type || 'Application';
        const newStatus = data.status || 'Updated';
        const msg = `Your ${appType} request #${data.id || ''} status was changed to "${newStatus}".`;

        showRealtimeToast(
            `Application Status Updated!`,
            msg,
            newStatus === 'Approved' || newStatus === 'Resolved' || newStatus === 'Enrolled' ? 'fas fa-check-circle' : 'fas fa-info-circle',
            () => window.location.reload()
        );
    });

    // Expose utility globally
    window.showRealtimeToast = showRealtimeToast;
})();
