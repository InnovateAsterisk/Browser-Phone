const {app, BrowserWindow, protocol} = require('electron')
const url = require('url')
const path = require('path')

let win

if(require('electron-squirrel-startup')) return;

// SSL/TSL: this is the self signed certificate support
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
   // On certificate error we disable default behaviour (stop loading the page)
   // and we then say "it is all fine - true" to the callback
   event.preventDefault();
   callback(true);
});

protocol.registerSchemesAsPrivileged([
   { scheme: 'foo', privileges: { secure: true } }
 ])
 
function createWindow() {
   win = new BrowserWindow({width: 800, height: 600})
   win.loadURL(url.format ({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
   }))
}

app.on('ready', createWindow)
