'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClaimButtonProps {
  contributorName: string
}

export function ClaimButton({ contributorName }: ClaimButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleClaim = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/contributor/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributorName }),
      })

      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok) {
        setError(data.error || 'Failed to claim')
        return
      }

      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="claim-section">
      <button
        onClick={handleClaim}
        disabled={loading}
        className="claim-button"
      >
        {loading ? 'Claiming...' : 'Claim this profile'}
      </button>
      {error && <p className="claim-error">{error}</p>}
      <p className="claim-hint">
        Is this you? Claim this contributor name to link it to your Discord account.
      </p>
    </div>
  )
}
