function updateFloatingTasks() {
    const floatingTasksList = document.getElementById('floating-tasks-list');
    if (!floatingTasksList) return;

    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    floatingTasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        floatingTasksList.innerHTML = '<p>No tasks added yet. Add tasks in the Planner!</p>';
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} disabled>
                <span class="${task.completed ? 'completed' : ''}">${task.text}</span>
            </div>
        `;
        floatingTasksList.appendChild(li);
    });
}

// Update floating tasks when localStorage changes
window.addEventListener('storage', function(e) {
    if (e.key === 'tasks') {
        updateFloatingTasks();
    }
});

// Initialize floating tasks when page loads
document.addEventListener('DOMContentLoaded', updateFloatingTasks);

// Update floating tasks periodically
setInterval(updateFloatingTasks, 5000);
