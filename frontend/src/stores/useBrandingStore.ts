import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BrandingState {
  logo: string | null
  title: string
  favicon: string | null
}

interface BrandingActions {
  setLogo: (logo: string | null) => void
  setTitle: (title: string) => void
  setFavicon: (favicon: string | null) => void
  resetBranding: () => void
}

type BrandingStore = BrandingState & BrandingActions

const DEFAULT_TITLE = 'Trae-Financial AI Assistant'

export const useBrandingStore = create<BrandingStore>()(persist(
  (set) => ({
    // Initial state
    logo: null,
    title: DEFAULT_TITLE,
    favicon: null,

    // Actions
    setLogo: (logo: string | null) => set({ logo }),
    setTitle: (title: string) => {
      set({ title })
      // Update document title immediately
      document.title = title
    },
    setFavicon: (favicon: string | null) => {
      set({ favicon })
      // Update favicon immediately
      if (favicon) {
        updateFavicon(favicon)
      } else {
        // Reset to default favicon
        updateFavicon('/favicon.ico')
      }
    },
    resetBranding: () => {
      set({ 
        logo: null, 
        title: DEFAULT_TITLE, 
        favicon: null 
      })
      document.title = DEFAULT_TITLE
      updateFavicon('/favicon.ico')
    }
  }),
  {
    name: 'branding-storage',
    onRehydrateStorage: () => (state) => {
      if (state) {
        // Apply stored title and favicon on app load
        document.title = state.title
        if (state.favicon) {
          updateFavicon(state.favicon)
        }
      }
    }
  }
))

// Helper function to update favicon
function updateFavicon(href: string) {
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link')
  link.type = 'image/x-icon'
  link.rel = 'shortcut icon'
  link.href = href
  document.getElementsByTagName('head')[0].appendChild(link)
}