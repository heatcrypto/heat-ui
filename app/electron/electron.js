/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */

const electron = require('electron')
const path = require("path")
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const spawn = require('child_process').spawn;
const fs = require('fs');
const APP_DIR = path.join(__dirname,'..')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon:`${APP_DIR}/electron/icon.png`,
    webPreferences: {
      contextIsolation: false, //it is needed to allow access to require() but is not recommended for security
      nodeIntegration: true
    }
  })

  let splash = new BrowserWindow({
        width: 500,
        height: 340,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
  })

  splash.loadURL(`file://${APP_DIR}/splash-electron.html`).then(() => {
    splash.center()
    mainWindow.loadURL(`file://${APP_DIR}/index.html`).then(() => {
      mainWindow.center()
      mainWindow.show()
    })
  }).catch(error => {
    console.error('Error loading splash window:', error);
  })

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.once("show", () => {
    setTimeout(() => splash.destroy(), 2000)
  })

  electron.ipcMain.on('userData-is-where-request', (event, arg) => {
    let userDataDir = app.getPath('userData')
    event.sender.send('userData-is-here-reply', userDataDir)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    // inject the context menu logic
    fs.readFile(path.join(__dirname, 'run-in-renderer.js'), 'utf8', function(err, contents) {
      if (err) {
        console.log(err)
      } else {
        mainWindow.webContents.executeJavaScript(contents)
      }
    })
  })

  //mainWindow.webContents.openDevTools();
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

let run = function(args, done) {
  let updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  spawn(updateExe, args, {
    detached: true
  }).on('close', done)
}

let check = function() {
  if (process.platform === 'win32') {
    let cmd = process.argv[1];
    let target = path.basename(process.execPath);
    if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
      run(['--createShortcut=' + target + ''], app.quit);
      return true;
    }
    if (cmd === '--squirrel-uninstall') {
      run(['--removeShortcut=' + target + ''], app.quit);
      return true;
    }
    if (cmd === '--squirrel-obsolete') {
      app.quit();
      return true;
    }
  }
  return false;
};

module.exports = check();
