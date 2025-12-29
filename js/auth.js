import { auth } from './config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Referencias al HTML (DOM)
const loginBtn = document.getElementById('btn-login');
const signupBtn = document.getElementById('btn-signup');
const logoutBtn = document.getElementById('btn-logout');
const errorMsg = document.getElementById('auth-error');

// ==========================================
// 1. FUNCIÓN DE INICIAR SESIÓN
// ==========================================
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // No necesitamos hacer nada más, el "Monitor" (abajo) detectará el cambio
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Error: Usuario o contraseña incorrectos.";
    }
});

// ==========================================
// 2. FUNCIÓN DE REGISTRO
// ==========================================
signupBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        alert("Cuenta creada con éxito. ¡Bienvenido!");
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Error al registrar: " + error.message;
    }
});

// ==========================================
// 3. FUNCIÓN DE CERRAR SESIÓN
// ==========================================
logoutBtn.addEventListener('click', () => {
    // Limpiamos la memoria local para evitar errores de caché
    localStorage.clear();
    signOut(auth);
});

// ==========================================
// 4. EL MONITOR DE ESTADO (VITAL)
// ==========================================
// Esta función se ejecuta sola cada vez que alguien entra o sale.
export function monitorAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // USUARIO LOGUEADO
            console.log("Usuario detectado:", user.email);
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            document.getElementById('user-display').innerText = user.email;
            
            // Ejecutamos la función que carga los datos (que vendrá de app.js)
            if (callback) callback(user);
        } else {
            // USUARIO NO LOGUEADO
            console.log("No hay sesión activa.");
            document.getElementById('auth-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('loading-screen').style.display = 'none';
        }
    });
}
