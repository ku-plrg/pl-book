// Adds the PLRG logo (links to the homepage), a light/dark toggle, and a language
// switch (English <-> 한국어) to the top bar.
// The two books share file names, so the same page is opened in the other language.
(function () {
  var lang = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  var other = lang === 'ko' ? 'en' : 'ko';
  var path = location.pathname;
  var i = path.lastIndexOf('/' + lang + '/');
  if (i < 0) return;
  var target = path.slice(0, i) + '/' + other + '/' + path.slice(i + lang.length + 2);
  var a = document.createElement('a');
  a.href = target + location.hash;
  a.className = 'lang-switch';
  a.title = other === 'ko' ? '한국어로 보기' : 'Read in English';
  a.setAttribute('aria-label', a.title);
  a.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/>' +
    '<path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>' +
    '<span>' + (other === 'ko' ? '한국어' : 'English') + '</span>';
  var bar = document.querySelector('.right-buttons');
  if (bar) bar.prepend(a);

  // Light/dark toggle: starts from the OS preference (mdBook default) and uses
  // mdBook's own (hidden) theme buttons, so the choice is remembered.
  var dark = function () {
    var c = document.documentElement.classList;
    return c.contains('navy') || c.contains('coal') || c.contains('ayu');
  };
  var sun = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/>' +
    '<path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
  var moon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var t = document.createElement('button');
  t.type = 'button';
  t.className = 'theme-switch';
  var paint = function () {
    t.innerHTML = dark() ? sun : moon;
    t.title = dark() ? (lang === 'ko' ? '밝게 보기' : 'Light mode') : (lang === 'ko' ? '어둡게 보기' : 'Dark mode');
    t.setAttribute('aria-label', t.title);
  };
  t.addEventListener('click', function () {
    var b = document.getElementById('mdbook-theme-' + (dark() ? 'light' : 'navy'));
    if (b) b.click();
    paint();
  });
  paint();
  if (bar) bar.prepend(t);

  var left = document.querySelector('.left-buttons');
  if (left && typeof path_to_root !== 'undefined') {
    var logo = document.createElement('a');
    logo.href = 'https://plrg.korea.ac.kr/';
    logo.className = 'plrg-logo';
    logo.title = 'PLRG';
    logo.innerHTML = '<img src="' + path_to_root + 'logo.svg" alt="PLRG">';
    left.appendChild(logo);
  }
})();
