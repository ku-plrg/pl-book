// Adds a language switch button (English <-> 한국어) to the top bar.
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
  a.textContent = other === 'ko' ? '한국어' : 'English';
  a.title = other === 'ko' ? '한국어로 보기' : 'Read in English';
  a.className = 'lang-switch';
  a.style.cssText = 'font-size:1.4rem;font-weight:600;margin:0 0.6em;text-decoration:none;color:var(--icons);';
  var bar = document.querySelector('.right-buttons');
  if (bar) bar.prepend(a);
})();
