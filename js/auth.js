function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    auth.signInWithEmailAndPassword(email, pass)
        .catch(err => document.getElementById('auth-error').innerText = "Credenciales inválidas");
}

function handleSignup() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    auth.createUserWithEmailAndPassword(email, pass)
        .catch(err => document.getElementById('auth-error').innerText = "Error en el registro");
}

function handleLogout() {
    auth.signOut();
}

// Observador de estado de la sesión
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('user-display-name').innerText = user.email;
        loadCloudData(); // Cargar datos del tablero
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});
