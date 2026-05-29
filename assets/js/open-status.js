/* =========================================================
   MIS — OPEN STATUS BADGE (standalone)
   Mount sur tout element [data-mis-open-status].
   Affiche pastille verte/rouge + label traduit.
   Re-render sur changement de langue + chaque minute + visibilitychange.
   Horaires intégrés (Lourdes, 7j/7) — pas de dépendance cart.
========================================================= */
(function () {
  'use strict';

  // Horaires d'ouverture : 09:00-02:00 (service continu passant minuit), 7j/7
  // Format : [[heureOuverture, heureFermeture], ...]
  var SERVICES = [
    { open: '09:00', close: '02:00' }
  ];

  function toMin(hhmm) {
    var parts = hhmm.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  function toHHMM(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' + h : h) + 'h' + (m < 10 ? '0' + m : m);
  }

  /**
   * Calcule le statut d'ouverture courant.
   * Retourne : { isOpen, closesAt, opensAt, opensTomorrow }
   */
  function computeStatus() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();

    // Service courant ?
    for (var i = 0; i < SERVICES.length; i++) {
      var openMin  = toMin(SERVICES[i].open);
      var closeMin = toMin(SERVICES[i].close);
      var overnight = closeMin <= openMin; // service passant minuit (ex. 09:00 -> 02:00)
      var isNow = overnight ? (nowMin >= openMin || nowMin < closeMin)
                            : (nowMin >= openMin && nowMin < closeMin);
      if (isNow) {
        return { isOpen: true, closesAt: toHHMM(closeMin), opensAt: null, opensTomorrow: false };
      }
    }

    // Sinon : prochain service du jour ?
    for (var j = 0; j < SERVICES.length; j++) {
      var nextOpen = toMin(SERVICES[j].open);
      if (nowMin < nextOpen) {
        return { isOpen: false, closesAt: null, opensAt: toHHMM(nextOpen), opensTomorrow: false };
      }
    }

    // Sinon : rouvre demain au 1er service
    return { isOpen: false, closesAt: null, opensAt: toHHMM(toMin(SERVICES[0].open)), opensTomorrow: true };
  }

  function tt(key, vars) {
    if (window.MISI18n && typeof window.MISI18n.t === 'function') {
      return window.MISI18n.t(key, vars);
    }
    // Fallback FR
    var fr = {
      'os.open': 'Ouvert',
      'os.openClosesAt': 'Ouvert · Ferme à {time}',
      'os.closed': 'Fermé',
      'os.closedReopenAt': 'Fermé · Rouvre à {time}',
      'os.closedReopenTomorrow': 'Fermé · Rouvre demain à {time}',
      'os.in': 'dans {min} min',
      'os.inHm': 'dans {h}h{m}'
    };
    var raw = fr[key] || key;
    if (vars) {
      raw = raw.replace(/\{(\w+)\}/g, function (_m, k) {
        return (vars[k] != null) ? String(vars[k]) : '{' + k + '}';
      });
    }
    return raw;
  }

  function buildLabel(status, short) {
    if (short) {
      return status.isOpen ? tt('os.open') : tt('os.closed');
    }
    if (status.isOpen) {
      return tt('os.openClosesAt', { time: status.closesAt || '' });
    }
    if (status.opensTomorrow) {
      return tt('os.closedReopenTomorrow', { time: status.opensAt || '' });
    }
    return tt('os.closedReopenAt', { time: status.opensAt || '' });
  }

  function render() {
    var hosts = document.querySelectorAll('[data-mis-open-status]');
    if (!hosts.length) return;
    var status = computeStatus();
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      host.classList.remove('is-open', 'is-closed');
      host.classList.add(status.isOpen ? 'is-open' : 'is-closed');

      host.replaceChildren();

      var dot = document.createElement('span');
      dot.className = 'mis-status-dot';
      dot.setAttribute('aria-hidden', 'true');

      var label = document.createElement('span');
      label.className = 'mis-status-label';
      var variant = host.getAttribute('data-mis-open-status') || '';
      var fullLabel = buildLabel(status, false);
      label.textContent = variant === 'short' ? buildLabel(status, true) : fullLabel;

      host.appendChild(dot);
      host.appendChild(label);
      host.setAttribute('aria-label', fullLabel);
      host.setAttribute('role', 'status');
    }
  }

  function init() {
    render();
    setInterval(render, 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') render();
    });
    window.addEventListener('mis:langchange', render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
