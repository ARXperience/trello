/* =========================================
   IMPORTACIONES (CONECTAMOS LOS MÓDULOS)
   ========================================= */
import { monitorAuthState } from './auth.js';
import { createFolder, listenToUserFolders, updateFolderData, deleteFolder } from './db.js';

// VARIABLES DE ESTADO (MEMORIA RAM DEL NAVEGADOR)
let currentUser = null;
let currentFolder = null; // La carpeta que estás viendo ahora mismo
let allFolders = [];      // Lista de todas tus carpetas

// REFERENCIAS AL HTML
const myFoldersList = document.getElementById('my-folders-list');
const btnNewFolder = document.getElementById('btn-new-folder');
const boardTitle = document.getElementById('board-title');
const kanbanBoard = document.getElementById('kanban-board');
const modal = document.getElementById('task-modal');

// ==========================================
// 1. INICIALIZACIÓN (EL MONITOR)
// ==========================================
// Esta función espera a que auth.js diga "¡Ya entró el usuario!"
monitorAuthState((user) => {
    currentUser = user;
    
    // Inmediatamente nos ponemos a escuchar sus carpetas en la base de datos
    listenToUserFolders(user.uid, (folders) => {
        allFolders = folders;
        renderSidebar(); // Pintamos la lista en la izquierda
        
        // Si teníamos una carpeta abierta y se actualizó, refrescamos el tablero
        if (currentFolder) {
            const found = allFolders.find(f => f.id === currentFolder.id);
            if (found) {
                currentFolder = found;
                renderBoard();
            }
        }
    });
});

// ==========================================
// 2. BARRA LATERAL (RENDERIZADO)
// ==========================================
function renderSidebar() {
    myFoldersList.innerHTML = '';
    
    allFolders.forEach(folder => {
        const item = document.createElement('div');
        // Si es la carpeta actual, le ponemos la clase 'active' para que se vea azul
        item.className = `folder-item ${currentFolder && currentFolder.id === folder.id ? 'active' : ''}`;
        item.innerHTML = `📁 ${folder.name}`;
        
        item.onclick = () => {
            currentFolder = folder; // Cambiamos la carpeta actual
            renderSidebar();        // Actualizamos colores del menú
            renderBoard();          // Pintamos las tareas
        };
        
        myFoldersList.appendChild(item);
    });
}

// Botón "Nueva Carpeta"
btnNewFolder.onclick = () => {
    const name = prompt("Nombre del nuevo proyecto:");
    if (name) createFolder(currentUser.uid, name);
};

// ==========================================
// 3. TABLERO KANBAN (RENDERIZADO)
// ==========================================
function renderBoard() {
    if (!currentFolder) {
        boardTitle.innerText = "Selecciona un proyecto";
        kanbanBoard.innerHTML = '<div class="empty-state">Selecciona una carpeta del menú izquierdo para comenzar.</div>';
        return;
    }

    boardTitle.innerText = currentFolder.name;
    kanbanBoard.innerHTML = '';

    // Definimos las 3 columnas estándar
    const columns = [
        { id: 'todo', title: 'Pendientes' },
        { id: 'doing', title: 'En Proceso' },
        { id: 'done', title: 'Finalizado' }
    ];

    columns.forEach(colDef => {
        // Creamos la columna visualmente
        const colDiv = document.createElement('div');
        colDiv.className = 'list';
        colDiv.innerHTML = `<h3>${colDef.title}</h3><div class="cards-container" id="${colDef.id}"></div>`;
        
        const container = colDiv.querySelector('.cards-container');
        
        // Obtenemos las tareas de esta columna (si no hay, usamos array vacío)
        const tasks = currentFolder.columns[colDef.id] || [];
        
        tasks.forEach(task => {
            const card = createCardElement(task, colDef.id);
            container.appendChild(card);
        });

        // Botón "+ Añadir Tarea" al final de la columna
        const btnAdd = document.createElement('button');
        btnAdd.className = 'btn-small';
        btnAdd.style.width = '100%';
        btnAdd.style.marginTop = '10px';
        btnAdd.innerText = '+ Añadir Tarea';
        btnAdd.onclick = () => addTask(colDef.id);
        
        colDiv.appendChild(btnAdd);

        // --- EVENTOS DE DRAG & DROP (SOLTAR) ---
        colDiv.ondragover = (e) => e.preventDefault(); // Permitir soltar aquí
        colDiv.ondrop = (e) => handleDrop(e, colDef.id);

        kanbanBoard.appendChild(colDiv);
    });
}

// Crea el HTML de una tarjeta individual
function createCardElement(task, colId) {
    const div = document.createElement('div');
    div.className = `kanban-card ${task.priority || 'low'}`; // Color según prioridad
    div.draggable = true; // Hacemos que sea arrastrable
    div.innerText = task.title;
    
    // Click para editar
    div.onclick = () => openEditModal(task, colId);

    // Al empezar a arrastrar, guardamos su ID
    div.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            taskId: task.id,
            sourceCol: colId
        }));
    };

    return div;
}

// ==========================================
// 4. LÓGICA DE TAREAS (AÑADIR Y MOVER)
// ==========================================
function addTask(colId) {
    const title = prompt("Título de la tarea:");
    if (!title) return;

    const newTask = {
        id: Date.now().toString(), // ID único basado en el tiempo
        title: title,
        desc: '',
        priority: 'low',
        checklist: []
    };

    // Actualizamos la memoria local
    if (!currentFolder.columns[colId]) currentFolder.columns[colId] = [];
    currentFolder.columns[colId].push(newTask);

    // Guardamos en Firebase (db.js hace el trabajo sucio)
    saveChanges();
}

function handleDrop(e, targetCol) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { taskId, sourceCol } = data;

    if (sourceCol === targetCol) return; // Si soltó en la misma columna, no hacemos nada

    // 1. Buscamos y sacamos la tarea de la columna vieja
    const sourceList = currentFolder.columns[sourceCol];
    const taskIndex = sourceList.findIndex(t => t.id === taskId);
    
    if (taskIndex > -1) {
        const [task] = sourceList.splice(taskIndex, 1);
        
        // 2. La metemos en la columna nueva
        if (!currentFolder.columns[targetCol]) currentFolder.columns[targetCol] = [];
        currentFolder.columns[targetCol].push(task);

        // 3. Guardamos
        saveChanges();
    }
}

// Función auxiliar para guardar y repintar
function saveChanges() {
    updateFolderData(currentUser.uid, currentFolder.id, currentFolder.columns);
    renderBoard(); // Refresca la pantalla al instante
}

// ==========================================
// 5. MODAL DE EDICIÓN (DETALLES)
// ==========================================
let editingTask = null;
let editingCol = null;

// Referencias a inputs del modal
const modalTitle = document.getElementById('modal-title');
const modalPriority = document.getElementById('modal-priority');
const modalDesc = document.getElementById('modal-desc');
const checkContainer = document.getElementById('checklist-container');
const newCheckInput = document.getElementById('new-check-text');
const btnAddCheck = document.getElementById('btn-add-check');
const btnDelete = document.getElementById('btn-delete-card');
const closeModal = document.querySelector('.close-modal');

function openEditModal(task, colId) {
    editingTask = task;
    editingCol = colId;

    // Rellenamos el modal con los datos de la tarea
    modalTitle.value = task.title;
    modalPriority.value = task.priority;
    modalDesc.value = task.desc || '';
    
    renderChecklist();
    modal.style.display = 'flex'; // Mostrar modal
}

function renderChecklist() {
    checkContainer.innerHTML = '';
    (editingTask.checklist || []).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'row';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''}>
            <span style="${item.done ? 'text-decoration:line-through; color:gray;' : ''}">${item.text}</span>
            <button class="btn-small" style="background:#eb5a46; color:white; margin-left:auto;">x</button>
        `;
        
        // Checkbox: Tachar/Destachar
        const checkbox = div.querySelector('input');
        checkbox.onchange = () => {
            item.done = checkbox.checked;
            saveChanges();
            renderChecklist();
        };

        // Botón borrar sub-tarea
        const delBtn = div.querySelector('button');
        delBtn.onclick = () => {
            editingTask.checklist.splice(index, 1);
            saveChanges();
            renderChecklist();
        };

        checkContainer.appendChild(div);
    });
}

// Guardado automático (Autosave) al salir de los campos
modalTitle.onblur = () => { if (editingTask) { editingTask.title = modalTitle.value; saveChanges(); } };
modalDesc.onblur = () => { if (editingTask) { editingTask.desc = modalDesc.value; saveChanges(); } };
modalPriority.onchange = () => { if (editingTask) { editingTask.priority = modalPriority.value; saveChanges(); } };

// Añadir checklist
btnAddCheck.onclick = () => {
    const text = newCheckInput.value;
    if (text) {
        if (!editingTask.checklist) editingTask.checklist = [];
        editingTask.checklist.push({ text, done: false });
        newCheckInput.value = '';
        saveChanges();
        renderChecklist();
    }
};

// Eliminar Tarea completa
btnDelete.onclick = () => {
    if (confirm("¿Borrar esta tarea?")) {
        const list = currentFolder.columns[editingCol];
        const idx = list.findIndex(t => t.id === editingTask.id);
        if (idx > -1) {
            list.splice(idx, 1);
            saveChanges();
            modal.style.display = 'none';
        }
    }
};

// Cerrar Modal
closeModal.onclick = () => { modal.style.display = 'none'; editingTask = null; };
window.onclick = (e) => { if (e.target == modal) { modal.style.display = 'none'; editingTask = null; } };
