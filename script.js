// Année footer
document.addEventListener('DOMContentLoaded', ()=>{
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// Typewriter simple (préserve espaces)
document.addEventListener('DOMContentLoaded', ()=>{
  const speed = 26;
  document.querySelectorAll('.typer').forEach(el=>{
    const text=(el.getAttribute('data-typer')||el.textContent).trim();
    el.textContent=''; let i=0;
    (function tick(){ el.textContent=text.slice(0,i++); if(i<=text.length){setTimeout(tick,speed)} else {el.classList.add('is-done')} })();
  });
});

// Viewport mobile (fallback vieux iOS/Android)
function setVH(){
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}vh`);
}
setVH();
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', setVH);

// Hamburger (pilotage aria-expanded)
(function(){
  const burger  = document.querySelector('.burger');
  const menuNav = document.querySelector('nav.menu');
  if(!burger || !menuNav) return;

  burger.addEventListener('click', (e)=>{
    e.preventDefault();
    const open = menuNav.getAttribute('aria-expanded') === 'true' ? false : true;
    menuNav.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Fermer après clic sur un lien
  document.addEventListener('click', (e)=>{
    if(e.target.closest('#nav-list a')){
      menuNav.setAttribute('aria-expanded','false');
      burger.setAttribute('aria-expanded','false');
    }
  });

  // Fermer si clic en dehors
  document.addEventListener('click', (e)=>{
    if(menuNav.getAttribute('aria-expanded') === 'true' &&
       !e.target.closest('nav.menu') &&
       !e.target.closest('.burger')){
      menuNav.setAttribute('aria-expanded','false');
      burger.setAttribute('aria-expanded','false');
    }
  });
})();

// Formulaire : message de confirmation sans quitter la page
document.addEventListener('submit', e=>{
  const form = e.target.closest('#devisForm');
  if(!form) return;
  e.preventDefault();
  form.outerHTML =
    '<div class="alert info" style="border-radius:12px;padding:12px 14px;border:1px solid #cfe6fb;background:#f2f7ff;color:#1e3350">'+
    '<strong>Votre demande a été envoyée.</strong> Nous vous recontactons très vite. Merci !</div>';
});
// Fallback navigation hash (Samsung) : force le scroll vers l'ancre
document.addEventListener('click', function(e){
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const hash = a.getAttribute('href');
  const target = document.querySelector(hash);
  if(target){
    e.preventDefault();
    target.scrollIntoView({behavior:'smooth', block:'start'});
    history.pushState(null, '', hash);
  }
});
/* ============================
   Nettoyage Express — script.js
   - Menu hamburger (mobile)
   - Navigation ancres (click + touch, #id & index.html#id)
   - Formulaire : message de confirmation inline
   ============================ */

/* -------- Menu burger -------- */
(function(){
  const nav = document.querySelector('nav.menu');
  const burger = document.querySelector('.burger');
  const list = document.querySelector('#nav-list');

  if (burger && nav && list) {
    const toggle = () => {
      const expanded = nav.getAttribute('aria-expanded') === 'true';
      nav.setAttribute('aria-expanded', String(!expanded));
      burger.setAttribute('aria-expanded', String(!expanded));
    };
    burger.addEventListener('click', toggle);

    // Fermer le menu après un clic sur un lien
    list.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      nav.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-expanded', 'false');
    }, true);
  }
})();

/* -------- Navigation ancres robuste (iOS + Android/Samsung) -------- */
(function(){
  function goToHashFromHref(href){
    if (!href) return false;
    const i = href.indexOf('#');
    if (i === -1) return false;

    const hash = href.slice(i);
    if (!hash || hash === '#') return false;

    const el = document.querySelector(hash);
    if (!el) return false;

    el.scrollIntoView({ behavior:'smooth', block:'start' });
    try { history.pushState(null,'',hash); } catch(e){}
    return true;
  }

  // Click : tous devices
  document.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.includes('#')) {
      const ok = goToHashFromHref(href);
      if (ok) { e.preventDefault(); e.stopPropagation(); }
    }
  }, true);

  // Touchend : certains Samsung “mangent” le click
  document.addEventListener('touchend', function(e){
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.includes('#')) {
      const ok = goToHashFromHref(href);
      if (ok) { e.preventDefault(); e.stopPropagation(); }
    }
  }, { passive:false, capture:true });
})();

/* -------- Formulaire : message "envoyé" sans backend -------- */
(function(){
  const form = document.getElementById('devisForm');
  if (!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    // Si tu utilises une case consentement required, on vérifie (sinon ignore)
    const consent = form.querySelector('input[type="checkbox"][required]');
    if (consent && !consent.checked) { consent.focus(); return; }

    let ok = form.querySelector('.form-ok');
    if (!ok) {
      ok = document.createElement('p');
      ok.className = 'form-ok';
      ok.style.marginTop = '10px';
      ok.style.color = '#0a7cbe';
      ok.style.fontWeight = '600';
      ok.textContent = 'Votre demande a été envoyée. Merci !';
      form.appendChild(ok);
    } else {
      ok.textContent = 'Votre demande a été envoyée. Merci !';
    }

    form.reset();
  });
})();
/* ----- Burger ----- */
(function(){
  const nav = document.querySelector('nav.menu');
  const burger = document.querySelector('.burger');
  const list = document.querySelector('#nav-list');
  if (!nav || !burger || !list) return;

  const toggle = () => {
    const open = nav.getAttribute('aria-expanded') === 'true';
    nav.setAttribute('aria-expanded', String(!open));
    burger.setAttribute('aria-expanded', String(!open));
  };
  burger.addEventListener('click', toggle);
  list.addEventListener('click', e=>{
    if (e.target.closest('a')) {
      nav.setAttribute('aria-expanded','false');
      burger.setAttribute('aria-expanded','false');
    }
  }, true);
})();

/* ----- Form ok ----- */
(function(){
  const form = document.getElementById('devisForm');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    let ok = form.querySelector('.form-ok');
    if (!ok) {
      ok = document.createElement('p');
      ok.className = 'form-ok';
      ok.style.marginTop = '10px';
      ok.style.color = '#0a7cbe';
      ok.style.fontWeight = '600';
      ok.textContent = 'Votre demande a été envoyée. Merci !';
      form.appendChild(ok);
    } else {
      ok.textContent = 'Votre demande a été envoyée. Merci !';
    }
    form.reset();
  });
})();
