import { BrowserWindow, Menu, app, ipcMain, nativeImage, nativeTheme } from 'electron'
import { join } from 'node:path'
import { BrowserController } from './browser'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let controller: BrowserController | null = null

function createWindow(options: { privateMode?: boolean } = {}): void {
  const iconPath = join(__dirname, '../renderer/liqueia-planet.png')
  const icon = nativeImage.createFromPath(iconPath)
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: options.privateMode ? 'Liqueia Private' : 'Liqueia',
    icon,
    backgroundColor: '#0b0c11',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 18 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  if (process.platform === 'darwin' && app.dock && !icon.isEmpty()) {
    app.dock.setIcon(icon)
  }

  controller = new BrowserController(mainWindow, Boolean(options.privateMode))
  registerIpc(controller)
  installMenu(controller)

  const emitWindowState = (): void => {
    mainWindow?.webContents.send('browser:window-state', {
      isFullScreen: Boolean(mainWindow?.isFullScreen())
    })
  }

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`Liqueia preload failed at ${preloadPath}:`, error)
  })

  const rendererReady = process.env.ELECTRON_RENDERER_URL
    ? mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    : mainWindow.loadFile(join(__dirname, '../renderer/index.html'))

  void rendererReady.catch((error: unknown) => {
    console.error('Failed to load the Liqueia renderer:', error)
  })

  mainWindow.webContents.once('did-finish-load', () => {
    void controller?.initialize()
    emitWindowState()
  })
  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame) {
        console.error('Liqueia renderer failed to load', {
          errorCode,
          errorDescription,
          validatedURL
        })
      }
    }
  )
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Liqueia browser chrome renderer exited', details)
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    controller = null
  })
  mainWindow.on('enter-full-screen', emitWindowState)
  mainWindow.on('leave-full-screen', emitWindowState)
}

function installMenu(browser: BrowserController): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Liqueia',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => void browser.openInternalPage('settings')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => void browser.createTab()
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            const id = browser.snapshot().activeTabId
            if (id) void browser.closeTab(id)
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => browser.showFind()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'History',
      submenu: [
        {
          label: 'Show History',
          accelerator: 'CmdOrCtrl+Y',
          click: () => void browser.openInternalPage('history')
        },
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            const id = browser.snapshot().activeTabId
            if (id) void browser.goBack(id)
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            const id = browser.snapshot().activeTabId
            if (id) void browser.goForward(id)
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'system'
  ipcMain.removeHandler('browser:new-window')
  ipcMain.handle('browser:new-window', (_event, privateMode = false) => {
    createWindow({ privateMode: Boolean(privateMode) })
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault())
})
