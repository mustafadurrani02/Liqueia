import {
  app,
  BrowserWindow,
  WebContentsView,
  nativeTheme,
  session,
  shell,
  type DownloadItem as ElectronDownloadItem
} from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  type BrowserSettings,
  type BrowserSnapshot,
  type ClearDataOptions,
  type DownloadItem,
  type InternalPage,
  type TabState
} from '../shared/types'
import { INTERNAL_PAGES, resolveNavigationInput } from './navigation'
import { BrowserStore } from './store'

interface BrowserTab {
  state: TabState
  view: WebContentsView
}

export class BrowserController {
  private readonly tabs = new Map<string, BrowserTab>()
  private readonly store = new BrowserStore()
  private readonly closedTabs: Array<Pick<TabState, 'title' | 'url'>> = []
  private readonly browserSession: Electron.Session
  private activeTabId: string | null = null
  private chromeOverlayVisible = false
  private focusMode = false
  private downloadItems = new Map<string, ElectronDownloadItem>()
  private snapshotTimer: NodeJS.Timeout | null = null

  constructor(
    private readonly window: BrowserWindow,
    private readonly privateMode = false
  ) {
    this.browserSession = privateMode
      ? session.fromPartition(`liqueia-private-${randomUUID()}`)
      : session.defaultSession
    this.configureSession()
    this.window.on('resize', () => this.layoutViews())
    this.window.on('maximize', () => this.layoutViews())
    this.window.on('unmaximize', () => this.layoutViews())
    nativeTheme.on('updated', () => this.emitSnapshot())
  }

  async initialize(): Promise<void> {
    await this.createTab('liqueia://newtab')
  }

  snapshot(): BrowserSnapshot {
    return {
      tabs: [...this.tabs.values()].map(({ state }) => ({ ...state })),
      activeTabId: this.activeTabId,
      bookmarks: this.store.bookmarks,
      history: this.store.history,
      downloads: this.store.downloads,
      settings: this.store.settings
    }
  }

  async createTab(url = 'liqueia://newtab'): Promise<string> {
    const id = randomUUID()
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: true,
        session: this.browserSession,
        backgroundThrottling: true
      }
    })
    const tab: BrowserTab = {
      view,
      state: {
        id,
        title: 'New Tab',
        url: 'liqueia://newtab',
        loading: false,
        canGoBack: false,
        canGoForward: false,
        crashed: false,
        zoomFactor: 1
      }
    }

    this.tabs.set(id, tab)
    this.window.contentView.addChildView(view)
    this.bindTabEvents(tab)
    await this.activateTab(id)
    await this.navigate(id, url)
    return id
  }

  async closeTab(id: string): Promise<void> {
    const tab = this.tabs.get(id)
    if (!tab) return

    const ids = [...this.tabs.keys()]
    const index = ids.indexOf(id)
    this.closedTabs.unshift({ title: tab.state.title, url: tab.state.url })
    this.closedTabs.splice(12)
    this.window.contentView.removeChildView(tab.view)
    tab.view.webContents.close()
    this.tabs.delete(id)

    if (this.tabs.size === 0) {
      await this.createTab()
      return
    }

    if (this.activeTabId === id) {
      await this.activateTab(ids[index + 1] ?? ids[index - 1])
    }
    this.emitSnapshot()
  }

  async activateTab(id: string): Promise<void> {
    const tab = this.tabs.get(id)
    if (!tab) return
    this.activeTabId = id
    for (const [tabId, candidate] of this.tabs) {
      candidate.view.setVisible(
        tabId === id && !this.isInternal(candidate.state.url) && !this.chromeOverlayVisible
      )
    }
    this.window.contentView.addChildView(tab.view)
    this.layoutViews()
    tab.view.webContents.focus()
    this.emitSnapshot()
  }

  async duplicateTab(id: string): Promise<string> {
    const tab = this.tabs.get(id)
    return this.createTab(tab?.state.url ?? 'liqueia://newtab')
  }

  async reopenClosedTab(): Promise<string | null> {
    const tab = this.closedTabs.shift()
    return tab ? this.createTab(tab.url) : null
  }

  async navigate(id: string, input: string): Promise<void> {
    const tab = this.tabs.get(id)
    if (!tab) return
    const target = this.resolveInput(input)

    if (this.isInternal(target)) {
      tab.view.setVisible(false)
      tab.state = {
        ...tab.state,
        title: this.internalTitle(target),
        url: target,
        loading: false,
        favicon: undefined,
        crashed: false
      }
      this.emitSnapshot()
      return
    }

    tab.state.crashed = false
    tab.view.setVisible(id === this.activeTabId && !this.chromeOverlayVisible)
    try {
      await tab.view.webContents.loadURL(target)
    } catch {
      if (!tab.view.webContents.isDestroyed()) {
        tab.state.loading = false
        tab.state.crashed = true
        tab.state.url = target
        tab.state.title = 'Unable to load page'
        this.emitSnapshot()
      }
    }
  }

  async goBack(id: string): Promise<void> {
    const tab = this.tabs.get(id)
    if (tab?.view.webContents.navigationHistory.canGoBack()) {
      tab.view.webContents.navigationHistory.goBack()
    }
  }

  async goForward(id: string): Promise<void> {
    const tab = this.tabs.get(id)
    if (tab?.view.webContents.navigationHistory.canGoForward()) {
      tab.view.webContents.navigationHistory.goForward()
    }
  }

  async reload(id: string): Promise<void> {
    const tab = this.tabs.get(id)
    if (!tab) return
    if (this.isInternal(tab.state.url) || tab.state.crashed) {
      await this.navigate(id, tab.state.url)
    } else {
      tab.view.webContents.reload()
    }
  }

  stop(id: string): void {
    this.tabs.get(id)?.view.webContents.stop()
  }

  async goHome(id: string): Promise<void> {
    await this.navigate(id, this.store.settings.homepage)
  }

  async openInternalPage(page: InternalPage): Promise<void> {
    if (this.activeTabId) await this.navigate(this.activeTabId, `liqueia://${page}`)
  }

  async setZoom(id: string, zoomFactor: number): Promise<void> {
    const tab = this.tabs.get(id)
    if (!tab || this.isInternal(tab.state.url)) return
    const clamped = Math.min(3, Math.max(0.25, zoomFactor))
    tab.view.webContents.setZoomFactor(clamped)
    tab.state.zoomFactor = clamped
    this.emitSnapshot()
  }

  async resetZoom(id: string): Promise<void> {
    await this.setZoom(id, 1)
  }

  printTab(id: string): void {
    const tab = this.tabs.get(id)
    if (!tab || this.isInternal(tab.state.url)) {
      this.window.webContents.print({ printBackground: true })
      return
    }
    tab.view.webContents.print({ printBackground: true })
  }

  async captureTab(id: string): Promise<string | null> {
    const tab = this.tabs.get(id)
    const image = tab && !this.isInternal(tab.state.url)
      ? await tab.view.webContents.capturePage()
      : await this.window.webContents.capturePage()
    const filePath = join(app.getPath('pictures'), `Liqueia-${Date.now()}.png`)
    await writeFile(filePath, image.toPNG())
    shell.showItemInFolder(filePath)
    return filePath
  }

  toggleFullscreen(): void {
    this.window.setFullScreen(!this.window.isFullScreen())
  }

  toggleBookmark(id: string): void {
    const tab = this.tabs.get(id)
    if (!tab || this.isInternal(tab.state.url)) return
    const bookmarks = this.store.bookmarks
    const existing = bookmarks.find((item) => item.url === tab.state.url)
    this.store.bookmarks = existing
      ? bookmarks.filter((item) => item.id !== existing.id)
      : [
          {
            id: randomUUID(),
            title: tab.state.title,
            url: tab.state.url,
            createdAt: Date.now()
          },
          ...bookmarks
        ]
    this.emitSnapshot()
  }

  removeBookmark(id: string): void {
    this.store.bookmarks = this.store.bookmarks.filter((item) => item.id !== id)
    this.emitSnapshot()
  }

  updateSettings(patch: Partial<BrowserSettings>): void {
    const settings = this.store.updateSettings(patch)
    nativeTheme.themeSource = settings.themeMode
    this.configurePrivacy(settings)
    this.layoutViews()
    this.emitSnapshot()
  }

  async clearBrowsingData(options: ClearDataOptions): Promise<void> {
    if (options.history) this.store.clearHistory()
    if (options.downloads) this.store.downloads = []
    if (options.cache) await this.browserSession.clearCache()
    if (options.cookies) {
      await this.browserSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage']
      })
    }
    this.emitSnapshot()
  }

  showDownload(id: string): void {
    const download = this.store.downloads.find((item) => item.id === id)
    if (download?.path && existsSync(download.path)) shell.showItemInFolder(download.path)
  }

  setChromeOverlay(visible: boolean): void {
    this.chromeOverlayVisible = visible
    const activeTab = this.activeTabId ? this.tabs.get(this.activeTabId) : undefined
    activeTab?.view.setVisible(!visible && !this.isInternal(activeTab.state.url))
  }

  setFocusMode(enabled: boolean): void {
    this.focusMode = enabled
    this.layoutViews()
  }

  showFind(): void {
    this.window.webContents.send('browser:find')
  }

  private bindTabEvents(tab: BrowserTab): void {
    const { webContents } = tab.view
    const syncNavigation = (): void => {
      tab.state.url = webContents.getURL() || tab.state.url
      tab.state.title = webContents.getTitle() || tab.state.title
      tab.state.canGoBack = webContents.navigationHistory.canGoBack()
      tab.state.canGoForward = webContents.navigationHistory.canGoForward()
      this.emitSnapshot()
    }

    webContents.on('did-start-loading', () => {
      tab.state.loading = true
      this.emitSnapshot()
    })
    webContents.on('did-stop-loading', () => {
      tab.state.loading = false
      syncNavigation()
    })
    webContents.on('page-title-updated', (event, title) => {
      event.preventDefault()
      tab.state.title = title
      this.emitSnapshot()
    })
    webContents.on('page-favicon-updated', (_event, favicons) => {
      tab.state.favicon = favicons[0]
      this.emitSnapshot()
    })
    webContents.on('did-navigate', () => {
      syncNavigation()
      if (!this.privateMode && !this.isInternal(tab.state.url)) {
        this.store.addHistory({
          id: randomUUID(),
          title: tab.state.title,
          url: tab.state.url,
          visitedAt: Date.now()
        })
      }
    })
    webContents.on('did-navigate-in-page', syncNavigation)
    webContents.on('render-process-gone', (_event, details) => {
      if (details.reason === 'clean-exit') return
      tab.state.loading = false
      tab.state.crashed = true
      tab.state.title = 'Tab crashed'
      this.emitSnapshot()
    })
    webContents.setWindowOpenHandler(({ url }) => {
      void this.createTab(url)
      return { action: 'deny' }
    })
  }

  private configureSession(): void {
    this.configurePrivacy(this.store.settings)
    this.browserSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(['fullscreen', 'clipboard-sanitized-write'].includes(permission))
    })
    this.browserSession.on('will-download', (_event, item) => {
      const id = randomUUID()
      this.downloadItems.set(id, item)
      const record: DownloadItem = {
        id,
        filename: item.getFilename(),
        url: item.getURL(),
        receivedBytes: 0,
        totalBytes: item.getTotalBytes(),
        state: 'progressing',
        startedAt: Date.now()
      }
      this.upsertDownload(record)
      item.on('updated', (_downloadEvent, state) => {
        record.receivedBytes = item.getReceivedBytes()
        record.totalBytes = item.getTotalBytes()
        record.state = state === 'interrupted' ? 'interrupted' : 'progressing'
        this.upsertDownload(record)
      })
      item.once('done', (_downloadEvent, state) => {
        record.receivedBytes = item.getReceivedBytes()
        record.path = item.getSavePath()
        record.state = state
        this.downloadItems.delete(id)
        this.upsertDownload(record)
      })
    })
  }

  private configurePrivacy(settings = this.store.settings): void {
    this.browserSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders }
      if (settings.sendDoNotTrack) headers.DNT = '1'
      callback({ requestHeaders: headers })
    })
  }

  private upsertDownload(download: DownloadItem): void {
    const downloads = this.store.downloads
    const index = downloads.findIndex((item) => item.id === download.id)
    if (index >= 0) downloads[index] = { ...download }
    else downloads.unshift({ ...download })
    this.store.downloads = downloads
    this.emitSnapshot()
  }

  private resolveInput(input: string): string {
    return resolveNavigationInput(input, this.store.settings.searchEngine)
  }

  private layoutViews(): void {
    const { width, height } = this.window.getContentBounds()
    const sidebar = this.store.settings.tabLayout === 'sidebar'
    const bounds = this.focusMode
      ? { x: 12, y: 70, width: Math.max(width - 24, 100), height: Math.max(height - 82, 100) }
      : sidebar
        ? {
            x: 238,
            y: 78,
            width: Math.max(width - 250, 100),
            height: Math.max(height - 90, 100)
          }
        : {
            x: 12,
            y: 132,
            width: Math.max(width - 24, 100),
            height: Math.max(height - 144, 100)
          }

    for (const tab of this.tabs.values()) {
      tab.view.setBounds(bounds)
      tab.view.setBorderRadius(18)
    }
  }

  private emitSnapshot(): void {
    if (this.snapshotTimer) return
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null
      if (!this.window.isDestroyed()) {
        this.window.webContents.send('browser:snapshot', this.snapshot())
      }
    }, 16)
  }

  private isInternal(url: string): boolean {
    return INTERNAL_PAGES.has(url)
  }

  private internalTitle(url: string): string {
    const page = url.replace('liqueia://', '')
    return page === 'newtab' ? 'New Tab' : `${page[0].toUpperCase()}${page.slice(1)}`
  }
}
