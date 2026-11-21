// Loads MathJax 3 (instead of mdBook's built-in MathJax 2) with the bussproofs
// extension for inference rules. mdBook passes \( \) and \[ \] through as is.
window.MathJax = {
  loader: { load: ['[tex]/bussproofs'] },
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
    packages: { '[+]': ['bussproofs'] },
  },
  chtml: { scale: 1.05 },
};
(function () {
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-chtml.js';
  s.async = true;
  document.head.appendChild(s);
})();
