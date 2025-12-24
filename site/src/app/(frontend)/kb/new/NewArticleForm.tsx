'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const categories = [
  { label: 'Configuration', value: 'configuration' },
  { label: 'Troubleshooting', value: 'troubleshooting' },
  { label: 'Integrations', value: 'integrations' },
  { label: 'Setup', value: 'setup' },
  { label: 'Scripting', value: 'scripting' },
  { label: 'LLM', value: 'llm' },
  { label: 'Performance', value: 'performance' },
  { label: 'Characters', value: 'characters' },
  { label: 'Scenarios', value: 'scenarios' },
  { label: 'Chat', value: 'chat' },
  { label: 'Events', value: 'events' },
  { label: 'Flags', value: 'flags' },
]

const types = [
  { label: 'Q&A', value: 'qa' },
  { label: 'Troubleshooting', value: 'troubleshooting' },
  { label: 'Tip', value: 'tip' },
  { label: 'Reference', value: 'reference' },
]

export function NewArticleForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('configuration')
  const [type, setType] = useState('qa')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/kb/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, type }),
      })

      const data = await res.json() as { error?: string; slug?: string }

      if (!res.ok) {
        setError(data.error || 'Failed to create article')
        return
      }

      router.push(`/kb/${data.slug}`)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="kb-edit-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter article title..."
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {types.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="content">Content (Markdown)</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your article content in Markdown..."
          rows={20}
          required
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="save-button">
          {isSubmitting ? 'Creating...' : 'Create Article'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
