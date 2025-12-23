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
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
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
