import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export function useInvite() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function generateOfficeInvite(memberId) {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('invite_tokens')
        .insert({ type: 'office', created_by: memberId })
        .select('token')
        .single()

      if (error) throw error
      return `${window.location.origin}/join/${data.token}`
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function generateRoomInvite(roomId, memberId) {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('invite_tokens')
        .insert({ type: 'room', room_id: roomId, created_by: memberId })
        .select('token')
        .single()

      if (error) throw error
      return `${window.location.origin}/join/${data.token}`
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { generateOfficeInvite, generateRoomInvite, loading, error }
}