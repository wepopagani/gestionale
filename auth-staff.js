/**
 * Accesso staff al gestionale tramite Google Sign-In (redirect, no popup).
 * La sessione resta attiva nel browser (Firebase LOCAL persistence) fino a logout.
 */
(function () {
    let staffAuthPromise = null;
    let staffAuthResolved = false;

    function ensureFirebaseApp() {
        if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
            throw new Error('Firebase non configurato.');
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.app();
    }

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function getAllowedEmails() {
        return Array.isArray(window.gestionaleAllowedEmails) ? window.gestionaleAllowedEmails : [];
    }

    function getAllowedDomains() {
        return Array.isArray(window.gestionaleAllowedDomains) ? window.gestionaleAllowedDomains : [];
    }

    function isAllowedStaffEmail(email) {
        const e = normalizeEmail(email);
        if (!e) return false;

        const allowedEmails = getAllowedEmails();
        if (allowedEmails.length) {
            if (allowedEmails.map(normalizeEmail).includes(e)) return true;
        }

        const allowedDomains = getAllowedDomains();
        if (allowedDomains.length) {
            return allowedDomains.some(function (domain) {
                const d = String(domain || '').trim().toLowerCase().replace(/^@/, '');
                return d && e.endsWith('@' + d);
            });
        }

        return false;
    }

    function ensureLoginOverlay() {
        if (document.getElementById('staffLoginOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'staffLoginOverlay';
        overlay.className = 'staff-login-overlay';
        overlay.innerHTML =
            '<div class="staff-login-card" role="dialog" aria-labelledby="staffLoginTitle">' +
            '<h2 id="staffLoginTitle">Area riservata 3DMAKES</h2>' +
            '<p>Accedi con il tuo account Google autorizzato per usare il gestionale.</p>' +
            '<p id="staffLoginMessage" class="staff-login-error"></p>' +
            '<button type="button" class="staff-google-btn" id="staffGoogleSignInBtn">' +
            '<span aria-hidden="true">G</span> Accedi con Google' +
            '</button>' +
            '</div>';
        document.body.appendChild(overlay);

        document.getElementById('staffGoogleSignInBtn').addEventListener('click', function () {
            const btn = document.getElementById('staffGoogleSignInBtn');
            btn.disabled = true;
            setStaffLoginMessage('');
            signInWithGoogleStaff().catch(function (err) {
                console.error(err);
                setStaffLoginMessage(formatStaffAuthError(err));
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

    function formatStaffAuthError(err) {
        if (!err) return 'Accesso non riuscito. Riprova.';
        if (err.message && /non autorizzato|Accesso negato/i.test(err.message)) return err.message;
        if (err.code === 'auth/operation-not-allowed') {
            return 'Google Sign-In non abilitato su Firebase. Abilitalo in Authentication → Sign-in method.';
        }
        if (err.code === 'auth/unauthorized-domain') {
            return 'Dominio non autorizzato. Aggiungi questo sito in Firebase → Authentication → Authorized domains.';
        }
        return err.message || 'Accesso non riuscito. Riprova.';
    }

    function showStaffLoginScreen(message) {
        ensureLoginOverlay();
        document.getElementById('staffLoginOverlay').classList.add('is-visible');
        document.body.classList.add('staff-login-active');
        if (message) setStaffLoginMessage(message);
    }

    function hideStaffLoginScreen() {
        const el = document.getElementById('staffLoginOverlay');
        if (el) el.classList.remove('is-visible');
        document.body.classList.remove('staff-login-active');
        setStaffLoginMessage('');
    }

    function updateStaffUserUI(user) {
        const label = document.getElementById('staffUserLabel');
        const logoutBtn = document.getElementById('staffLogoutBtn');
        if (label) {
            label.textContent = (user && (user.displayName || user.email)) || '';
            label.style.display = user ? 'inline' : 'none';
        }
        if (logoutBtn) {
            logoutBtn.style.display = user ? 'inline-flex' : 'none';
        }
    }

    function handleStaffUser(user) {
        if (user && isAllowedStaffEmail(user.email)) {
            hideStaffLoginScreen();
            updateStaffUserUI(user);
            return Promise.resolve(user);
        }
        if (user && !isAllowedStaffEmail(user.email)) {
            return firebase.auth().signOut().then(function () {
                showStaffLoginScreen('Account non autorizzato: ' + (user.email || ''));
                return null;
            });
        }
        updateStaffUserUI(null);
        const msgEl = document.getElementById('staffLoginMessage');
        const hasVisibleError = msgEl && msgEl.classList.contains('is-visible') && msgEl.textContent;
        if (!hasVisibleError) {
            showStaffLoginScreen();
        } else {
            ensureLoginOverlay();
            document.getElementById('staffLoginOverlay').classList.add('is-visible');
            document.body.classList.add('staff-login-active');
        }
        return Promise.resolve(null);
    }

    function signInWithGoogleStaff() {
        ensureFirebaseApp();
        const auth = firebase.auth();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const btn = document.getElementById('staffGoogleSignInBtn');
        if (btn) btn.textContent = 'G Reindirizzamento a Google…';
        setStaffLoginMessage('Attendi, ti portiamo alla pagina di accesso Google…');
        return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(function () { return auth.signInWithRedirect(provider); });
    }

    function signOutStaff() {
        ensureFirebaseApp();
        return firebase.auth().signOut().then(function () {
            staffAuthPromise = null;
            staffAuthResolved = false;
            showStaffLoginScreen('Sei uscito. Accedi di nuovo per continuare.');
        });
    }

    function initFirebaseStaffAuth() {
        if (staffAuthPromise) return staffAuthPromise;

        staffAuthPromise = new Promise(function (resolve, reject) {
            try {
                ensureFirebaseApp();
                const auth = firebase.auth();
                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () { /* ignore */ });

                auth.getRedirectResult()
                    .then(function (result) {
                        if (result && result.user) {
                            return handleStaffUser(result.user);
                        }
                        return null;
                    })
                    .catch(function (err) {
                        console.error('getRedirectResult:', err);
                        showStaffLoginScreen(formatStaffAuthError(err));
                    })
                    .finally(function () {
                        auth.onAuthStateChanged(function (user) {
                            handleStaffUser(user).then(function (allowedUser) {
                                if (allowedUser && !staffAuthResolved) {
                                    staffAuthResolved = true;
                                    resolve(allowedUser);
                                }
                            });
                        }, function (err) {
                            if (!staffAuthResolved) reject(err);
                        });
                    });
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
    window.signInWithGoogleStaff = signInWithGoogleStaff;
    window.signOutStaff = signOutStaff;
    window.isAllowedStaffEmail = isAllowedStaffEmail;

    document.addEventListener('DOMContentLoaded', function () {
        if (document.body && document.body.dataset.staffPublic === 'true') return;
        ensureLoginOverlay();
        setupStaffLogoutButtons();
        document.body.classList.add('staff-login-active');
        document.getElementById('staffLoginOverlay').classList.add('is-visible');
    });
})();
