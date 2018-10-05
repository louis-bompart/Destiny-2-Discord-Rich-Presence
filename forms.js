'use strict';

document.getElementsByTagName('input')[0].onchange = function(){ flexbox(this, 'pc'); }
document.getElementsByTagName('input')[1].onchange = function(){ flexbox(this, 'playstation'); }
document.getElementsByTagName('input')[2].onchange = function(){ flexbox(this, 'xbox'); }

function flexbox(input, platform) {
  let flexbox = document.getElementsByClassName('flexbox')[0];
  if (input.checked) {
    flexbox.classList.remove('hidden','xbox_style', 'playstation_style', 'pc_style');
    flexbox.classList.add(`${platform}_style`);
    document.getElementsByName('gtag')[0].focus();
  }
  else { flexbox.classList.add('hidden'); }
}
