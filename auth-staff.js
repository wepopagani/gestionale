/**
 * Accesso staff al gestionale con password di team.
 * Dopo il login usa Firebase Anonymous Auth per database/cloud.
 */
(function () {
    const SESSION_KEY = 'gestionale_staff_session_v2';
    const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

    let staffAuthPromise = null;
    let pendingResolve = null;
    let pendingReject = null;

    function ensureFirebaseApp() {
        if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
            throw new Error('Firebase non configurato.');
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.app();
    }

    function getStaffPassword() {
        if (typeof window.gestionaleStaffPassword === 'string' && window.gestionaleStaffPassword) {
            return window.gestionaleStaffPassword;
        }
        return '3DMAKES2026';
    }

    function hasValidStaffSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data || !data.ok || !data.at) return false;
            return (Date.now() - data.at) < SESSION_MS;
        } catch (e) {
            return false;
        }
    }

    function saveStaffSession() {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, at: Date.now() }));
    }

    function clearStaffSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    function signInFirebaseAnon() {
        ensureFirebaseApp();
        if (typeof initFirebaseAuthAnon === 'function') {
            return initFirebaseAuthAnon();
        }
        const auth = firebase.auth();
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return auth.signInAnonymously().then(function () { return auth.currentUser; });
    }

    function ensureLoginOverlay() {
        if (document.getElementById('staffLoginOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'staffLoginOverlay';
        overlay.className = 'staff-login-overlay';
        overlay.innerHTML =
            '<div class="staff-login-card" role="dialog" aria-labelledby="staffLoginTitle">' +
            '<h2 id="staffLoginTitle">Area riservata 3DMAKES</h2>' +
            '<p>Inserisci la password del team per usare il gestionale.</p>' +
            '<form id="staffLoginForm" class="staff-login-form" autocomplete="on">' +
            '<label class="staff-login-label" for="staffPasswordInput">Password</label>' +
            '<input type="password" id="staffPasswordInput" class="staff-login-input" autocomplete="current-password" placeholder="Password team">' +
            '<p id="staffLoginMessage" class="staff-login-error"></p>' +
            '<button type="submit" class="staff-google-btn" id="staffLoginSubmitBtn">Accedi</button>' +
            '</form>' +
            '</div>';
        document.body.appendChild(overlay);

        document.getElementById('staffLoginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const input = document.getElementById('staffPasswordInput');
            const btn = document.getElementById('staffLoginSubmitBtn');
            const password = (input && input.value) || '';
            btn.disabled = true;
            setStaffLoginMessage('');
            signInWithPasswordStaff(password)
                .catch(function (err) {
                    setStaffLoginMessage(err.message || 'Password non corretta.');
                    if (input) input.select();
                })
                .finally(function () {
                    btn.disabled = false;
                });
        });
    }

    function setStaffLoginMessage(message) {
        const el = document.getElementById('staffLoginMessage');
        if (!el) return;
        if (message) {
            el.textContent = message;
            el.classList.add('is-visible');
        } else {
            el.textContent = '';
            el.classList.remove('is-visible');
        }
    }

    function showStaffLoginScreen(message) {
        ensureLoginOverlay();
        document.getElementById('staffLoginOverlay').classList.add('is-visible');
        document.body.classList.add('staff-login-active');
        if (message) setStaffLoginMessage(message);
        const input = document.getElementById('staffPasswordInput');
        if (input) setTimeout(function () { input.focus(); }, 50);
    }

    function hideStaffLoginScreen() {
        const el = document.getElementById('staffLoginOverlay');
        if (el) el.classList.remove('is-visible');
        document.body.classList.remove('staff-login-active');
        setStaffLoginMessage('');
        const input = document.getElementById('staffPasswordInput');
        if (input) input.value = '';
    }

    function updateStaffUserUI() {
        const label = document.getElementById('staffUserLabel');
        const logoutBtn = document.getElementById('staffLogoutBtn');
        if (label) {
            label.textContent = 'Team 3DMAKES';
            label.style.display = 'inline';
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-flex';
        }
    }

    function completeStaffLogin(user) {
        hideStaffLoginScreen();
        updateStaffUserUI();
        if (pendingResolve) {
            pendingResolve(user);
            pendingResolve = null;
            pendingReject = null;
        }
        return user;
    }

    function signInWithPasswordStaff(password) {
        const expected = getStaffPassword();
        if (!expected) {
            return Promise.reject(new Error('Password staff non configurata in firebase-config.js'));
        }
        if (String(password) !== String(expected)) {
            return Promise.reject(new Error('Password non corretta.'));
        }
        saveStaffSession();
        return signInFirebaseAnon().then(completeStaffLogin);
    }

    function signOutStaff() {
        clearStaffSession();
        staffAuthPromise = null;
        pendingResolve = null;
        pendingReject = null;

        ensureFirebaseApp();
        return firebase.auth().signOut().catch(function () { /* ignore */ })
            .then(function () {
                const label = document.getElementById('staffUserLabel');
                const logoutBtn = document.getElementById('staffLogoutBtn');
                if (label) label.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'none';
                showStaffLoginScreen('Sei uscito. Inserisci la password per continuare.');
            });
    }

    function initFirebaseStaffAuth() {
        if (staffAuthPromise) return staffAuthPromise;

        staffAuthPromise = new Promise(function (resolve, reject) {
            try {
                ensureLoginOverlay();
                setupStaffLogoutButtons();

                if (hasValidStaffSession()) {
                    signInFirebaseAnon()
                        .then(completeStaffLogin)
                        .catch(function (err) {
                            clearStaffSession();
                            showStaffLoginScreen('Sessione scaduta. Reinserisci la password.');
                            pendingResolve = resolve;
                            pendingReject = reject;
                        });
                    return;
                }

                showStaffLoginScreen();
                pendingResolve = resolve;
                pendingReject = reject;
            } catch (err) {
                reject(err);
            }
        });

        return staffAuthPromise;
    }

    function setupStaffLogoutButtons() {
        document.querySelectorAll('[data-staff-logout]').forEach(function (btn) {
            if (btn.dataset.staffLogoutBound) return;
            btn.dataset.staffLogoutBound = '1';
            btn.addEventListener('click', function () {
                signOutStaff();
            });
        });
    }

    window.initFirebaseStaffAuth = initFirebaseStaffAuth;
    window.signInWithPasswordStaff = signInWithPasswordStaff;
    window.signOutStaff = signOutStaff;
    window.isAllowedStaffEmail = function () { return true; };

    function bootStaffAuthUi() {
        if (!document.body || document.body.dataset.staffPublic === 'true') return;
        initFirebaseStaffAuth().catch(function (err) {
            console.error('Staff auth:', err);
            showStaffLoginScreen('Errore accesso. Ricarica la pagina.');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootStaffAuthUi);
    } else {
        bootStaffAuthUi();
    }
})();
