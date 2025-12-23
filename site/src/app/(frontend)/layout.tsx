import React from 'react'
import './styles.css'

export const metadata = {
  title: 'Voxta Docs - Unofficial Documentation',
  description: 'Unofficial community documentation for Voxta AI conversation platform with semantic search.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav>
            <a href="/" className="logo">Voxta Docs</a>
            <div className="nav-links">
              <a href="/docs">Docs</a>
              <a href="/kb">KB</a>
              <a href="/admin" target="_blank">Admin</a>
              <a href="https://voxta.ai" target="_blank" rel="noopener noreferrer">Official Site</a>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <p>
            Unofficial community documentation for <a href="https://voxta.ai" target="_blank" rel="noopener noreferrer">Voxta</a>.
            Not affiliated with Voxta AI.
          </p>
        </footer>
      </body>
    </html>
  )
}
