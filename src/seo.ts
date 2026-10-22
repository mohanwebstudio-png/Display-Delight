import { useEffect } from 'react'
import { contentApi, type PublicSeoData } from './api'

function updateMetaTag(name: string, content: string, isProperty = false) {
  if (typeof document === 'undefined') return
  const attr = isProperty ? 'property' : 'name'
  let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attr, name)
    document.head.appendChild(meta)
  }
  meta.content = content
}

function updateCanonical(url: string) {
  if (typeof document === 'undefined') return
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url
}

const seoCache = new Map<string, PublicSeoData>()

export function applySeo(data: Partial<PublicSeoData>) {
  if (typeof document === 'undefined') return
  if (data.title) {
    document.title = data.title
    updateMetaTag('og:title', data.title, true)
  }
  if (data.description) {
    updateMetaTag('description', data.description)
    updateMetaTag('og:description', data.description, true)
  }
  if (data.og_image_url) {
    const fullImg = data.og_image_url.startsWith('http')
      ? data.og_image_url
      : (typeof window !== 'undefined' ? `${window.location.origin}${data.og_image_url}` : data.og_image_url)
    updateMetaTag('og:image', fullImg, true)
  }
  if (data.canonical_url) {
    const fullCanonical = data.canonical_url.startsWith('http')
      ? data.canonical_url
      : (typeof window !== 'undefined' ? `${window.location.origin}${data.canonical_url}` : data.canonical_url)
    updateCanonical(fullCanonical)
    updateMetaTag('og:url', fullCanonical, true)
  }
  if (typeof data.noindex === 'boolean') {
    updateMetaTag('robots', data.noindex ? 'noindex, nofollow' : 'index, follow')
  }
}

/**
 * Automatically fetches and binds SEO metadata (title, meta description, OG image, canonical URL)
 * for the current storefront path, powered by the backend database SEO snippet registry.
 */
export function useStorefrontSeo(path: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || path.startsWith('/admin')) return

    const cacheKey = path.replace(/^\/+/, '') || 'home'
    if (seoCache.has(cacheKey)) {
      applySeo(seoCache.get(cacheKey)!)
      return
    }

    let active = true
    contentApi.getPublicSeo(cacheKey)
      .then((data) => {
        if (active && data) {
          seoCache.set(cacheKey, data)
          applySeo(data)
        }
      })
      .catch((err) => {
        console.warn(`Could not load SEO metadata for ${path}:`, err)
      })

    return () => { active = false }
  }, [path])
}
