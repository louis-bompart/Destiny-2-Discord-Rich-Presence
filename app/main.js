'use strict';

/* eslint-disable no-console */

const { app, BrowserWindow, Menu, shell } = require('electron');
const defaultMenu = require('electron-default-menu');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 460,
    "min-width": 520,
    resizable: true,
    titleBarStyle: 'hidden',
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(defaultMenu(app, shell)));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
