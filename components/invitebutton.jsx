'use client'

import { useState } from 'react'
import { useInvite } from '@/lib/useInvite'

const FONT = "'Times New Roman', Times, serif"

export default function InviteButton({ type = 'office', roomId = null, memberId }) {
  const { generateOfficeInvite, generateRoomInvite, loading } = useInvite()
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    let url = null
    if (type === 'office') {
      url = await generateOfficeInvite(memberId)
    } else if (type === 'room' && roomId) {
      url = await generateRoomInvite(roomId, memberId)
    }

    if (url) {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#ffffff',
        padding: '7px 16px',
        borderRadius: 4,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 16,
        fontFamily: FONT,
        opacity: loading ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? 'generating...' : copied ? '✓ link copied!' : '🔗 invite'}
    </button>
  )
}
