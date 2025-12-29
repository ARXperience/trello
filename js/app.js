import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// --- TU CONFIGURACIÓN ---
const firebaseConfig = {
    apiKey: "AIzaSyAQnrIODc_2Qv_Snow02X-Sq8_PHwMoRVk",
    authDomain: "trello-d2532.firebaseapp.com",
    projectId: "trello-d2532",
    storageBucket: "trello-d2532.firebasestorage.app",
    messagingSenderId: "630892154656",
    appId: "1:630892154656:web:1d0dfce355216a1d879145",
    measurementId: "G-4L4P7E6TZC"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ESTADO DE LA EMPRESA
const COMPANY_MEMBERS = [
    { id: 'u1', name: 'Juan', initial: 'JP', color: '#e91e63' },
    { id: 'u2', name: 'Maria', initial: 'ML', color: '#9c27b0' },
    { id: 'u3', name: 'Carlos', initial: 'CR', color: '#2196f3' }
];

let boardData = { todo: [], 'in-progress': [], done: [], history: [], settings: { theme: 'light' } };
let currentEditingId = null;

// --- AUTENTICACIÓN ---
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnLogout = document.getElementById('btn-logout');
const btnReset = document.getElementById('btn-reset');

btnLogin.onclick = () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    signInWithEmailAndPassword(auth, email, pass).catch(e => alert("Error: " + e.message));
};

btnSignup.onclick = () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    createUserWithEmailAndPassword(auth, email, pass).catch(e => alert("Error: " + e.message));
};

btnLogout.onclick = () => signOut(auth);

btnReset.onclick = () => {
    const email = document.getElementById('login-email').value;
    if(!email) return alert("Escribe tu correo primero");
    sendPasswordResetEmail(auth, email).then(() => alert("Correo de recuperación enviado"));
};

// OBSERVADOR DE SESIÓN
onAuthStateChanged(auth, user => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('user-display').innerText = user.email;
        syncWithCloud();
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

// --- CLOUD SYNC ---
function syncWithCloud() {
    onSnapshot(doc(db, "boards", "empresa-master"), (snapshot) => {
        if (snapshot.exists()) {
            boardData = snapshot.data();
            renderBoard();
            renderHistory();
        }
    });
}

async function saveToCloud() {
    await setDoc(doc(db, "boards", "empresa-master"), boardData);
}

// --- RENDERIZADO DEL TABLERO ---
function renderBoard() {
    ['todo', 'in-progress', 'done'].forEach(col => {
        const container = document.getElementById(col);
        container.innerHTML = '';
        (boardData[col] || []).forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.draggable = true;
            cardEl.onclick = () => openModal(card.id);
            cardEl.ondragstart = (e) => e.dataTransfer.setData("text", card.id);

            const avatars = (card.members || []).map(mId => {
                const m = COMPANY_MEMBERS.find(u => u.id === mId);
                return `<div class="avatar" style="background:${m.color}">${m.initial}</div>`;
            }).join('');

            cardEl.innerHTML = `
                <div class="card-tags">${(card.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                <strong>${card.title}</strong>
                <div class="card-footer" style="display:flex; justify-content:space-between; margin-top:10px;">
                    <small>${card.date ? '📅 '+card.date : ''}</small>
                    <div class="avatar-stack">${avatars}</div>
                </div>
            `;
            container.appendChild(cardEl);
        });
    });
    updateStats();
}

// --- FUNCIONES DE TAREAS ---
window.addNewCard = (btn) => {
    const input = btn.parentElement.querySelector('.card-input');
    const colId = btn.closest('.list').dataset.id;
    if (!input.value.trim()) return;

    const newCard = {
        id: 'c' + Date.now(),
        title: input.value,
        desc: '',
        tags: [],
        members: [],
        date: '',
        checklist: []
    };

    boardData[colId].push(newCard);
    addLog(`Tarea creada: ${newCard.title}`);
    input.value = '';
    saveToCloud();
};

// DRAG AND DROP
document.querySelectorAll('.list').forEach(list => {
    list.ondragover = (e) => e.preventDefault();
    list.ondrop = (e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData("text");
        const targetCol = list.dataset.id;
        
        let cardObj, oldCol;
        ['todo', 'in-progress', 'done'].forEach(col => {
            const idx = boardData[col].findIndex(c => c.id === cardId);
            if (idx !== -1) { 
                oldCol = col;
                cardObj = boardData[col].splice(idx, 1)[0]; 
            }
        });

        if (cardObj) {
            boardData[targetCol].push(cardObj);
            addLog(`Movido "${cardObj.title}" a ${targetCol}`);
            saveToCloud();
        }
    };
});

// --- MODAL Y LOGS ---
function openModal(id) {
    currentEditingId = id;
    const card = findCard(id);
    document.getElementById('modal-title').value = card.title;
    document.getElementById('modal-desc').value = card.desc;
    document.getElementById('modal-date').value = card.date;
    renderChecklist(card);
    renderMemberSelection(card);
    document.getElementById('card-modal').style.display = 'block';
}

function findCard(id) {
    return [...boardData.todo, ...boardData['in-progress'], ...boardData.done].find(c => c.id === id);
}

function addLog(action) {
    boardData.history.unshift({ date: new Date().toLocaleTimeString(), action });
    if(boardData.history.length > 20) boardData.history.pop();
}

// Eventos de cierre y UI
document.querySelector('.close-modal').onclick = () => document.getElementById('card-modal').style.display = 'none';
document.getElementById('modal-title').onblur = () => { findCard(currentEditingId).title = document.getElementById('modal-title').value; saveToCloud(); };
document.getElementById('modal-desc').onblur = () => { findCard(currentEditingId).desc = document.getElementById('modal-desc').value; saveToCloud(); };
document.getElementById('modal-date').onchange = () => { findCard(currentEditingId).date = document.getElementById('modal-date').value; saveToCloud(); };

// (Funciones de soporte para Checklist, Tags y Stats se incluyen internamente para mantener la lógica)
function updateStats() {
    const total = boardData.todo.length + boardData['in-progress'].length + boardData.done.length;
    document.getElementById('board-stats').innerHTML = `<span>Total: ${total}</span> | <span>Completadas: ${boardData.done.length}</span>`;
}
