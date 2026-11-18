// The judge's page: shows the code the link carries in ?c=, if it is one, and copies it. Without this script the page
// is the instructions alone. The code is only ever written as text, never as markup.
(function () {
  "use strict";

  var box = document.getElementById("judge-code");
  var invalid = document.querySelector(".judge-invalid");
  if (!box || !invalid) return;

  var alphabet = box.getAttribute("data-alphabet");
  var length = +box.getAttribute("data-length");
  var raw = new URLSearchParams(window.location.search).get("c");
  var typed = (raw || "").trim();
  var code = typed.toUpperCase();
  // ASCII only: upper-casing turns some other letters into two of ours («ß» into «SS») or into one («ſ» into «S»).
  var valid = /^[\x21-\x7e]*$/.test(typed) && code.length === length && code.split("").every(function (ch) { return alphabet.indexOf(ch) >= 0; });
  if (!valid) {
    invalid.hidden = false;
    return;
  }

  var shown = box.querySelector(".judge-code");
  shown.textContent = code;
  box.hidden = false;

  // The other language's page gets the same code, so switching does not lose it.
  var other = document.querySelector("a.lang-switch");
  if (other) other.setAttribute("href", other.getAttribute("href").split("?")[0] + "?c=" + code);

  var copy = box.querySelector("button.judge-copy");
  var label = copy.textContent;
  copy.hidden = false;
  copy.addEventListener("click", function () {
    function done() {
      copy.textContent = copy.getAttribute("data-done");
      setTimeout(function () { copy.textContent = label; }, 2000);
    }
    // Clipboard writes need a secure page; from disk or an old browser, the code is selected for the visitor to copy.
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done, select);
    } else {
      select();
    }
    function select() {
      var range = document.createRange();
      range.selectNodeContents(shown);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      if (document.execCommand && document.execCommand("copy")) done();
    }
  });
})();
