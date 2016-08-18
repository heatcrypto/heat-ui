angular.element(document).ready(function() {
  function Menu(cutLabel, copyLabel, pasteLabel) {
    var gui = require('nw.gui')
      , menu = new gui.Menu()

      , cut = new gui.MenuItem({
        label: cutLabel || "Cut"
        , click: function() {
          document.execCommand("cut");
          console.log('Menu:', 'cutted to clipboard');
        }
      })

      , copy = new gui.MenuItem({
        label: copyLabel || "Copy"
        , click: function() {
          document.execCommand("copy");
          console.log('Menu:', 'copied to clipboard');
        }
      })

      , paste = new gui.MenuItem({
        label: pasteLabel || "Paste"
        , click: function() {
          document.execCommand("paste");
          console.log('Menu:', 'pasted to textarea');
        }
      })
    ;

    menu.append(cut);
    menu.append(copy);
    menu.append(paste);

    return menu;
  }

  function isDisabled(parent) {
    while (parent && parent.parentNode !== null) {
      if (parent.hasAttribute('disable-nw-menu')) {
        return true;
      }
      parent = parent.parentNode;
    }
    return false;
  }

  function installMinimizeToTray() {
    var gui = require('nw.gui');
    var win = gui.Window.get();
    var tray;

    win.on('minimize', function() {
      this.hide();
      tray = new gui.Tray({ icon: 'images/fim_coin.png' });
      tray.on('click', function() {
        win.show();
        this.remove();
        tray = null;
      });
    });
  }

  try {
    if (isNodeJS) {
      var menu = new Menu(/* pass cut, copy, paste labels if you need i18n*/);
      $(document).on("contextmenu", function(e) {
        if (!isDisabled(e.target)) {
          e.preventDefault();
          menu.popup(e.originalEvent.x, e.originalEvent.y);
        }
      });
      /*if (navigator.appVersion.indexOf("Win")!=-1) {
        installMinimizeToTray();
      }*/
    }
  } catch (e) {
    console.log('nodewebkit-specific', e);
  }
});