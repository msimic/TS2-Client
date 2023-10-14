'use strict';

const path = require("path");
const fs = require("fs");
var cp = require('child_process')

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, session, protocol } = require("electron");

// Check if Electron is running in development 
const isDev = require("electron-is-dev");
if (isDev){
  console.log("Running in development");
  // Refresh WebContents of all BrowserWindow
  // require('electron-reload')(__dirname);
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

const appPath = process.env.PORTABLE_EXECUTABLE_DIR || app.getPath("exe") || app.getAppPath();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { bypassCSP: true, supportFetchAPI: true, "corsEnabled": true } },
  { scheme: 'home', privileges: { bypassCSP: true, supportFetchAPI: true, "corsEnabled": true } },
  {
      scheme: "electron",
      privileges: {
          bypassCSP: true,
          supportFetchAPI: true,
          "corsEnabled": false
      }
  }
]);

function interceptLocal() {
  console.log("registering local protocol")
    protocol.registerBufferProtocol('electron', function(request, callback) {
        //work out file path
        var file = request.url.substring(11).split("?")[0];
        //console.log(file);
        file = path.join(__dirname, file);
        callback(fs.readFileSync(file))
    });
    protocol.registerFileProtocol('local', (request, callback) => {
    let url = request.url.substring(8)
    url = path.normalize(`${appPath}/${url}`)
    console.log("local url: " + url)
    mainWindow.setTitle("Load local: " + url)
    callback({ path: url })
  })
  protocol.interceptFileProtocol('local', function (request, callback) {
    let url = request.url.substring(8)
    url = path.normalize(`${appPath}/${url}`)
    console.log("intercept local url: " + url)
    mainWindow.setTitle("Load local: " + url)
    callback({ path:  url });   /* 'file:///' */
  });
  protocol.registerFileProtocol('home', (request, callback) => {
    let url = request.url.substring(7)
    url = path.normalize(`${app.getPath("home")}/${url}`)
    console.log("local url: " + url)
    callback({ path: url })
  })
  protocol.interceptFileProtocol('home', function (request, callback) {
    let url = request.url.substring(7)
    url = path.normalize(`${app.getPath("home")}/${url}`)
    console.log("intercept local url: " + url)
    callback({ path:  url });   /* 'file:///' */
  });
}

function createWindow() {
  /*session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    console.log("request " + details.url);
    if (details.url.indexOf("/!/") == -1) {
      return callback({
          requestHeaders: details.requestHeaders,
          url: details.url,
      })
    }

    details.url = details.url.substring(details.url.indexOf("/!/")+3);
    details.url  = "file:///" + path.join(app.getAppPath(), details.url);
    console.log("translated to  " + details.url);
    return callback({
        requestHeaders: details.requestHeaders,
        url: details.url,
    })
   })*/

  // Create the browser window.
  mainWindow = new BrowserWindow({
                    width: 1366,
                    height: 768,
                    icon: path.join(__dirname, 'src/icons/favicon-32x32.png'),
                    fullscreenable: true,
                    fullscreen: false,
                    show:false,
                    webPreferences: {
                      nodeIntegration: true,
                      contextIsolation: false,
                      enableRemoteModule: true, 
                      backgroundThrottling: false,
                      webSecurity: false ,
                      devTools: true
                    }
                   });

mainWindow.setMenuBarVisibility(false);

  // and load the index.html of the app.
  mainWindow.loadFile("dist/public/index.html");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
  mainWindow.webContents.setZoomFactor(1.0);
  
// Upper Limit is working of 500 %
mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
mainWindow.webContents.once('did-finish-load', () => {
  setTimeout(()=>mainWindow.webContents.send('set-text', '#electronZoom', "Zoom:"+(mainWindow.webContents.zoomFactor * 100).toFixed(0)+"%"),1000);
})
ipcMain.handle("setZoom", async (event, dir) => {
  var currentZoom = mainWindow.webContents.getZoomFactor();
  if (dir == "in" && currentZoom < 1.49999) {
    mainWindow.webContents.setZoomFactor(currentZoom+0.05);
  } else if (dir == "out" && currentZoom > 0.51) {
    mainWindow.webContents.setZoomFactor(currentZoom-0.05);
  }
  mainWindow.webContents.send('set-text', '#electronZoom', "Zoom:"+(mainWindow.webContents.zoomFactor * 100).toFixed(0)+"%");
});
mainWindow.webContents.on("zoom-changed", (event, zoomDirection) => {
  console.log(zoomDirection);
  var currentZoom = mainWindow.webContents.getZoomFactor();
  console.log("Current Zoom Factor - ", currentZoom);
  // console.log('Current Zoom Level at - '
  // , win.webContents.getZoomLevel());
  console.log("Current Zoom Level at - ", mainWindow.webContents.zoomLevel);

  if (zoomDirection === "in" && currentZoom < 1.4999999) {
      
      // win.webContents.setZoomFactor(currentZoom + 0.20);
      mainWindow.webContents.zoomFactor = currentZoom + 0.05;

      console.log("Zoom Factor Increased to - "
                  , mainWindow.webContents.zoomFactor * 100, "%");
    
  }
  if (zoomDirection === "out" && currentZoom > 0.51) {
      
      // win.webContents.setZoomFactor(currentZoom - 0.20);
      mainWindow.webContents.zoomFactor = currentZoom - 0.05;

      console.log("Zoom Factor Decreased to - "
                  , mainWindow.webContents.zoomFactor * 100, "%");
  }
  mainWindow.webContents.send('set-text', '#electronZoom', "Zoom:"+(mainWindow.webContents.zoomFactor * 100).toFixed(0)+"%");

});
  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    if (proxy && !proxy.exitCode && !proxy.killed) {
      proxy.kill();
      proxy = null;
    }
    app.exit()
  });
  mainWindow.on('close', function(e) { 
    e.preventDefault();
    mainWindow.destroy();
  });
  mainWindow.maximize()
  mainWindow.show()
}

let proxy = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();
  interceptLocal();
  proxy = cp.fork(require.resolve('./dist/public/telnet_proxy.js'), [
    "--serverHost","localhost",
    "--serverPort","4040", 
    "--fixedTelnetHost","mud.temporasanguinis.it,localhost"
  ])
  if (!proxy || proxy.exitCode) {
    console.log("Proxy failed");
  }
});

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  //if (process.platform !== "darwin") {
    if (proxy && !proxy.exitCode && !proxy.killed) {
      proxy.kill();
      proxy = null;
    }
    app.quit();
  //}
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
