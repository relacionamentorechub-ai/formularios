/**
 * _hub.js — Script compartilhado do Hub Interno R.E.C.
 * Responsável por: auth guard, header com logout/usuário, modal de sugestão.
 * Incluir no <head> ou antes do </body> de cada página do hub.
 *
 * Uso: após incluir o script, chame hubInit('nome-da-pagina') no DOMContentLoaded.
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'rec_hub_token';
  var USER_KEY  = 'rec_hub_user';
  var LOGIN_URL = 'login.html';

  /* ── AUTH ── */
  function getToken()    { return localStorage.getItem(TOKEN_KEY); }
  function getUsername() { return localStorage.getItem(USER_KEY) || ''; }
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = LOGIN_URL;
  }

  async function verifyAndInit(paginaAtual) {
    var token = getToken();
    if (!token) { window.location.href = LOGIN_URL; return; }

    try {
      var r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token: token })
      });
      var data = await r.json();
      if (!r.ok || !data.ok) { logout(); return; }
      // Token válido — atualiza username se vier no response
      if (data.username) localStorage.setItem(USER_KEY, data.username);
      injectHubUI(paginaAtual);
    } catch (e) {
      // Falha de rede: permite acesso offline (serverless pode estar cold)
      console.warn('[hub] auth verify falhou (rede?):', e.message);
      if (!token) { window.location.href = LOGIN_URL; return; }
      injectHubUI(paginaAtual);
    }
  }

  /* ── UI INJECTION ── */
  function injectHubUI(paginaAtual) {
    addStyles();
    patchHeader();
    addSuggestionModal(paginaAtual);
  }

  function addStyles() {
    if (document.getElementById('_hub_styles')) return;
    var s = document.createElement('style');
    s.id = '_hub_styles';
    s.textContent = `
/* HUB NAV BAR */
.hub-nav-bar{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;}
.hub-nav-bar::-webkit-scrollbar{display:none;}
.hub-nav-link{font-size:11.5px;font-weight:600;color:var(--text-muted,#4A5A72);text-decoration:none;padding:5px 12px;border-radius:20px;transition:all .2s;letter-spacing:.02em;white-space:nowrap;flex-shrink:0;}
.hub-nav-link:hover{color:var(--cyan,#06B6D4);background:rgba(6,182,212,.08);}
.hub-nav-link.active{color:var(--cyan,#06B6D4);background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);}
.hub-nav-divider{width:1px;height:14px;background:rgba(6,182,212,.15);flex-shrink:0;}
.hub-user-badge{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--text-secondary,#94A3B8);background:rgba(6,182,212,.06);border:1px solid rgba(6,182,212,.12);padding:5px 12px;border-radius:20px;white-space:nowrap;}
.hub-user-dot{width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 6px rgba(16,185,129,.6);}
.btn-suggest{background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.25);color:#A78BFA;border-radius:8px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit;white-space:nowrap;}
.btn-suggest:hover{background:rgba(124,58,237,.2);color:#C4B5FD;}
.btn-logout{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#FCA5A5;border-radius:8px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit;white-space:nowrap;}
.btn-logout:hover{background:rgba(239,68,68,.18);color:#FEE2E2;}
@media(max-width:720px){
  .hub-nav-divider{display:none;}
  .hub-nav-link{font-size:11px;padding:4px 9px;}
  #hub_username{display:none;}
  .btn-suggest{padding:5px 8px;font-size:11px;}
  .btn-logout{padding:5px 8px;font-size:11px;}
}

/* SUGGESTION MODAL */
.hub-modal-backdrop{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:20px;}
.hub-modal-backdrop.open{display:flex;animation:hub-fade-in .2s ease-out;}
@keyframes hub-fade-in{from{opacity:0}to{opacity:1}}
.hub-modal{background:#080E22;border:1px solid rgba(124,58,237,.3);border-radius:18px;padding:32px;width:100%;max-width:480px;position:relative;box-shadow:0 0 60px rgba(124,58,237,.2),0 30px 80px rgba(0,0,0,.5);animation:hub-slide-up .25s ease-out;}
@keyframes hub-slide-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.hub-modal::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,.6),transparent);border-radius:18px 18px 0 0;}
.hub-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;color:rgba(148,163,184,.6);font-size:20px;cursor:pointer;line-height:1;padding:4px;transition:color .2s;}
.hub-modal-close:hover{color:#F0F6FF;}
.hub-modal-eyebrow{display:inline-flex;align-items:center;gap:7px;background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.25);color:#A78BFA;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:5px 12px;border-radius:50px;margin-bottom:12px;}
.hub-modal-title{font-size:20px;font-weight:800;color:#F0F6FF;margin-bottom:6px;}
.hub-modal-sub{font-size:13px;color:#64748B;margin-bottom:20px;}
.hub-modal label{display:block;font-size:12px;font-weight:600;color:#94A3B8;margin-bottom:7px;letter-spacing:.02em;}
.hub-modal select,.hub-modal textarea{width:100%;padding:11px 14px;background:rgba(6,15,35,.8);border:1.5px solid rgba(6,182,212,.12);border-radius:10px;font-size:14px;color:#F0F6FF;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s;margin-bottom:14px;}
.hub-modal select{cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2306B6D4' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;-webkit-appearance:none;}
.hub-modal select option{background:#0A1628;}
.hub-modal textarea{resize:vertical;min-height:100px;line-height:1.6;}
.hub-modal select:focus,.hub-modal textarea:focus{border-color:rgba(124,58,237,.5);box-shadow:0 0 0 3px rgba(124,58,237,.12);}
.hub-modal-actions{display:flex;gap:10px;margin-top:4px;}
.btn-modal-send{flex:1;padding:12px;background:linear-gradient(135deg,#5B21B6,#7C3AED);color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:transform .15s,box-shadow .2s;}
.btn-modal-send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(124,58,237,.4);}
.btn-modal-send:disabled{opacity:.55;cursor:not-allowed;}
.btn-modal-cancel{padding:12px 20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#94A3B8;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;}
.btn-modal-cancel:hover{background:rgba(255,255,255,.08);}
.hub-modal-alert{padding:10px 14px;border-radius:8px;font-size:12.5px;margin-bottom:10px;display:none;}
.hub-modal-alert.show{display:block;}
.hub-modal-alert.err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#FCA5A5;}
.hub-modal-alert.ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:#6EE7B7;}
`;
    document.head.appendChild(s);
  }

  function patchHeader() {
    var headerRight = document.querySelector('.header-right');
    if (!headerRight) return;

    var username = getUsername() || 'Equipe';

    // Nav links
    var nav = document.createElement('div');
    nav.className = 'hub-nav-bar';
    nav.id = 'hub_nav_bar';
    nav.innerHTML = [
      '<a href="index.html" class="hub-nav-link" data-page="dashboard">🏠 Hub</a>',
      '<div class="hub-nav-divider"></div>',
      '<a href="diagnostico.html" class="hub-nav-link" data-page="diagnostico">🔍 Diagnóstico</a>',
      '<a href="campanha.html" class="hub-nav-link" data-page="campanha">📊 Campanha</a>',
      '<a href="conteudo.html" class="hub-nav-link" data-page="conteudo">✍️ Conteúdo</a>',
      '<a href="briefing.html" class="hub-nav-link" data-page="briefing">📋 Briefing</a>',
      '<a href="reunioes.html" class="hub-nav-link" data-page="reunioes">📅 Reuniões</a>',
      '<div class="hub-nav-divider"></div>',
      '<a href="crm.html" class="hub-nav-link" data-page="crm">🎯 CRM</a>',
      '<a href="relatorio.html" class="hub-nav-link" data-page="relatorio">📈 Relatório</a>',
      '<a href="contrato.html" class="hub-nav-link" data-page="contrato">📄 Contrato</a>',
    ].join('');

    // User + actions
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:8px;';
    actions.innerHTML = `
      <div class="hub-user-badge"><span class="hub-user-dot"></span><span id="hub_username">${escHtml(username)}</span></div>
      <button class="btn-suggest" onclick="hubOpenSuggest()">💡 Sugerir</button>
      <button class="btn-logout" onclick="hubLogout()">Sair</button>
    `;

    // Limpar header e inserir
    headerRight.innerHTML = '';
    headerRight.appendChild(nav);
    headerRight.appendChild(actions);

    // Marcar link ativo — feito pelo chamador via window._hubPage
    setTimeout(markActiveNav, 50);
  }

  function markActiveNav() {
    var page = window._hubPage || '';
    document.querySelectorAll('.hub-nav-link').forEach(function(a) {
      a.classList.toggle('active', a.dataset.page === page);
    });
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function addSuggestionModal(paginaAtual) {
    if (document.getElementById('hub_suggest_modal')) return;

    var navLabels = {
      dashboard:'Dashboard', diagnostico:'Diagnóstico Digital',
      campanha:'Briefing de Campanha', conteudo:'Geração de Conteúdo',
      briefing:'Briefing de Reunião', reunioes:'Reuniões'
    };

    var backdrop = document.createElement('div');
    backdrop.className = 'hub-modal-backdrop';
    backdrop.id = 'hub_suggest_modal';
    backdrop.addEventListener('click', function(e) { if (e.target === this) hubCloseSuggest(); });

    backdrop.innerHTML = `
      <div class="hub-modal">
        <button class="hub-modal-close" onclick="hubCloseSuggest()">✕</button>
        <div class="hub-modal-eyebrow">✦ Feedback</div>
        <div class="hub-modal-title">Sugerir alteração</div>
        <div class="hub-modal-sub">Sua ideia vai direto para o Henrique por e-mail.</div>
        <div class="hub-modal-alert" id="hub_suggest_alert"></div>
        <label>Página / Área</label>
        <select id="hub_suggest_pagina">
          ${Object.entries(navLabels).map(([k,v]) => `<option value="${k}"${k===paginaAtual?' selected':''}>${v}</option>`).join('')}
          <option value="Geral">Geral / Outro</option>
        </select>
        <label>Descrição da sugestão</label>
        <textarea id="hub_suggest_msg" placeholder="Ex: Na aba Conteúdo, seria legal ter a opção de escolher o estilo do texto (mais formal, mais descontraído)..."></textarea>
        <div class="hub-modal-actions">
          <button class="btn-modal-send" id="hub_suggest_send" onclick="hubSendSuggest()">Enviar sugestão</button>
          <button class="btn-modal-cancel" onclick="hubCloseSuggest()">Cancelar</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);
  }

  /* ── GLOBALS ── */
  window.hubLogout = logout;

  window.hubOpenSuggest = function() {
    var m = document.getElementById('hub_suggest_modal');
    if (m) m.classList.add('open');
    setTimeout(function(){ var el=document.getElementById('hub_suggest_msg'); if(el) el.focus(); }, 150);
  };

  window.hubCloseSuggest = function() {
    var m = document.getElementById('hub_suggest_modal');
    if (m) m.classList.remove('open');
    var al = document.getElementById('hub_suggest_alert'); if(al){ al.className='hub-modal-alert'; al.textContent=''; }
    var msg = document.getElementById('hub_suggest_msg'); if(msg) msg.value='';
  };

  window.hubSendSuggest = async function() {
    var pagina  = (document.getElementById('hub_suggest_pagina')||{}).value || '';
    var mensagem = ((document.getElementById('hub_suggest_msg')||{}).value || '').trim();
    var alEl = document.getElementById('hub_suggest_alert');
    var btn  = document.getElementById('hub_suggest_send');

    function alert(msg, kind) {
      alEl.textContent = msg;
      alEl.className = 'hub-modal-alert show ' + (kind||'err');
    }

    if (mensagem.length < 5) { alert('Escreva um pouco mais sobre a sugestão.'); return; }
    btn.disabled = true; btn.textContent = 'Enviando...';

    try {
      var r = await fetch('/api/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: getUsername(), pagina, mensagem })
      });
      var data = await r.json();
      if (data.ok) {
        alert('✓ Sugestão enviada! Obrigada pelo feedback.', 'ok');
        setTimeout(window.hubCloseSuggest, 2200);
      } else {
        alert(data.error || 'Falha ao enviar. Tente novamente.');
        btn.disabled = false; btn.textContent = 'Enviar sugestão';
      }
    } catch(e) {
      alert('Erro de conexão. Tente novamente.');
      btn.disabled = false; btn.textContent = 'Enviar sugestão';
    }
  };

  /* ── EXPORT ── */
  window.hubInit = function(paginaAtual) {
    window._hubPage = paginaAtual || '';
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { verifyAndInit(paginaAtual); });
    } else {
      verifyAndInit(paginaAtual);
    }
  };
})();
