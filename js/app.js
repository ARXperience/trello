const COMPANY_MEMBERS = [
    { id: 'u1', name: 'Juan', initial: 'JP', color: '#e91e63' },
    { id: 'u2', name: 'Maria', initial: 'ML', color: '#9c27b0' },
    { id: 'u3', name: 'Carlos', initial: 'CR', color: '#2196f3' }
];

let boardData = { todo: [], 'in-progress': [], done: [], history: [], settings: { theme: 'light' } };
let currentEditingCardId = null;

// CARGA EN TIEMPO REAL DESDE LA NUBE (En lugar de LocalStorage)
function loadCloudData() {
    db.collection("boards").doc("main-board").onSnapshot((doc) => {
        if (doc.exists) {
            boardData = doc.data();
            renderBoard();
            renderHistory();
            document.body.className = (boardData.settings.theme || 'light') + '-theme';
        }
    });
}

function saveCloudData() {
    db.collection("boards").doc("main-board").set(boardData);
}

// RENDERIZADO (IDEM ANTERIOR PERO ACTUALIZADO)
function renderBoard() {
    ['todo', 'in-progress', 'done'].forEach(col => {
        const container = document.getElementById(col);
        container.innerHTML = '';
        (boardData[col] || []).forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card'; cardEl.id = card.id; cardEl.draggable = true;
            cardEl.ondragstart = drag; cardEl.onclick = () => openModal(card.id);
            
            const avatars = (card.members || []).map(mId => {
                const m = COMPANY_MEMBERS.find(u => u.id === mId);
                return `<div class="avatar" style="background:${m.color}">${m.initial}</div>`;
            }).join('');

            cardEl.innerHTML = `
                <div class="card-tags">${(card.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                <strong>${card.title}</strong>
                <div class="card-footer"><span class="card-badges">${card.date ? '📅 '+card.date : ''}</span><div class="avatar-stack">${avatars}</div></div>
            `;
            container.appendChild(cardEl);
        });
    });
    updateStats();
}

function addNewCard(button) {
    const input = button.parentElement.querySelector('.card-input');
    const colId = button.closest('.list').dataset.id;
    if (!input.value.trim()) return;

    const newCard = { id: 'c' + Date.now(), title: input.value, desc: '', tags: [], members: [], date: '', checklist: [] };
    boardData[colId].push(newCard);
    addLog(`Nueva tarea: ${newCard.title}`);
    input.value = '';
    saveCloudData();
}

// DRAG & DROP
function drag(ev) { ev.dataTransfer.setData("text", ev.target.id); }
function allowDrop(ev) { ev.preventDefault(); }
function drop(ev) {
    ev.preventDefault();
    const cardId = ev.dataTransfer.getData("text");
    const targetColId = ev.target.closest('.list').dataset.id;
    let cardObj, oldCol;
    ['todo', 'in-progress', 'done'].forEach(col => {
        const idx = boardData[col].findIndex(c => c.id === cardId);
        if (idx !== -1) { oldCol = col; cardObj = boardData[col].splice(idx, 1)[0]; }
    });
    if (cardObj) {
        boardData[targetColId].push(cardObj);
        addLog(`Movido ${cardObj.title} a ${targetColId}`);
        saveCloudData();
    }
}

// MODAL Y OTRAS FUNCIONES (MANTENIDAS DE V3.5)
function openModal(cardId) {
    currentEditingCardId = cardId;
    let card = findCardById(cardId);
    document.getElementById('modal-card-title').value = card.title;
    document.getElementById('modal-date').value = card.date;
    document.getElementById('modal-desc').value = card.desc;
    renderMemberSelection(card); renderModalTags(card); renderChecklist(card);
    document.getElementById('card-modal').style.display = 'block';
}

function updateCardFromModal() {
    let card = findCardById(currentEditingCardId);
    card.title = document.getElementById('modal-card-title').value;
    card.date = document.getElementById('modal-date').value;
    card.desc = document.getElementById('modal-desc').value;
    saveCloudData();
}

// (Incluir aquí funciones de renderMemberSelection, toggleMember, addTag, renderModalTags, addChecklistItem, renderChecklist, toggleCheck, findCardById, addLog, renderHistory, searchCards, toggleTheme, toggleHistory, closeModal, archiveCardFromModal, exportToCSV de la versión anterior)
