'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const categories = [
  { label: 'Documentation', value: 'documentation' },
  { label: 'Installing', value: 'installing' },
  { label: 'Interface', value: 'interface' },
  { label: 'Modules', value: 'modules' },
  { label: 'Developers', value: 'developers' },
  { label: 'Creators', value: 'creators' },
]

export function NewDocForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('documentation')
  const [sortOrder, setSortOrder] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/docs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, sortOrder }),
      })

      const data = await res.json() as { error?: string; slug?: string }

      if (!res.ok) {
        setError(data.error || 'Failed to create documentation')
        return
      }

      router.push(`/docs/${data.slug}`)
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
          placeholder="Enter page title..."
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
          <label htmlFor="sortOrder">Sort Order</label>
          <input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 100)}
            min={0}
            max={9999}
          />
          <small>Lower values appear first within the category</small>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="content">Content (Markdown)</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your documentation content in Markdown..."
          rows={20}
          required
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="save-button">
          {isSubmitting ? 'Creating...' : 'Create Page'}
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
