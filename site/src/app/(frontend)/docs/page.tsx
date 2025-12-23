import React from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const metadata = {
  title: 'Documentation - Voxta Docs',
  description: 'Browse all Voxta documentation pages',
}

export default async function DocsListPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const docs = await payload.find({
    collection: 'docs-pages',
    limit: 100,
    sort: 'title',
  })

  // Group docs by category
  const grouped = docs.docs.reduce((acc, doc) => {
    const category = doc.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(doc)
    return acc
  }, {} as Record<string, typeof docs.docs>)

  const categories = Object.keys(grouped).sort()

  return (
    <div className="docs-list-page">
      <h1>Documentation</h1>

      {categories.map((category) => (
        <section key={category} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            {category}
          </h2>
          <div className="docs-grid">
            {grouped[category].map((doc) => (
              <div key={doc.id} className="doc-card">
                <a href={`/docs/${doc.slug}`}>
                  <h3>{doc.title}</h3>
                  <div className="meta">
                    {doc.category && <span>{doc.category}</span>}
                  </div>
                </a>
              </div>
            ))}
          </div>
        </section>
      ))}

      {docs.docs.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>No documentation pages yet.</p>
      )}
    </div>
  )
}
