import React from 'react'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { SearchForm } from './components/SearchForm'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  // Get recent docs and KB articles for the homepage
  const recentDocs = await payload.find({
    collection: 'docs-pages',
    limit: 6,
    sort: '-updatedAt',
  })

  const recentKB = await payload.find({
    collection: 'kb-articles',
    limit: 6,
    sort: '-updatedAt',
  })

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Voxta Unofficial Documentation</h1>
        <p className="tagline">
          Unofficial community documentation for the Voxta AI conversation platform.
          Search across all docs and knowledge base articles.
        </p>
        <SearchForm />
      </section>

      <section className="content-grid">
        <div className="section">
          <h2>Documentation</h2>
          <p className="section-desc">Official guides and references</p>
          <ul className="item-list">
            {recentDocs.docs.map((doc) => (
              <li key={doc.id}>
                <Link href={`/docs/${doc.slug}`}>
                  <span className="item-title">{doc.title}</span>
                  {doc.category && <span className="item-category">{doc.category}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/docs" className="view-all">View all docs</Link>
        </div>

        <div className="section">
          <h2>Knowledge Base</h2>
          <p className="section-desc">Community Q&A and troubleshooting</p>
          <ul className="item-list">
            {recentKB.docs.map((article) => (
              <li key={article.id}>
                <Link href={`/kb/${article.slug}`}>
                  <span className="item-title">{article.title}</span>
                  {article.type && <span className="item-type">{article.type}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/kb" className="view-all">View all KB articles</Link>
        </div>
      </section>
    </div>
  )
}
