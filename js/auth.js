import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

export const initAuth = (onLoginSuccess) => {
    document.getElementById('btn-login').onclick = () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        signInWithEmailAndPassword(auth, e, p).catch(err => alert("Acceso denegado: Correo o contraseña incorrectos"));
    };

    document.getElementById('btn-signup').onclick = () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        if(p.length < 6) return alert("Contraseña muy corta");
        createUserWithEmailAndPassword(auth, e, p).catch(err => alert("Error: " + err.message));
    };

    document.getElementById('btn-logout').onclick = () => signOut(auth);

    document.getElementById('btn-reset').onclick = () => {
        const email = document.getElementById('login-email').value;
        if(!email) return alert("Escribe tu correo");
        sendPasswordResetEmail(auth, email).then(() => alert("Correo de recuperación enviado"));
    };

    onAuthStateChanged(auth, user => {
        if (user) {
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            document.getElementById('user-display').innerText = user.email;
            onLoginSuccess();
        } else {
            document.getElementById('auth-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
        }
    });
};
