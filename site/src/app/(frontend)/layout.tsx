import React from 'react'
import Link from 'next/link'
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
            <Link href="/" className="logo">Voxta Docs</Link>
            <div className="nav-links">
              <Link href="/docs">Docs</Link>
              <Link href="/kb">KB</Link>
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
