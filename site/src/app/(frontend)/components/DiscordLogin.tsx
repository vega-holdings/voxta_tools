'use client'

import { useState, useEffect } from 'react'

interface User {
  id: number
  discordId: string
  username: string
  displayName: string
  avatar?: string
}

export function DiscordLogin() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json() as { user: User | null }
        setUser(data.user)
      } catch {
        // Not logged in
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) {
    return <span className="discord-login-loading">...</span>
  }

  if (user) {
    return (
      <div className="discord-user">
        {user.avatar && <img src={user.avatar} alt="" className="discord-avatar" />}
        <span className="discord-name">{user.displayName}</span>
        <a href="/api/auth/logout" className="discord-logout">Logout</a>
      </div>
    )
  }

  return (
    <a href="/api/auth/discord" className="discord-login-btn">
      Login with Discord
    </a>
  )
}
