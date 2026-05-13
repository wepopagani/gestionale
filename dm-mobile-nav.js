/**
 * 3DMAKES — Mobile Navigation
 * Trasforma la dm-nav in un drawer (hamburger) su mobile (<= 860px).
 * Si auto-inietta nel dm-header se non è già presente un .dm-nav-toggle.
 *
 * Usabile in tutte le pagine (basta che ci sia <header class="dm-header">
 * con nav class="dm-nav" e div class="dm-header__actions").
 */
(function () {
  'use strict';

  function injectToggle() {
    const header = document.querySelector('.dm-header');
    if (!header) return null;
    if (header.querySelector('.dm-nav-toggle')) {
      return header.querySelector('.dm-nav-toggle');
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dm-nav-toggle';
    btn.setAttribute('aria-label', 'Apri menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'dm-nav-drawer');

    const icon = document.createElement('span');
    icon.className = 'dm-nav-toggle__icon';
    icon.setAttribute('aria-hidden', 'true');
    btn.appendChild(icon);

    // Inserisci subito dopo il logo (a sx) — appare a destra su mobile via order
    const logo = header.querySelector('.dm-logo');
    if (logo && logo.nextSibling) {
      header.insertBefore(btn, logo.nextSibling);
    } else {
      header.appendChild(btn);
    }
    return btn;
  }

  function injectBackdrop() {
    let bd = document.querySelector('.dm-nav-backdrop');
    if (bd) return bd;
    bd = document.createElement('div');
    bd.className = 'dm-nav-backdrop';
    document.body.appendChild(bd);
    return bd;
  }

  function setup() {
    const header = document.querySelector('.dm-header');
    if (!header) return;
    const nav = header.querySelector('.dm-nav');
    if (!nav) return;
    if (!nav.id) nav.id = 'dm-nav-drawer';

    const actions = header.querySelector('.dm-header__actions');
    const toggle = injectToggle();
    const backdrop = injectBackdrop();

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      if (actions) actions.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
      document.body.classList.toggle('dm-nav-open', open);
    }

    toggle.addEventListener('click', function (ev) {
      ev.preventDefault();
      const isOpen = nav.classList.contains('is-open');
      setOpen(!isOpen);
    });

    backdrop.addEventListener('click', function () { setOpen(false); });

    // Chiudi al click su un link interno del drawer
    nav.addEventListener('click', function (ev) {
      const a = ev.target.closest('a');
      if (a) setOpen(false);
    });
    if (actions) {
      actions.addEventListener('click', function (ev) {
        const a = ev.target.closest('a, button');
        if (a) setOpen(false);
      });
    }

    // ESC per chiudere
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
      }
    });

    // Chiudi se si torna a desktop
    const mq = window.matchMedia('(min-width: 769px)');
    function handleMQ(e) { if (e.matches) setOpen(false); }
    if (mq.addEventListener) mq.addEventListener('change', handleMQ);
    else if (mq.addListener) mq.addListener(handleMQ);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
