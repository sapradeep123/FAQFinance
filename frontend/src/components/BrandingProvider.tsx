import React, { useEffect } from 'react'
import { useBrandingStore } from '../stores/useBrandingStore'

interface BrandingProviderProps {
  children: React.ReactNode
}

const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const { title, favicon } = useBrandingStore()

  useEffect(() => {
    // Update document title
    document.title = title
  }, [title])

  useEffect(() => {
    // Update favicon
    if (favicon) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      link.href = favicon
      document.getElementsByTagName('head')[0].appendChild(link)
    }
  }, [favicon])

  return <>{children}</>
}

export default BrandingProvider