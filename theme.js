// Theme management
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateActiveThemeButton(theme);
}

// Update active theme button
function updateActiveThemeButton(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.textContent.toLowerCase() === theme) {
            btn.classList.add('active');
            btn.style.background = 'var(--primary-gradient)';
            btn.style.color = '#fff';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'none';
            btn.style.color = 'var(--text-color)';
        }
    });
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// Initialize theme
document.addEventListener('DOMContentLoaded', loadTheme);
