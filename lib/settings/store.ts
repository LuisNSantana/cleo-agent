import { create } from "zustand"

export type SettingsTab =
  | "general"
  | "dashboard"
  | "appearance"
  | "models"
  | "connections"
  | "files"
  | "agents"
  | "docs"

interface SettingsStore {
  isOpen: boolean
  activeTab: SettingsTab
  lastOpenedTab: SettingsTab
  openSettings: (tab?: SettingsTab) => void
  closeSettings: () => void
  setActiveTab: (tab: SettingsTab) => void
}

const DEFAULT_TAB: SettingsTab = "general"

export const useSettingsStore = create<SettingsStore>((set) => ({
  isOpen: false,
  activeTab: DEFAULT_TAB,
  lastOpenedTab: DEFAULT_TAB,
  openSettings: (tab) =>
    set((state) => ({
      isOpen: true,
      activeTab: tab ?? state.lastOpenedTab,
      lastOpenedTab: tab ?? state.lastOpenedTab,
    })),
  closeSettings: () => set({ isOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab, lastOpenedTab: tab }),
}))
