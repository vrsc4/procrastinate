let isConnected = false;
let currentSession = null;
let statusInterval = null;
let blockedWebsites = [];

function addWebsite() {
    const input = document.getElementById('website-input');
    const website = input.value.trim().toLowerCase();
    
    if (!website) {
        showMessage('Please enter a website', 'error');
        return;
    }

    // Remove http/https if present
    const cleanUrl = website.replace(/^https?:\/\//i, '');
    
    if (blockedWebsites.length >= 10) {
        showMessage('Maximum 10 websites allowed', 'error');
        return;
    }

    if (!blockedWebsites.includes(cleanUrl)) {
        blockedWebsites.push(cleanUrl);
        updateWebsiteList();
        input.value = '';
        showMessage('Website added successfully', 'success');
    }
}

function updateWebsiteList() {
    const listElement = document.getElementById('website-list');
    const countElement = document.querySelector('.website-count');
    
    listElement.innerHTML = '';
    blockedWebsites.forEach(website => {
        const item = document.createElement('div');
        item.className = 'website-item';
        item.innerHTML = `
            <span>${website}</span>
            <button onclick="removeWebsite('${website}')" class="remove-btn">Remove</button>
        `;
        listElement.appendChild(item);
    });
    
    countElement.textContent = `${blockedWebsites.length}/10 websites blocked`;
}

function removeWebsite(website) {
    blockedWebsites = blockedWebsites.filter(site => site !== website);
    updateWebsiteList();
    showMessage('Website removed', 'success');
}

async function toggleVPN() {
    const connectBtn = document.getElementById('connect-btn');
    const hours = parseInt(document.getElementById('hours').value) || 0;
    const minutes = parseInt(document.getElementById('minutes').value) || 0;
    
    if (!isConnected) {
        if (blockedWebsites.length === 0 || (hours === 0 && minutes === 0)) {
            showMessage('Please add websites and set duration before connecting', 'error');
            return;
        }
        
        try {
            const healthCheck = await fetch('http://localhost:3000/api/vpn/health');
            if (!healthCheck.ok) {
                throw new Error('Timer server is not responding');
            }

            const duration = (hours * 60 + minutes) * 60; // Convert to seconds
            const response = await fetch('http://localhost:3000/api/vpn/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    duration
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start timer');
            }
            
            const data = await response.json();
            
            if (data.success) {
                isConnected = true;
                currentSession = data.sessionId;
                connectBtn.textContent = 'Stop Timer';
                connectBtn.classList.add('connected');
                
                // Disable inputs
                document.getElementById('website-input').disabled = true;
                document.getElementById('hours').disabled = true;
                document.getElementById('minutes').disabled = true;
                document.querySelectorAll('.remove-btn').forEach(btn => btn.disabled = true);
                
                // Start status polling
                startStatusPolling(data.sessionId);
                
                showMessage('Timer started successfully!', 'success');
            } else {
                showMessage(data.error || 'Failed to start timer', 'error');
            }
        } catch (error) {
            console.error('Timer connection error:', error);
            showMessage(error.message || 'Failed to connect. Please check your connection and try again.', 'error');
            isConnected = false;
            connectBtn.textContent = 'Start Timer';
            connectBtn.classList.remove('connected');
        }
    } else {
        await disconnectVPN();
    }
}

async function disconnectVPN() {
    if (!currentSession) {
        showMessage('No active timer session', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/vpn/disconnect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentSession
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to stop timer');
        }

        const data = await response.json();
        
        if (data.success) {
            // Stop status polling
            if (statusInterval) {
                clearInterval(statusInterval);
                statusInterval = null;
            }

            // Reset UI
            isConnected = false;
            currentSession = null;
            const connectBtn = document.getElementById('connect-btn');
            connectBtn.textContent = 'Start Timer';
            connectBtn.classList.remove('connected');
            
            // Enable inputs
            document.getElementById('website-input').disabled = false;
            document.getElementById('hours').disabled = false;
            document.getElementById('minutes').disabled = false;
            document.querySelectorAll('.remove-btn').forEach(btn => btn.disabled = false);
            
            // Reset timer display
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) {
                timeDisplay.textContent = '00:00:00';
            }

            showMessage('Timer stopped successfully', 'success');
        } else {
            showMessage(data.error || 'Failed to stop timer', 'error');
        }
    } catch (error) {
        console.error('Timer disconnection error:', error);
        showMessage(error.message || 'Failed to stop timer. Please try again.', 'error');
    }
}

function startStatusPolling(sessionId) {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
    
    // Update immediately
    updateStatus(sessionId);
    
    // Then update every second
    statusInterval = setInterval(() => {
        updateStatus(sessionId);
    }, 1000);
}

async function updateStatus(sessionId) {
    try {
        const response = await fetch(`http://localhost:3000/api/vpn/status/${sessionId}`);
        const data = await response.json();
        
        if (!data.active) {
            await disconnectVPN();
            return;
        }
        
        // Update time display
        updateRemainingTime(data.remainingTime);
    } catch (error) {
        console.error('Status update error:', error);
    }
}

function updateRemainingTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
        timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

function showMessage(message, type = 'info', duration = 5000) {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
    } else {
        console.error('Status message element not found');
    }
}

// Add website when Enter key is pressed
document.getElementById('website-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addWebsite();
    }
});
