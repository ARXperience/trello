import { db } from './config.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    where, 
    doc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. CREAR UNA NUEVA CARPETA (TABLERO)
// ==========================================
export async function createFolder(userId, folderName) {
    if (!folderName) return;

    try {
        // Guardamos en la sub-colección privada del usuario
        // Ruta: users -> [ID_USUARIO] -> folders -> [DOC_AUTO_GENERADO]
        await addDoc(collection(db, "users", userId, "folders"), {
            name: folderName,
            createdAt: serverTimestamp(),
            // Estructura inicial vacía para las tareas
            columns: {
                todo: [],       // Pendientes
                doing: [],      // En proceso
                done: []        // Finalizado
            },
            collaborators: [] // Para compartir a futuro
        });
        console.log("Carpeta creada con éxito");
    } catch (error) {
        console.error("Error al crear carpeta:", error);
        alert("No se pudo crear la carpeta. Revisa tu conexión.");
    }
}

// ==========================================
// 2. ESCUCHAR CARPETAS (LECTURA EN TIEMPO REAL)
// ==========================================
export function listenToUserFolders(userId, callback) {
    const foldersRef = collection(db, "users", userId, "folders");
    const q = query(foldersRef);

    // onSnapshot se queda "escuchando". Si cambias algo en Firebase,
    // se actualiza solo en tu pantalla sin refrescar.
    return onSnapshot(q, (snapshot) => {
        const folders = [];
        snapshot.forEach((doc) => {
            folders.push({ id: doc.id, ...doc.data() });
        });
        // Le pasamos la lista de carpetas a quien llamó esta función (app.js)
        callback(folders);
    });
}

// ==========================================
// 3. ACTUALIZAR TAREAS (MOVER, EDITAR, BORRAR)
// ==========================================
// Esta función es la que guarda TODO lo que pasa en el tablero.
// Recibe el ID del usuario, el ID de la carpeta y los datos nuevos de las columnas.
export async function updateFolderData(userId, folderId, newColumnsData) {
    try {
        const folderRef = doc(db, "users", userId, "folders", folderId);
        await updateDoc(folderRef, {
            columns: newColumnsData
        });
        console.log("Tablero guardado.");
    } catch (error) {
        console.error("Error al guardar tablero:", error);
    }
}

// ==========================================
// 4. ELIMINAR CARPETA
// ==========================================
export async function deleteFolder(userId, folderId) {
    if (!confirm("¿Seguro que quieres eliminar esta carpeta y todas sus tareas?")) return;
    
    try {
        const folderRef = doc(db, "users", userId, "folders", folderId);
        await deleteDoc(folderRef);
        console.log("Carpeta eliminada");
    } catch (error) {
        console.error("Error al eliminar:", error);
    }
}
