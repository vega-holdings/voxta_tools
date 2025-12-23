import React from 'react'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Knowledge Base - Voxta Docs',
  description: 'Browse all Voxta knowledge base articles',
}

export default async function KBListPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const articles = await payload.find({
    collection: 'kb-articles',
    limit: 100,
    sort: 'title',
  })

  // Group by category
  const grouped = articles.docs.reduce((acc, article) => {
    const category = article.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(article)
    return acc
  }, {} as Record<string, typeof articles.docs>)

  const categories = Object.keys(grouped).sort()

  return (
    <div className="kb-list-page">
      <h1>Knowledge Base</h1>

      {categories.map((category) => (
        <section key={category} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            {category}
          </h2>
          <div className="kb-grid">
            {grouped[category].map((article) => (
              <div key={article.id} className="kb-card">
                <Link href={`/kb/${article.slug}`}>
                  <h3>{article.title}</h3>
                  <div className="meta">
                    {article.type && <span>{article.type}</span>}
                    {article.confidence && <span>{Math.round(article.confidence * 100)}% confidence</span>}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}

      {articles.docs.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>No knowledge base articles yet.</p>
      )}
    </div>
  )
}
