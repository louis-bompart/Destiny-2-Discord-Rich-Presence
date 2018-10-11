'use strict';

let givenKey = localStorage.getItem('apiKey');

if (givenKey == null) {
  document.getElementsByName('no-api-key')[0].classList.remove('hidden');
}

function hidePopUp() {
  document.getElementsByName('no-api-key')[0].classList.remove('hidden');
  localStorage.setItem('apiKey', document.getElementsByName('api-key')[0].value);
}

document.getElementsByName('platform')[0].onchange = function () { flexbox(this, 'pc'); }
document.getElementsByName('platform')[1].onchange = function () { flexbox(this, 'playstation'); }
document.getElementsByName('platform')[2].onchange = function () { flexbox(this, 'xbox'); }

function flexbox(input, platform) {
  let flexbox = document.getElementsByName('gtag-input')[0];
  if (input.checked) {
    flexbox.classList.remove('hidden', 'xbox_style', 'playstation_style', 'pc_style');
    flexbox.classList.add(`${platform}_style`);
    document.getElementsByName('gtag')[0].focus();
  }
  else { flexbox.classList.add('hidden'); }
}
