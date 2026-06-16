import { ipcMain, shell } from 'electron'
import type { BrowserSettings, ClearDataOptions, InternalPage } from '../shared/types'
import type { BrowserController } from './browser'

export function registerIpc(controller: BrowserController): void {
  for (const channel of [
    'browser:get-snapshot',
    'browser:create-tab',
    'browser:close-tab',
    'browser:activate-tab',
    'browser:duplicate-tab',
    'browser:reopen-closed-tab',
    'browser:navigate',
    'browser:back',
    'browser:forward',
    'browser:reload',
    'browser:stop',
    'browser:home',
    'browser:open-internal',
    'browser:zoom',
    'browser:reset-zoom',
    'browser:print-tab',
    'browser:capture-tab',
    'browser:toggle-fullscreen',
    'browser:toggle-bookmark',
    'browser:remove-bookmark',
    'browser:update-settings',
    'browser:clear-data',
    'browser:show-download',
    'browser:set-chrome-overlay',
    'browser:set-focus-mode',
    'browser:open-external'
  ]) {
    ipcMain.removeHandler(channel)
  }

  ipcMain.handle('browser:get-snapshot', () => controller.snapshot())
  ipcMain.handle('browser:create-tab', (_event, url?: string) => controller.createTab(url))
  ipcMain.handle('browser:close-tab', (_event, id: string) => controller.closeTab(id))
  ipcMain.handle('browser:activate-tab', (_event, id: string) => controller.activateTab(id))
  ipcMain.handle('browser:duplicate-tab', (_event, id: string) => controller.duplicateTab(id))
  ipcMain.handle('browser:reopen-closed-tab', () => controller.reopenClosedTab())
  ipcMain.handle('browser:navigate', (_event, id: string, input: string) =>
    controller.navigate(id, input)
  )
  ipcMain.handle('browser:back', (_event, id: string) => controller.goBack(id))
  ipcMain.handle('browser:forward', (_event, id: string) => controller.goForward(id))
  ipcMain.handle('browser:reload', (_event, id: string) => controller.reload(id))
  ipcMain.handle('browser:stop', (_event, id: string) => controller.stop(id))
  ipcMain.handle('browser:home', (_event, id: string) => controller.goHome(id))
  ipcMain.handle('browser:open-internal', (_event, page: InternalPage) =>
    controller.openInternalPage(page)
  )
  ipcMain.handle('browser:zoom', (_event, id: string, zoomFactor: number) =>
    controller.setZoom(id, zoomFactor)
  )
  ipcMain.handle('browser:reset-zoom', (_event, id: string) => controller.resetZoom(id))
  ipcMain.handle('browser:print-tab', (_event, id: string) => controller.printTab(id))
  ipcMain.handle('browser:capture-tab', (_event, id: string) => controller.captureTab(id))
  ipcMain.handle('browser:toggle-fullscreen', () => controller.toggleFullscreen())
  ipcMain.handle('browser:toggle-bookmark', (_event, id: string) =>
    controller.toggleBookmark(id)
  )
  ipcMain.handle('browser:remove-bookmark', (_event, id: string) =>
    controller.removeBookmark(id)
  )
  ipcMain.handle('browser:update-settings', (_event, patch: Partial<BrowserSettings>) =>
    controller.updateSettings(patch)
  )
  ipcMain.handle('browser:clear-data', (_event, options: ClearDataOptions) =>
    controller.clearBrowsingData(options)
  )
  ipcMain.handle('browser:show-download', (_event, id: string) => controller.showDownload(id))
  ipcMain.handle('browser:set-chrome-overlay', (_event, visible: boolean) =>
    controller.setChromeOverlay(visible)
  )
  ipcMain.handle('browser:set-focus-mode', (_event, enabled: boolean) =>
    controller.setFocusMode(enabled)
  )
  ipcMain.handle('browser:open-external', (_event, url: string) => shell.openExternal(url))
}
