export type ThemeMode = 'light' | 'dark' | 'system'
export type TabLayout = 'topbar' | 'sidebar'
export type TabStyle = 'compact' | 'comfortable' | 'spacious'
export type SearchEngine = 'google' | 'duckduckgo' | 'bing' | 'brave'
export type ThemePreset = 'obsidian' | 'champagne' | 'aurora' | 'midnight' | 'pearl' | 'rose'
export type GlassIntensity = 'soft' | 'balanced' | 'vivid'

export interface BrowserSettings {
  themeMode: ThemeMode
  accentColor: string
  newTabBackground: string
  searchEngine: SearchEngine
  homepage: string
  tabLayout: TabLayout
  tabStyle: TabStyle
  themePreset: ThemePreset
  glassIntensity: GlassIntensity
  showBookmarksBar: boolean
  sendDoNotTrack: boolean
  blockThirdPartyCookies: boolean
  blockPopups: boolean
}

export interface TabState {
  id: string
  title: string
  url: string
  favicon?: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  crashed: boolean
  zoomFactor: number
}

export interface Bookmark {
  id: string
  title: string
  url: string
  createdAt: number
}

export interface HistoryEntry {
  id: string
  title: string
  url: string
  visitedAt: number
}

export interface DownloadItem {
  id: string
  filename: string
  url: string
  path?: string
  receivedBytes: number
  totalBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  startedAt: number
}

export interface BrowserSnapshot {
  tabs: TabState[]
  activeTabId: string | null
  bookmarks: Bookmark[]
  history: HistoryEntry[]
  downloads: DownloadItem[]
  settings: BrowserSettings
}

export type InternalPage =
  | 'newtab'
  | 'settings'
  | 'history'
  | 'bookmarks'
  | 'downloads'
  | 'extensions'
  | 'passwords'

export interface ClearDataOptions {
  history: boolean
  cache: boolean
  cookies: boolean
  downloads: boolean
}

export interface BrowserAPI {
  getSnapshot: () => Promise<BrowserSnapshot>
  createTab: (url?: string) => Promise<string>
  closeTab: (tabId: string) => Promise<void>
  activateTab: (tabId: string) => Promise<void>
  duplicateTab: (tabId: string) => Promise<string>
  reopenClosedTab: () => Promise<string | null>
  navigate: (tabId: string, input: string) => Promise<void>
  goBack: (tabId: string) => Promise<void>
  goForward: (tabId: string) => Promise<void>
  reload: (tabId: string) => Promise<void>
  stop: (tabId: string) => Promise<void>
  goHome: (tabId: string) => Promise<void>
  openInternalPage: (page: InternalPage) => Promise<void>
  newWindow: (privateMode?: boolean) => Promise<void>
  toggleBookmark: (tabId: string) => Promise<void>
  removeBookmark: (bookmarkId: string) => Promise<void>
  setZoom: (tabId: string, zoomFactor: number) => Promise<void>
  resetZoom: (tabId: string) => Promise<void>
  printTab: (tabId: string) => Promise<void>
  captureTab: (tabId: string) => Promise<string | null>
  toggleFullscreen: () => Promise<void>
  updateSettings: (settings: Partial<BrowserSettings>) => Promise<void>
  clearBrowsingData: (options: ClearDataOptions) => Promise<void>
  showDownload: (downloadId: string) => Promise<void>
  setChromeOverlay: (visible: boolean) => Promise<void>
  setFocusMode: (enabled: boolean) => Promise<void>
  openExternal: (url: string) => Promise<void>
  onSnapshot: (callback: (snapshot: BrowserSnapshot) => void) => () => void
  onFind: (callback: () => void) => () => void
  onWindowState: (callback: (state: { isFullScreen: boolean }) => void) => () => void
}

export const DEFAULT_SETTINGS: BrowserSettings = {
  themeMode: 'system',
  accentColor: '#d8aa58',
  newTabBackground: 'aurora',
  searchEngine: 'google',
  homepage: 'liqueia://newtab',
  tabLayout: 'topbar',
  tabStyle: 'comfortable',
  themePreset: 'obsidian',
  glassIntensity: 'balanced',
  showBookmarksBar: true,
  sendDoNotTrack: true,
  blockThirdPartyCookies: true,
  blockPopups: true
}
