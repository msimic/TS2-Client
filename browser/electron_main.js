'use strict';

const path = require("path");

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require("electron");

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

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
                    width: 1366,
                    height: 768,
                    icon: path.join(__dirname, 'src/icons/favicon-32x32.png'),
                    fullscreenable: true,
                    fullscreen: false,
                    webPreferences: {
                      nodeIntegration: true,
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
  });
  mainWindow.on('close', function(e) { 
    e.preventDefault();
    mainWindow.destroy();
});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
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
