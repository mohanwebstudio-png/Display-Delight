import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Security: Restrict developer tools inspection shortcuts and right-click on login & sensitive screens
if (typeof window !== 'undefined') {
  document.addEventListener('contextmenu', (e) => {
    const isSensitive = window.location.hash.includes('login') || window.location.pathname.includes('login') || window.location.hash.includes('auth') || window.location.hash.includes('admin')
    if (isSensitive) {
      e.preventDefault()
    }
  })

  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
    ) {
      const isSensitive = window.location.hash.includes('login') || window.location.pathname.includes('login') || window.location.hash.includes('auth') || window.location.hash.includes('admin')
      if (isSensitive) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
