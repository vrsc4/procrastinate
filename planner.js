let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

function addTask() {
    const taskInput = document.getElementById('task-input');
    const taskText = taskInput.value.trim();
    
    if (taskText) {
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            timestamp: new Date().toISOString()
        };
        
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        taskInput.value = '';
        updateTasksDisplay();
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateTasksDisplay();
}

function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updateTasksDisplay();
    }
}

function updateTasksDisplay() {
    const tasksList = document.getElementById('tasks-list');
    const floatingTasks = document.getElementById('floating-tasks');
    
    // Update main task list
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" 
                   class="task-checkbox" 
                   ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})">
            <span class="task-text">${task.text}</span>
            <span class="task-delete" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
            </span>
        </div>
    `).join('');
    
    // Update floating task list
    floatingTasks.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" 
                   class="task-checkbox" 
                   ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})">
            <span class="task-text">${task.text}</span>
        </div>
    `).join('');
    
    // Update summary
    document.getElementById('total-tasks').textContent = tasks.length;
    document.getElementById('completed-tasks').textContent = 
        tasks.filter(task => task.completed).length;
}

function toggleFloatingPlanner() {
    const planner = document.getElementById('floating-planner');
    planner.classList.toggle('hidden');
}

// Event Listeners
document.getElementById('task-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        updateTasksDisplay();
    }
});

// Handle floating planner visibility when switching pages
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.getElementById('floating-planner').classList.add('hidden');
    }
});
