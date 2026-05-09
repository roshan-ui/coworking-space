'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FONT = "'Times New Roman', Times, serif"

export default function JoinPage() {
  const { token } = useParams()
  const router = useRouter()
  const [status, setStatus] = useState('joining')
  const [error, setError] = useState('')

  useEffect(() => {
    async function join() {
      const { data: invite, error: fetchError } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (fetchError || !invite) {
        setError('Invalid or expired invite link')
        setStatus('error')
        return
      }

      setStatus('success')
      setTimeout(() => router.push('/'), 1500)
    }
    if (token) join()
  }, [token])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: FONT }}>
      <div style={{ border: '1px solid #333', padding: '48px 64px', textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 13, letterSpacing: '0.15em', color: '#666', marginBottom: 24 }}>COWORK.DEV</div>
        {status === 'joining' && <div style={{ fontSize: 22 }}>Joining...</div>}
        {status === 'success' && <div style={{ fontSize: 22 }}>You're in. Redirecting...</div>}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 22, marginBottom: 12 }}>Invalid link.</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>{error}</div>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '10px 24px', fontFamily: FONT, fontSize: 13, cursor: 'pointer' }}>GO HOME</button>
          </>
        )}
      </div>
    </div>
  )
}
