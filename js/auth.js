import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

export const initAuth = (onLoginSuccess) => {
    document.getElementById('btn-login').onclick = () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        signInWithEmailAndPassword(auth, e, p).catch(() => alert("Credenciales incorrectas"));
    };

    document.getElementById('btn-signup').onclick = () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        createUserWithEmailAndPassword(auth, e, p).then(() => alert("Usuario registrado")).catch(err => alert(err.message));
    };

    document.getElementById('btn-logout').onclick = () => signOut(auth);

    onAuthStateChanged(auth, user => {
        if (user) {
            onLoginSuccess(user);
        } else {
            document.getElementById('auth-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
        }
    });
};
