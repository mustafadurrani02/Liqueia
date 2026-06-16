import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Command,
  Copy,
  Download,
  ExternalLink,
  Focus,
  Globe2,
  Grid2X2,
  Home,
  KeyRound,
  LoaderCircle,
  Maximize2,
  MoreHorizontal,
  Palette,
  PanelTop,
  Plus,
  Printer,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Waves,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  type BrowserSettings,
  type BrowserSnapshot,
  type InternalPage,
  type TabState
} from '../../shared/types'

const EMPTY_SNAPSHOT: BrowserSnapshot = {
  tabs: [],
  activeTabId: null,
  bookmarks: [],
  history: [],
  downloads: [],
  settings: DEFAULT_SETTINGS
}

const internalPages: Record<string, InternalPage> = {
  'liqueia://settings': 'settings',
  'liqueia://history': 'history',
  'liqueia://bookmarks': 'bookmarks',
  'liqueia://downloads': 'downloads',
  'liqueia://extensions': 'extensions',
  'liqueia://passwords': 'passwords',
  'liqueia://newtab': 'newtab'
}

export function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT)
  const [address, setAddress] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [overlay, setOverlay] = useState<'command' | 'tabs' | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const addressRef = useRef<HTMLInputElement>(null)
  const activeTab = snapshot.tabs.find((tab) => tab.id === snapshot.activeTabId)
  const isSidebar = snapshot.settings.tabLayout === 'sidebar'
  const isMacOS = navigator.userAgent.includes('Mac')

  useEffect(() => {
    void window.liqueia.getSnapshot().then(setSnapshot)
    return window.liqueia.onSnapshot(setSnapshot)
  }, [])

  useEffect(() => {
    // Navigation is external state; mirror it unless the tab is an internal page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddress(activeTab?.url.startsWith('liqueia://') ? '' : (activeTab?.url ?? ''))
  }, [activeTab?.id, activeTab?.url])

  useEffect(() => {
    const offFind = window.liqueia.onFind(() => addressRef.current?.select())
    const offWindowState = window.liqueia.onWindowState((state) => setIsFullScreen(state.isFullScreen))
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        addressRef.current?.select()
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        if (activeTab) void window.liqueia.toggleBookmark(activeTab.id)
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOverlay('command')
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault()
        void window.liqueia.reopenClosedTab()
      }
      if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
        event.preventDefault()
        setOverlay('tabs')
      }
      if (event.key === 'Escape') {
        setOverlay(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      offFind()
      offWindowState()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeTab])

  useEffect(() => {
    document.documentElement.dataset.theme = snapshot.settings.themeMode
    document.documentElement.dataset.preset = snapshot.settings.themePreset
    document.documentElement.style.setProperty('--accent', snapshot.settings.accentColor)
  }, [snapshot.settings])

  useEffect(() => {
    void window.liqueia.setChromeOverlay(Boolean(overlay))
    return () => {
      void window.liqueia.setChromeOverlay(false)
    }
  }, [overlay])

  useEffect(() => {
    void window.liqueia.setFocusMode(focusMode)
  }, [focusMode])

  const trackLight = (event: React.PointerEvent<HTMLElement>): void => {
    const x = (event.clientX / window.innerWidth) * 100
    const y = (event.clientY / window.innerHeight) * 100
    event.currentTarget.style.setProperty('--pointer-x', `${x}%`)
    event.currentTarget.style.setProperty('--pointer-y', `${y}%`)
  }

  const navigate = (event: FormEvent): void => {
    event.preventDefault()
    if (activeTab) void window.liqueia.navigate(activeTab.id, address)
    addressRef.current?.blur()
  }

  const isBookmarked = Boolean(
    activeTab && snapshot.bookmarks.some((bookmark) => bookmark.url === activeTab.url)
  )

  return (
    <main
      className={`app-shell ${isSidebar ? 'sidebar-layout' : 'topbar-layout'} ${focusMode ? 'focus-mode' : ''} ${isMacOS ? 'is-macos' : ''} ${isFullScreen ? 'is-fullscreen' : ''} glass-${snapshot.settings.glassIntensity} density-${snapshot.settings.tabStyle}`}
      onPointerMove={trackLight}
    >
      <div className="liquid-field" />
      <div className="liquid-ribbon ribbon-one" />
      <div className="liquid-ribbon ribbon-two" />
      <div className="glass-grain" />
      {!focusMode && (isSidebar ? (
        <SidebarTabs snapshot={snapshot} />
      ) : (
        <TopTabs snapshot={snapshot} onOverview={() => setOverlay('tabs')} />
      ))}

      <header className="navigation liquid-glass">
        <div className="glass-reflection" />
        <div className="nav-controls">
          <IconButton
            label="Back"
            disabled={!activeTab?.canGoBack}
            onClick={() => activeTab && void window.liqueia.goBack(activeTab.id)}
          >
            <ArrowLeft />
          </IconButton>
          <IconButton
            label="Forward"
            disabled={!activeTab?.canGoForward}
            onClick={() => activeTab && void window.liqueia.goForward(activeTab.id)}
          >
            <ArrowRight />
          </IconButton>
          <IconButton
            label={activeTab?.loading ? 'Stop loading' : 'Refresh'}
            onClick={() =>
              activeTab &&
              void (activeTab.loading
                ? window.liqueia.stop(activeTab.id)
                : window.liqueia.reload(activeTab.id))
            }
          >
            {activeTab?.loading ? <X /> : <RefreshCw />}
          </IconButton>
          <IconButton
            label="Home"
            onClick={() => activeTab && void window.liqueia.goHome(activeTab.id)}
          >
            <Home />
          </IconButton>
        </div>

        <form className="address-bar" onSubmit={navigate}>
          <div className="address-status">
            {activeTab?.loading ? <LoaderCircle className="spin" /> : <ShieldCheck />}
          </div>
          <input
            ref={addressRef}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            placeholder="Search Google or enter an address"
            aria-label="Address and search bar"
            spellCheck={false}
          />
          <span className="address-hint"><Command /> K</span>
          <button
            type="button"
            className={`address-action ${isBookmarked ? 'active' : ''}`}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            onClick={() => activeTab && void window.liqueia.toggleBookmark(activeTab.id)}
          >
            <Star fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </form>

        <div className="nav-actions">
          <IconButton label="Command palette" onClick={() => setOverlay('command')}>
            <Command />
          </IconButton>
          <IconButton label="Downloads" onClick={() => void window.liqueia.openInternalPage('downloads')}>
            <Download />
          </IconButton>
          <IconButton
            label={focusMode ? 'Leave focus mode' : 'Focus mode'}
            onClick={() => setFocusMode((enabled) => !enabled)}
          >
            {focusMode ? <Maximize2 /> : <Focus />}
          </IconButton>
          <div className="menu-anchor">
            <IconButton label="Liqueia menu" onClick={() => setMenuOpen((open) => !open)}>
              <MoreHorizontal />
            </IconButton>
            {menuOpen && <BrowserMenu activeTab={activeTab} close={() => setMenuOpen(false)} />}
          </div>
        </div>
      </header>

      <section className="content-frame">
        {activeTab && internalPages[activeTab.url] && (
          <InternalPage page={internalPages[activeTab.url]} snapshot={snapshot} activeTab={activeTab} />
        )}
        {activeTab?.crashed && <ErrorPage tab={activeTab} />}
      </section>
      {focusMode && (
        <button className="focus-orb liquid-glass" onClick={() => setFocusMode(false)}>
          <Waves />
          <span>Leave focus</span>
        </button>
      )}
      {overlay === 'command' && (
        <CommandPalette
          snapshot={snapshot}
          activeTab={activeTab}
          close={() => setOverlay(null)}
          openTabs={() => setOverlay('tabs')}
          toggleFocus={() => {
            setFocusMode((enabled) => !enabled)
            setOverlay(null)
          }}
        />
      )}
      {overlay === 'tabs' && (
        <TabOverview snapshot={snapshot} close={() => setOverlay(null)} />
      )}
    </main>
  )
}

function TopTabs({
  snapshot,
  onOverview
}: {
  snapshot: BrowserSnapshot
  onOverview: () => void
}): React.JSX.Element {
  return (
    <div className={`top-tabs ${snapshot.settings.tabStyle}`}>
      <div className="brand-mark" aria-label="Liqueia">
        <img src="./liqueia-planet.png" alt="" />
      </div>
      <div className="tab-strip">
        {snapshot.tabs.map((tab) => (
          <Tab key={tab.id} tab={tab} active={tab.id === snapshot.activeTabId} />
        ))}
      </div>
      <IconButton label="New tab" onClick={() => void window.liqueia.createTab()}>
        <Plus />
      </IconButton>
      <IconButton label="Tab overview" onClick={onOverview}>
        <Grid2X2 />
      </IconButton>
    </div>
  )
}

function SidebarTabs({ snapshot }: { snapshot: BrowserSnapshot }): React.JSX.Element {
  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-brand">
        <div className="brand-mark"><img src="./liqueia-planet.png" alt="" /></div>
        <strong>Liqueia</strong>
        <IconButton label="New tab" onClick={() => void window.liqueia.createTab()}>
          <Plus />
        </IconButton>
      </div>
      <div className="sidebar-tabs">
        {snapshot.tabs.map((tab) => (
          <Tab key={tab.id} tab={tab} active={tab.id === snapshot.activeTabId} />
        ))}
      </div>
      <div className="sidebar-quick">
        <button onClick={() => void window.liqueia.openInternalPage('bookmarks')}>
          <Star /> Bookmarks
        </button>
        <button onClick={() => void window.liqueia.openInternalPage('history')}>
          <Clock3 /> History
        </button>
        <button onClick={() => void window.liqueia.openInternalPage('settings')}>
          <Settings /> Settings
        </button>
      </div>
    </aside>
  )
}

function Tab({ tab, active }: { tab: TabState; active: boolean }): React.JSX.Element {
  return (
    <div
      className={`tab ${active ? 'active' : ''}`}
      onClick={() => void window.liqueia.activateTab(tab.id)}
      onDoubleClick={() => void window.liqueia.duplicateTab(tab.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && void window.liqueia.activateTab(tab.id)}
    >
      <span className="tab-favicon">
        {tab.loading ? (
          <LoaderCircle className="spin" />
        ) : tab.favicon ? (
          <img src={tab.favicon} alt="" />
        ) : (
          <Sparkles />
        )}
      </span>
      <span className="tab-title">{tab.title}</span>
      <button
        className="tab-close"
        aria-label={`Close ${tab.title}`}
        onClick={(event) => {
          event.stopPropagation()
          void window.liqueia.closeTab(tab.id)
        }}
      >
        <X />
      </button>
    </div>
  )
}

function BrowserMenu({
  activeTab,
  close
}: {
  activeTab?: TabState
  close: () => void
}): React.JSX.Element {
  const zoom = activeTab?.zoomFactor ?? 1
  const run = (action: () => void): void => {
    action()
    close()
  }
  return (
    <div className="browser-menu glass-panel">
      <MenuAction icon={<Plus />} label="New Tab" shortcut="⌘T" onClick={() => run(() => void window.liqueia.createTab())} />
      <MenuAction icon={<PanelTop />} label="New Window" shortcut="⌘N" onClick={() => run(() => void window.liqueia.newWindow(false))} />
      <MenuAction icon={<ShieldCheck />} label="New Private Window" shortcut="⇧⌘N" onClick={() => run(() => void window.liqueia.newWindow(true))} />
      <div className="menu-separator" />
      <div className="menu-zoom-row">
        <span><ZoomIn /> Zoom</span>
        <button disabled={!activeTab} onClick={() => activeTab && void window.liqueia.setZoom(activeTab.id, zoom - 0.1)}><ZoomOut /></button>
        <button disabled={!activeTab} onClick={() => activeTab && void window.liqueia.resetZoom(activeTab.id)}>{Math.round(zoom * 100)}%</button>
        <button disabled={!activeTab} onClick={() => activeTab && void window.liqueia.setZoom(activeTab.id, zoom + 0.1)}><ZoomIn /></button>
        <button onClick={() => void window.liqueia.toggleFullscreen()}><Maximize2 /></button>
      </div>
      <div className="menu-separator" />
      <MenuAction icon={<Star />} label="Favourites" shortcut="⌥⌘B" onClick={() => run(() => void window.liqueia.openInternalPage('bookmarks'))} />
      <MenuAction icon={<Clock3 />} label="History" shortcut="⌘Y" onClick={() => run(() => void window.liqueia.openInternalPage('history'))} />
      <MenuAction icon={<Grid2X2 />} label="Tab Groups" trailing={<ChevronRight />} onClick={() => run(() => void window.liqueia.createTab())} />
      <MenuAction icon={<Download />} label="Downloads" shortcut="⌥⌘L" onClick={() => run(() => void window.liqueia.openInternalPage('downloads'))} />
      <MenuAction icon={<Puzzle />} label="Extensions" trailing={<ChevronRight />} onClick={() => run(() => void window.liqueia.openInternalPage('extensions'))} />
      <MenuAction icon={<KeyRound />} label="Passwords" onClick={() => run(() => void window.liqueia.openInternalPage('passwords'))} />
      <div className="menu-separator" />
      <MenuAction icon={<Trash2 />} label="Delete Browsing Data..." shortcut="⇧⌘⌫" onClick={() => run(() => void window.liqueia.clearBrowsingData({ history: true, cache: true, cookies: true, downloads: false }))} />
      <MenuAction icon={<Printer />} label="Print..." shortcut="⌘P" disabled={!activeTab} onClick={() => activeTab && run(() => void window.liqueia.printTab(activeTab.id))} />
      <MenuAction icon={<Copy />} label="Split screen" disabled={!activeTab} onClick={() => activeTab && run(() => void window.liqueia.duplicateTab(activeTab.id))} />
      <MenuAction icon={<Maximize2 />} label="Screenshot" shortcut="⇧⌘S" disabled={!activeTab} onClick={() => activeTab && run(() => void window.liqueia.captureTab(activeTab.id))} />
      <MenuAction icon={<Search />} label="Find on Page..." shortcut="⌘F" onClick={() => run(() => document.querySelector<HTMLInputElement>('.address-bar input')?.select())} />
      <MenuAction icon={<Sparkles />} label="More Tools" trailing={<ChevronRight />} onClick={() => run(() => void window.liqueia.reopenClosedTab())} />
      <div className="menu-separator" />
      <MenuAction icon={<Settings />} label="Settings" shortcut="⌘," onClick={() => run(() => void window.liqueia.openInternalPage('settings'))} />
      <MenuAction icon={<BookOpen />} label="Help and Feedback" trailing={<ChevronRight />} onClick={() => run(() => void window.liqueia.openExternal('https://github.com/mustafadurrani02/Liqueia/issues'))} />
    </div>
  )
}

function MenuAction({
  icon,
  label,
  shortcut,
  trailing,
  disabled,
  onClick
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  trailing?: React.ReactNode
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button className="menu-action" disabled={disabled} onClick={onClick}>
      <span className="menu-action-icon">{icon}</span>
      <span>{label}</span>
      {shortcut ? <kbd>{shortcut}</kbd> : trailing}
    </button>
  )
}

function CommandPalette({
  snapshot,
  activeTab,
  close,
  openTabs,
  toggleFocus
}: {
  snapshot: BrowserSnapshot
  activeTab?: TabState
  close: () => void
  openTabs: () => void
  toggleFocus: () => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const actions = [
    {
      label: 'Open a new tab',
      detail: 'Start a fresh journey',
      icon: <Plus />,
      run: () => void window.liqueia.createTab()
    },
    {
      label: 'Explore open tabs',
      detail: `${snapshot.tabs.length} active ${snapshot.tabs.length === 1 ? 'space' : 'spaces'}`,
      icon: <Grid2X2 />,
      run: openTabs
    },
    {
      label: 'Duplicate this tab',
      detail: activeTab?.title ?? 'Current page',
      icon: <Copy />,
      run: () => activeTab && void window.liqueia.duplicateTab(activeTab.id)
    },
    {
      label: 'Reopen closed tab',
      detail: 'Bring back your last space',
      icon: <RotateCcw />,
      run: () => void window.liqueia.reopenClosedTab()
    },
    {
      label: 'Enter focus mode',
      detail: 'Let the page fill the canvas',
      icon: <Focus />,
      run: toggleFocus
    },
    {
      label: 'Open bookmarks',
      detail: `${snapshot.bookmarks.length} saved places`,
      icon: <Star />,
      run: () => void window.liqueia.openInternalPage('bookmarks')
    },
    {
      label: 'Open history',
      detail: `${snapshot.history.length} recent journeys`,
      icon: <Clock3 />,
      run: () => void window.liqueia.openInternalPage('history')
    },
    {
      label: 'Personalize Liqueia',
      detail: 'Glass, color, layout and privacy',
      icon: <Palette />,
      run: () => void window.liqueia.openInternalPage('settings')
    }
  ]
  const filtered = actions.filter((action) =>
    `${action.label} ${action.detail}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="chrome-overlay" onMouseDown={close}>
      <section className="command-palette liquid-glass" onMouseDown={(event) => event.stopPropagation()}>
        <div className="palette-glow" />
        <img className="palette-planet" src="./liqueia-planet.png" alt="" />
        <header>
          <div className="palette-search">
            <Search />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What would you like to do?"
            />
            <kbd>esc</kbd>
          </div>
        </header>
        <div className="palette-label">Liquid actions</div>
        <div className="palette-actions">
          {filtered.map((action, index) => (
            <button
              key={action.label}
              className={index === 0 ? 'suggested' : ''}
              onClick={() => {
                action.run()
                if (action.run !== openTabs && action.run !== toggleFocus) close()
              }}
            >
              <span className="action-icon">{action.icon}</span>
              <span><strong>{action.label}</strong><small>{action.detail}</small></span>
              <ArrowUpRight />
            </button>
          ))}
        </div>
        <footer><Command /> <span>Search commands, tabs and places</span></footer>
      </section>
    </div>
  )
}

function TabOverview({
  snapshot,
  close
}: {
  snapshot: BrowserSnapshot
  close: () => void
}): React.JSX.Element {
  return (
    <div className="chrome-overlay tab-overview-shell" onMouseDown={close}>
      <section className="tab-overview" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">Your liquid workspace</p>
            <h2>Open spaces</h2>
          </div>
          <div className="overview-actions">
            <span>{snapshot.tabs.length} {snapshot.tabs.length === 1 ? 'tab' : 'tabs'}</span>
            <IconButton label="Close overview" onClick={close}><X /></IconButton>
          </div>
        </header>
        <div className="tab-cards">
          {snapshot.tabs.map((tab, index) => (
            <article
              key={tab.id}
              className={`tab-card liquid-glass ${tab.id === snapshot.activeTabId ? 'active' : ''}`}
            >
              <button
                className="tab-card-main"
                onClick={() => {
                  void window.liqueia.activateTab(tab.id)
                  close()
                }}
              >
                <div className="tab-card-visual">
                  <span className="tab-number">{String(index + 1).padStart(2, '0')}</span>
                  {tab.favicon ? <img src={tab.favicon} alt="" /> : <Waves />}
                  <div className="mini-orb" />
                </div>
                <div className="tab-card-copy">
                  <strong>{tab.title}</strong>
                  <small>{friendlyHost(tab.url)}</small>
                </div>
              </button>
              <div className="tab-card-actions">
                <IconButton label={`Duplicate ${tab.title}`} onClick={() => void window.liqueia.duplicateTab(tab.id)}>
                  <Copy />
                </IconButton>
                <IconButton label={`Close ${tab.title}`} onClick={() => void window.liqueia.closeTab(tab.id)}>
                  <X />
                </IconButton>
              </div>
            </article>
          ))}
          <button
            className="new-space-card liquid-glass"
            onClick={() => {
              void window.liqueia.createTab()
              close()
            }}
          >
            <Plus />
            <span>New space</span>
          </button>
        </div>
      </section>
    </div>
  )
}

function friendlyHost(url: string): string {
  if (url.startsWith('liqueia://')) return url.replace('liqueia://', 'Liqueia · ')
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function InternalPage({
  page,
  snapshot,
  activeTab
}: {
  page: InternalPage
  snapshot: BrowserSnapshot
  activeTab: TabState
}): React.JSX.Element {
  if (page === 'newtab') return <NewTab snapshot={snapshot} activeTab={activeTab} />
  if (page === 'settings') return <SettingsPage settings={snapshot.settings} />
  if (page === 'bookmarks') return <BookmarksPage snapshot={snapshot} activeTab={activeTab} />
  if (page === 'history') return <HistoryPage snapshot={snapshot} activeTab={activeTab} />
  if (page === 'downloads') return <DownloadsPage snapshot={snapshot} />
  if (page === 'extensions') {
    return (
      <FeaturePage
        icon={<Puzzle />}
        eyebrow="Tools"
        title="Extensions"
        copy="Extension support is being prepared behind a safer permission model. For now, this page is the control centre for what will become Liqueia add-ons."
      />
    )
  }
  return (
    <FeaturePage
      icon={<KeyRound />}
      eyebrow="Vault"
      title="Passwords"
      copy="Password management is intentionally local-first on the roadmap. Liqueia does not sync or upload saved credentials in this build."
    />
  )
}

function NewTab({
  snapshot,
  activeTab
}: {
  snapshot: BrowserSnapshot
  activeTab: TabState
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const navigate = (event: FormEvent): void => {
    event.preventDefault()
    void window.liqueia.navigate(activeTab.id, query)
  }
  return (
    <div className={`internal-page new-tab background-${snapshot.settings.newTabBackground}`}>
      <div className="new-tab-liquid liquid-a" />
      <div className="new-tab-liquid liquid-b" />
      <div className="new-tab-liquid liquid-c" />
      <div className="new-tab-content">
        <img className="new-tab-planet" src="./liqueia-planet.png" alt="" />
        <h1>Liqueia</h1>
        <form className="new-tab-search liquid-glass" onSubmit={navigate}>
          <span className="search-lens"><Search /></span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or enter an address"
          />
          <kbd>↵</kbd>
        </form>
      </div>
    </div>
  )
}

function SettingsPage({ settings }: { settings: BrowserSettings }): React.JSX.Element {
  const update = (patch: Partial<BrowserSettings>): void => {
    void window.liqueia.updateSettings(patch)
  }
  return (
    <PageScaffold icon={<Settings />} eyebrow="Personalize" title="Settings">
      <SettingsSection icon={<Palette />} title="Appearance" description="Shape Liqueia around you.">
        <Segmented
          value={settings.themeMode}
          options={['light', 'dark', 'system']}
          onChange={(value) => update({ themeMode: value as BrowserSettings['themeMode'] })}
        />
        <SettingRow label="Accent colour">
          <div className="color-options">
            {['#d8aa58', '#f0c66f', '#8f7cff', '#49c6b7', '#e66d8c', '#5f98ff', '#f7f2df'].map((color) => (
              <button
                key={color}
                aria-label={`Use ${color} accent`}
                className={settings.accentColor === color ? 'selected' : ''}
                style={{ background: color }}
                onClick={() => update({ accentColor: color })}
              >
                {settings.accentColor === color && <Check />}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Theme world">
          <Segmented
            value={settings.themePreset}
            options={['obsidian', 'champagne', 'aurora', 'midnight', 'pearl', 'rose']}
            onChange={(value) => update({ themePreset: value as BrowserSettings['themePreset'] })}
          />
        </SettingRow>
        <SettingRow label="Glass depth">
          <Segmented
            value={settings.glassIntensity}
            options={['soft', 'balanced', 'vivid']}
            onChange={(value) => update({ glassIntensity: value as BrowserSettings['glassIntensity'] })}
          />
        </SettingRow>
        <SettingRow label="Tab layout">
          <Segmented
            value={settings.tabLayout}
            options={['topbar', 'sidebar']}
            onChange={(value) => update({ tabLayout: value as BrowserSettings['tabLayout'] })}
          />
        </SettingRow>
        <SettingRow label="Tab density">
          <Segmented
            value={settings.tabStyle}
            options={['compact', 'comfortable', 'spacious']}
            onChange={(value) => update({ tabStyle: value as BrowserSettings['tabStyle'] })}
          />
        </SettingRow>
        <Toggle
          label="Show bookmarks bar"
          checked={settings.showBookmarksBar}
          onChange={(checked) => update({ showBookmarksBar: checked })}
        />
        <SettingRow label="New tab atmosphere">
          <select
            value={settings.newTabBackground}
            onChange={(event) => update({ newTabBackground: event.target.value })}
          >
            <option value="aurora">Golden aurora</option>
            <option value="midnight">Midnight bloom</option>
            <option value="mist">Silver mist</option>
            <option value="pearl">Pearl glass</option>
            <option value="rose">Rose dusk</option>
          </select>
        </SettingRow>
      </SettingsSection>

      <SettingsSection icon={<Globe2 />} title="Search & startup" description="Choose how journeys begin.">
        <SettingRow label="Search engine">
          <select
            value={settings.searchEngine}
            onChange={(event) =>
              update({ searchEngine: event.target.value as BrowserSettings['searchEngine'] })
            }
          >
            <option value="google">Google</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="bing">Bing</option>
            <option value="brave">Brave Search</option>
          </select>
        </SettingRow>
        <SettingRow label="Homepage">
          <input
            className="setting-input"
            defaultValue={settings.homepage}
            onBlur={(event) => update({ homepage: event.target.value })}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection icon={<ShieldCheck />} title="Privacy" description="Simple controls, clear intent.">
        <Toggle
          label="Send Do Not Track"
          checked={settings.sendDoNotTrack}
          onChange={(checked) => update({ sendDoNotTrack: checked })}
        />
        <Toggle
          label="Block third-party cookies"
          checked={settings.blockThirdPartyCookies}
          onChange={(checked) => update({ blockThirdPartyCookies: checked })}
        />
        <Toggle
          label="Block pop-up windows"
          checked={settings.blockPopups}
          onChange={(checked) => update({ blockPopups: checked })}
        />
        <button
          className="danger-button"
          onClick={() =>
            void window.liqueia.clearBrowsingData({
              history: true,
              cache: true,
              cookies: true,
              downloads: false
            })
          }
        >
          <Trash2 /> Clear browsing data
        </button>
      </SettingsSection>
    </PageScaffold>
  )
}

function BookmarksPage({
  snapshot,
  activeTab
}: {
  snapshot: BrowserSnapshot
  activeTab: TabState
}): React.JSX.Element {
  return (
    <PageScaffold icon={<Star />} eyebrow="Saved places" title="Bookmarks">
      <ItemList
        empty="Pages you bookmark will appear here."
        items={snapshot.bookmarks.map((bookmark) => ({
          id: bookmark.id,
          title: bookmark.title,
          subtitle: bookmark.url,
          icon: <Star />,
          action: () => void window.liqueia.navigate(activeTab.id, bookmark.url),
          secondary: () => void window.liqueia.removeBookmark(bookmark.id)
        }))}
      />
    </PageScaffold>
  )
}

function HistoryPage({
  snapshot,
  activeTab
}: {
  snapshot: BrowserSnapshot
  activeTab: TabState
}): React.JSX.Element {
  return (
    <PageScaffold icon={<Clock3 />} eyebrow="Recent journeys" title="History">
      <ItemList
        empty="Your browsing history is clear."
        items={snapshot.history.map((entry) => ({
          id: entry.id,
          title: entry.title,
          subtitle: `${new Date(entry.visitedAt).toLocaleString()} · ${entry.url}`,
          icon: <Clock3 />,
          action: () => void window.liqueia.navigate(activeTab.id, entry.url)
        }))}
      />
    </PageScaffold>
  )
}

function DownloadsPage({ snapshot }: { snapshot: BrowserSnapshot }): React.JSX.Element {
  return (
    <PageScaffold icon={<Download />} eyebrow="Files" title="Downloads">
      <ItemList
        empty="Downloads will appear here."
        items={snapshot.downloads.map((download) => ({
          id: download.id,
          title: download.filename,
          subtitle:
            download.state === 'progressing'
              ? `${Math.round((download.receivedBytes / Math.max(download.totalBytes, 1)) * 100)}%`
              : download.state,
          icon: <Download />,
          action: () => void window.liqueia.showDownload(download.id)
        }))}
      />
    </PageScaffold>
  )
}

function FeaturePage({
  icon,
  eyebrow,
  title,
  copy
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  copy: string
}): React.JSX.Element {
  return (
    <PageScaffold icon={icon} eyebrow={eyebrow} title={title}>
      <div className="feature-card liquid-glass">
        <Sparkles />
        <p>{copy}</p>
        <button className="primary-button" onClick={() => void window.liqueia.openInternalPage('settings')}>
          <Settings /> Open settings
        </button>
      </div>
    </PageScaffold>
  )
}

function ErrorPage({ tab }: { tab: TabState }): React.JSX.Element {
  return (
    <div className="internal-page error-page">
      <div className="error-card glass-panel">
        <div className="page-icon"><Globe2 /></div>
        <p className="eyebrow">Connection interrupted</p>
        <h1>This page took a wrong turn.</h1>
        <p>Liqueia could not load {tab.url}. Check your connection or try again.</p>
        <button className="primary-button" onClick={() => void window.liqueia.reload(tab.id)}>
          <RefreshCw /> Try again
        </button>
      </div>
    </div>
  )
}

function PageScaffold({
  icon,
  eyebrow,
  title,
  children
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="internal-page utility-page">
      <div className="utility-content">
        <header className="page-header">
          <div className="page-icon">{icon}</div>
          <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
        </header>
        {children}
      </div>
    </div>
  )
}

function SettingsSection({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="settings-section glass-panel">
      <header><div className="section-icon">{icon}</div><div><h2>{title}</h2><p>{description}</p></div></header>
      <div className="settings-body">{children}</div>
    </section>
  )
}

function SettingRow({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return <div className="setting-row"><span>{label}</span>{children}</div>
}

function Segmented({
  value,
  options,
  onChange
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option} className={value === option ? 'active' : ''} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="setting-row toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track"><span /></span>
    </label>
  )
}

function ItemList({
  empty,
  items
}: {
  empty: string
  items: Array<{
    id: string
    title: string
    subtitle: string
    icon: React.ReactNode
    action: () => void
    secondary?: () => void
  }>
}): React.JSX.Element {
  if (!items.length) return <div className="empty-state glass-panel"><Sparkles /><p>{empty}</p></div>
  return (
    <div className="item-list glass-panel">
      {items.map((item) => (
        <div className="list-item" key={item.id}>
          <button className="list-main" onClick={item.action}>
            <span className="list-icon">{item.icon}</span>
            <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
          </button>
          {item.secondary && (
            <IconButton label={`Remove ${item.title}`} onClick={item.secondary}><Trash2 /></IconButton>
          )}
          {!item.secondary && <ExternalLink className="list-trailing" />}
        </div>
      ))}
    </div>
  )
}

function IconButton({
  label,
  children,
  disabled,
  onClick
}: {
  label: string
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button className="icon-button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
