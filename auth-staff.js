/**
 * Accesso staff al gestionale tramite Google Sign-In.
 * Popup al click (gesto utente); redirect solo se il popup è bloccato.
 */
(function () {
    let staffAuthPromise = null;
    let staffAuthResolved = false;
    let staffAuthChecked = false;
    let lastDeniedEmail = '';
    let activeStaffUser = null;
    let redirectResultHandled = false;

    const FALLBACK_ALLOWED_EMAILS = ['info@3dmakes.ch', 'info@3dmakes.it'];
    const FALLBACK_ALLOWED_DOMAINS = ['3dmakes.ch', '3dmakes.it'];

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
        const fromWindow = window.gestionaleAllowedEmails;
        if (Array.isArray(fromWindow) && fromWindow.length) return fromWindow;
        return FALLBACK_ALLOWED_EMAILS;
    }

    function getAllowedDomains() {
        const fromWindow = window.gestionaleAllowedDomains;
        if (Array.isArray(fromWindow) && fromWindow.length) return fromWindow;
        return FALLBACK_ALLOWED_DOMAINS;
    }

    function isAllowedStaffEmail(email) {
        const e = normalizeEmail(email);
        if (!e) return false;

        if (getAllowedEmails().map(normalizeEmail).includes(e)) return true;

        return getAllowedDomains().some(function (domain) {
            const d = String(domain || '').trim().toLowerCase().replace(/^@/, '');
            return d && e.endsWith('@' + d);
        });
    }

    function isFirebaseAuthCallbackUrl() {
        const search = window.location.search || '';
        const hash = window.location.hash || '';
        return /(^|[?&#])(apiKey|authType|code|state|access_token)=/i.test(search + hash);
    }

    function cleanUrlAfterAuth() {
        try {
            if (isFirebaseAuthCallbackUrl()) {
                history.replaceState(null, '', window.location.pathname);
                return;
            }
            const hash = window.location.hash || '';
            if (/^#(dashboard|clients|report)\b/i.test(hash)) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        } catch (e) { /* ignore */ }
    }

    function stripAppHashBeforeRedirect() {
        try {
            const hash = window.location.hash || '';
            if (/^#(dashboard|clients|report)\b/i.test(hash)) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        } catch (e) { /* ignore */ }
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
            '<p id="staffLoginStatus" class="staff-login-status">Verifica accesso…</p>' +
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
            setStaffLoginStatus('Connessione a Google…');
            signInWithGoogleStaff().catch(function (err) {
                console.error(err);
                setStaffLoginMessage(formatStaffAuthError(err));
                setStaffLoginStatus('');
                btn.disabled = false;
                resetGoogleButton();
            });
        });
    }

    function resetGoogleButton() {
        const btn = document.getElementById('staffGoogleSignInBtn');
        if (!btn) return;
        btn.innerHTML = '<span aria-hidden="true">G</span> Accedi con Google';
    }

    function setStaffLoginStatus(message) {
        const el = document.getElementById('staffLoginStatus');
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('is-visible', !!message);
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
        if (err.code === 'auth/popup-blocked') {
            return 'Popup bloccato dal browser. Consenti i popup per questo sito e riprova.';
        }
        if (err.code === 'auth/popup-closed-by-user') {
            return 'Accesso annullato. Riprova quando vuoi.';
        }
        if (err.code === 'auth/operation-not-allowed') {
            return 'Google Sign-In non abilitato su Firebase. Abilitalo in Authentication → Sign-in method.';
        }
        if (err.code === 'auth/unauthorized-domain') {
            return 'Dominio non autorizzato. Aggiungi clienti.3dmakes.ch in Firebase → Authentication → Authorized domains.';
        }
        return err.message || 'Accesso non riuscito. Riprova.';
    }

    function showStaffLoginScreen(message, status) {
        ensureLoginOverlay();
        document.getElementById('staffLoginOverlay').classList.add('is-visible');
        document.body.classList.add('staff-login-active');
        setStaffLoginStatus(status || '');
        if (message) setStaffLoginMessage(message);
    }

    function hideStaffLoginScreen() {
        const el = document.getElementById('staffLoginOverlay');
        if (el) el.classList.remove('is-visible');
        document.body.classList.remove('staff-login-active');
        setStaffLoginMessage('');
        setStaffLoginStatus('');
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

    function resolveAllowedUser(user) {
        if (!user) return Promise.resolve(null);

        const email = user.email || '';
        if (isAllowedStaffEmail(email)) {
            lastDeniedEmail = '';
            activeStaffUser = user;
            hideStaffLoginScreen();
            updateStaffUserUI(user);
            return Promise.resolve(user);
        }

        lastDeniedEmail = email;
        activeStaffUser = null;
        return firebase.auth().signOut().then(function () {
            showStaffLoginScreen(
                'Account non autorizzato: ' + (email || 'email mancante') + '.',
                ''
            );
            return null;
        });
    }

    function applyAuthState(user, options) {
        options = options || {};
        staffAuthChecked = true;

        if (!user && activeStaffUser && !options.forceLogout) {
            return Promise.resolve(activeStaffUser);
        }

        return resolveAllowedUser(user).then(function (allowedUser) {
            if (allowedUser) {
                if (!staffAuthResolved) staffAuthResolved = true;
                return allowedUser;
            }

            activeStaffUser = null;
            if (lastDeniedEmail) {
                showStaffLoginScreen('Account non autorizzato: ' + lastDeniedEmail + '.', '');
            } else if (staffAuthChecked && !options.silent) {
                showStaffLoginScreen('', '');
            }
            return null;
        });
    }

    function googleProvider() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ prompt: 'select_account' });
        return provider;
    }

    function signInWithGoogleStaff() {
        ensureFirebaseApp();
        stripAppHashBeforeRedirect();
        const auth = firebase.auth();
        const provider = googleProvider();

        return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(function () {
                return auth.signInWithPopup(provider)
                    .then(function (result) {
                        return applyAuthState(result.user);
                    })
                    .then(function (allowedUser) {
                        if (!allowedUser) {
                            throw new Error('Accesso negato per questo account Google.');
                        }
                        return allowedUser;
                    });
            })
            .catch(function (err) {
                if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request')) {
                    setStaffLoginStatus('Popup bloccato, reindirizzamento a Google…');
                    return auth.signInWithRedirect(provider);
                }
                throw err;
            });
    }

    function signOutStaff() {
        ensureFirebaseApp();
        return firebase.auth().signOut().then(function () {
            staffAuthPromise = null;
            staffAuthResolved = false;
            staffAuthChecked = true;
            lastDeniedEmail = '';
            activeStaffUser = null;
            redirectResultHandled = false;
            showStaffLoginScreen('Sei uscito. Accedi di nuovo per continuare.', '');
        });
    }

    function initFirebaseStaffAuth() {
        if (staffAuthPromise) return staffAuthPromise;

        staffAuthPromise = new Promise(function (resolve, reject) {
            try {
                ensureFirebaseApp();
                const auth = firebase.auth();

                ensureLoginOverlay();
                setStaffLoginStatus('Verifica accesso…');
                document.getElementById('staffLoginOverlay').classList.add('is-visible');
                document.body.classList.add('staff-login-active');

                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () { /* ignore */ });

                // IMPORTANTE: getRedirectResult PRIMA di modificare l'URL (hash/query auth).
                auth.getRedirectResult()
                    .then(function (result) {
                        if (result && result.user) {
                            return applyAuthState(result.user);
                        }
                        if (auth.currentUser) {
                            return applyAuthState(auth.currentUser);
                        }
                        return null;
                    })
                    .catch(function (err) {
                        console.error('getRedirectResult:', err);
                        showStaffLoginScreen(formatStaffAuthError(err), '');
                    })
                    .finally(function () {
                        redirectResultHandled = true;
                        cleanUrlAfterAuth();
                    });

                auth.onAuthStateChanged(function (user) {
                    applyAuthState(user, { silent: !staffAuthChecked }).then(function (allowedUser) {
                        if (allowedUser) resolve(allowedUser);
                    });
                }, function (err) {
                    if (!staffAuthResolved) reject(err);
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

    function bootStaffAuthUi() {
        if (!document.body || document.body.dataset.staffPublic === 'true') return;
        ensureLoginOverlay();
        setupStaffLogoutButtons();
        initFirebaseStaffAuth().catch(function (err) {
            console.error('Staff auth boot:', err);
            showStaffLoginScreen(formatStaffAuthError(err), '');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootStaffAuthUi);
    } else {
        bootStaffAuthUi();
    }
})();
