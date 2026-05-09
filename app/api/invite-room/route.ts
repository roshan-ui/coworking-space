import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, roomId, roomName, invitedBy } = await req.json()

    // Create invite token for this room
    const { data: tokenData, error: tokenError } = await supabase
      .from('invite_tokens')
      .insert({ type: 'room', room_id: roomId, created_by: invitedBy })
      .select('token')
      .single()

    if (tokenError) throw tokenError

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${tokenData.token}`

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'cowork.dev <onboarding@resend.dev>',
      to: email,
      subject: `You've been invited to join "${roomName}" on cowork.dev`,
      html: `
        <div style="font-family: 'Times New Roman', serif; background: #000; color: #fff; padding: 48px; max-width: 480px; margin: 0 auto;">
          <div style="font-size: 13px; letter-spacing: 0.15em; color: #666; margin-bottom: 32px;">COWORK.DEV</div>
          <h2 style="font-size: 24px; margin: 0 0 16px; font-style: italic;">${invitedBy} invited you to a room.</h2>
          <p style="color: #888; font-size: 16px; margin: 0 0 32px;">You've been invited to join <strong style="color: #fff;">${roomName}</strong> — a collaborative workspace on cowork.dev.</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #fff; color: #000; padding: 14px 32px; text-decoration: none; font-size: 15px; font-family: 'Times New Roman', serif; font-weight: 700;">Join Room</a>
          <p style="color: #444; font-size: 13px; margin-top: 32px;">Or copy this link: ${inviteUrl}</p>
        </div>
      `,
    })

    if (emailError) throw emailError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Invite error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}