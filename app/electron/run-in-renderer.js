const inputMenu = require('electron-input-menu');
const context = require('electron-contextmenu-middleware');
inputMenu.registerShortcuts();
context.use(inputMenu);
context.activate();