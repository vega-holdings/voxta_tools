import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MarkdownContent } from '@/components/MarkdownContent'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const result = await payload.find({
    collection: 'docs-pages',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  const doc = result.docs[0]
  if (!doc) return { title: 'Not Found - Voxta Unofficial Docs' }

  return {
    title: `${doc.title} - Voxta Unofficial Docs`,
    description: doc.content?.slice(0, 160) || '',
  }
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const result = await payload.find({
    collection: 'docs-pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })

  const doc = result.docs[0]
  if (!doc) notFound()

  // Get related KB articles if any
  const relatedKB = doc.relatedKB as Array<{ id: number; title: string; slug: string }> | undefined

  return (
    <div className="doc-page">
      <Link href="/docs" className="back-link">&larr; Back to Docs</Link>

      <h1>{doc.title}</h1>

      <div className="doc-meta">
        {doc.category && <span>{doc.category}</span>}
        {doc.originalUrl && (
          <a href={doc.originalUrl} target="_blank" rel="noopener noreferrer">
            <span>Original</span>
          </a>
        )}
      </div>

      <div className="doc-content">
        <MarkdownContent content={doc.content || ''} />
      </div>

      {relatedKB && relatedKB.length > 0 && (
        <div className="related-kb">
          <h2>Related KB Articles</h2>
          <ul>
            {relatedKB.map((kb) => (
              <li key={kb.id}>
                <Link href={`/kb/${kb.slug}`}>{kb.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
