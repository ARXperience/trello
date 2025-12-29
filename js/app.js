import { db, auth } from './firebase-config.js';
import { initAuth } from './auth.js';
import { doc, onSnapshot, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let boardData = { todo: [], 'in-progress': [], done: [], history: [], settings: { theme: 'light' }, collaborators: [] };
let currentEditingId = null;
let currentUser = null;
let isDataLoaded = false; // Bandera para evitar que el save() inicial borre datos

// --- LÓGICA DE PERSISTENCIA POR USUARIO (CARPETAS) ---
initAuth((user) => {
    currentUser = user;
    document.getElementById('user-display').innerText = user.email;
    document.getElementById('loading-screen').style.display = 'flex';
    startSync();
});

function startSync() {
    // Apuntamos a una "carpeta" única para este usuario usando su UID
    const userDocRef = doc(db, "user_boards", currentUser.uid);

    onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
            boardData = snap.data();
            isDataLoaded = true; // Confirmamos que ya leímos datos reales
            renderBoard();
            renderHistory();
            document.body.className = (boardData.settings?.theme || 'light') + '-theme';
        } else {
            // Si el usuario es nuevo, creamos su carpeta inicial
            boardData = { todo: [], 'in-progress': [], done: [], history: [], settings: { theme: 'light' }, collaborators: [currentUser.email] };
            isDataLoaded = true;
            save();
        }
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
    });
}

async function save() {
    // IMPORTANTE: Solo guardamos si hemos cargado datos previamente para no sobreescribir con vacío
    if (!isDataLoaded || !currentUser) return;
    await setDoc(doc(db, "user_boards", currentUser.uid), boardData);
}

// --- FUNCIONES DEL TABLERO ---
window.handleAddNewCard = (btn) => {
    const input = btn.parentElement.querySelector('.card-input');
    const colId = btn.closest('.list').dataset.id;
    if (!input.value.trim()) return;
    const newCard = { id: 'c'+Date.now(), title: input.value, desc: '', tags: [], members: [], date: '', checklist: [], priority: 'low' };
    boardData[colId].push(newCard);
    addLog(`Nueva tarea: ${newCard.title}`);
    input.value = ''; save();
};

window.drop = (e) => {
    const id = e.dataTransfer.getData("text");
    const targetCol = e.target.closest('.list').dataset.id;
    let cardObj;
    ['todo', 'in-progress', 'done'].forEach(col => {
        const idx = boardData[col].findIndex(c => c.id === id);
        if(idx !== -1) cardObj = boardData[col].splice(idx, 1)[0];
    });
    if(cardObj) { boardData[targetCol].push(cardObj); addLog(`Movido a ${targetCol}`); save(); }
};

window.allowDrop = (e) => e.preventDefault();

function renderBoard() {
    ['todo', 'in-progress', 'done'].forEach(col => {
        const cont = document.getElementById(col); cont.innerHTML = '';
        (boardData[col] || []).forEach(card => {
            const el = document.createElement('div');
            el.className = `card ${card.priority}`; el.draggable = true;
            el.id = card.id;
            el.onclick = () => openModal(card.id);
            el.ondragstart = (e) => e.dataTransfer.setData("text", card.id);
            el.innerHTML = `<strong>${card.title}</strong><br><small>${card.date || ''}</small>`;
            cont.appendChild(el);
        });
    });
}

// --- MODAL Y DETALLES ---
function openModal(id) {
    currentEditingId = id; const card = findCard(id);
    document.getElementById('modal-title').value = card.title;
    document.getElementById('modal-desc').value = card.desc || '';
    document.getElementById('modal-priority').value = card.priority || 'low';
    renderChecklist(card);
    document.getElementById('card-modal').style.display = 'block';
}

function findCard(id) { return [...boardData.todo, ...boardData['in-progress'], ...boardData.done].find(c => c.id === id); }

window.addChecklistItem = () => {
    const input = document.getElementById('new-check-input');
    const card = findCard(currentEditingId);
    if(!card.checklist) card.checklist = [];
    card.checklist.push({ text: input.value, done: false });
    input.value = ''; renderChecklist(card); save();
};

function renderChecklist(card) {
    const cont = document.getElementById('modal-checklist');
    cont.innerHTML = (card.checklist || []).map((item, i) => `
        <div><input type="checkbox" ${item.done ? 'checked' : ''} onchange="window.toggleCheck(${i})"> ${item.text}</div>
    `).join('');
}

window.toggleCheck = (i) => { const card = findCard(currentEditingId); card.checklist[i].done = !card.checklist[i].done; renderChecklist(card); save(); };

window.updatePriority = () => { findCard(currentEditingId).priority = document.getElementById('modal-priority').value; renderBoard(); save(); };

window.archiveCardFromModal = () => {
    if(confirm("¿Eliminar?")) {
        ['todo','in-progress','done'].forEach(col => boardData[col] = boardData[col].filter(c => c.id !== currentEditingId));
        window.closeModal(); save();
    }
};

window.closeModal = () => document.getElementById('card-modal').style.display = 'none';

function addLog(msg) {
    if(!boardData.history) boardData.history = [];
    boardData.history.unshift({t: new Date().toLocaleTimeString(), m: msg});
}

function renderHistory() {
    document.getElementById('history-log').innerHTML = (boardData.history || []).map(h => `<div>${h.t}: ${h.m}</div>`).join('');
}

// Guardado de campos de texto
document.getElementById('modal-title').onblur = e => { findCard(currentEditingId).title = e.target.value; renderBoard(); save(); };
document.getElementById('modal-desc').onblur = e => { findCard(currentEditingId).desc = e.target.value; save(); };
document.getElementById('btn-theme').onclick = () => { boardData.settings.theme = boardData.settings.theme === 'light' ? 'dark' : 'light'; save(); };
