import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MarkdownContent } from '@/components/MarkdownContent'
import { cookies } from 'next/headers'
import { EditButton } from './EditButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const result = await payload.find({
    collection: 'kb-articles',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  const article = result.docs[0]
  if (!article) return { title: 'Not Found - Voxta Unofficial Docs' }

  return {
    title: `${article.title} - Voxta KB`,
    description: article.content?.slice(0, 160) || '',
  }
}

export default async function KBArticlePage({ params }: PageProps) {
  const { slug } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const result = await payload.find({
    collection: 'kb-articles',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  const article = result.docs[0]
  if (!article) notFound()

  // Check if user is logged in
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('discord_user')
  const isLoggedIn = !!userCookie

  // Parse topics and keywords
  const topics = article.topics as Array<{ topic: string }> | undefined
  const keywords = article.keywords as Array<{ keyword: string }> | undefined

  // Format last edited date
  const lastEditedAt = article.lastEditedAt ? new Date(article.lastEditedAt).toLocaleDateString() : null

  return (
    <div className="kb-page">
      <Link href="/kb" className="back-link">&larr; Back to Knowledge Base</Link>

      <div className="kb-header">
        <div>
          <h1>{article.title}</h1>
          {lastEditedAt && article.lastEditedByName && (
            <p className="last-edited">
              Last edited by {article.lastEditedByName} on {lastEditedAt}
            </p>
          )}
        </div>
        {isLoggedIn && <EditButton slug={slug} />}
      </div>

      <div className="kb-meta">
        {article.type && <span>{article.type}</span>}
        {article.category && <span>{article.category}</span>}
        {article.confidence && <span>{Math.round(article.confidence * 100)}% confidence</span>}
        {article.contributor && (
          <Link href={`/contributor/${encodeURIComponent(article.contributor)}`}>
            By {article.contributor}
          </Link>
        )}
      </div>

      <div className="kb-content">
        <MarkdownContent content={article.content || ''} />
      </div>

      {topics && topics.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <strong>Topics:</strong>{' '}
          {topics.map((t, i) => (
            <span key={i} style={{
              background: 'var(--bg-card)',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              marginRight: '0.5rem',
              fontSize: '0.875rem'
            }}>
              {t.topic}
            </span>
          ))}
        </div>
      )}

      {keywords && keywords.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Keywords:</strong>{' '}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {keywords.map(k => k.keyword).join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}
