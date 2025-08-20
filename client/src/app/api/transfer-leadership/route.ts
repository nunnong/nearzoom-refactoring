import { RoomServiceClient } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.LIVEKIT_API_KEY
const API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.LIVEKIT_URL

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !API_SECRET || !LIVEKIT_URL) {
      return new NextResponse('LiveKit credentials not configured', { status: 500 })
    }

    const { roomName, fromParticipant, toParticipant } = await request.json()

    if (!roomName || !fromParticipant || !toParticipant) {
      return new NextResponse('Missing required fields: roomName, fromParticipant, toParticipant', { 
        status: 400 
      })
    }

    const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET)

    console.log(`🔄 Transferring leadership in room ${roomName} from ${fromParticipant} to ${toParticipant}`)

    // Update old leader - remove host role and admin permissions
    try {
      await roomService.updateParticipant(roomName, fromParticipant, {
        metadata: JSON.stringify({ role: "participant" }),
        permission: {
          canPublish: true,
          canPublishData: true,
          canSubscribe: true,
          roomAdmin: false,
        }
      })
      console.log(`✅ Removed host role from ${fromParticipant}`)
    } catch (error) {
      console.error(`❌ Failed to remove host role from ${fromParticipant}:`, error)
      // Continue anyway - the new leader assignment is more important
    }

    // Update new leader - add host role and admin permissions
    try {
      await roomService.updateParticipant(roomName, toParticipant, {
        metadata: JSON.stringify({ role: "host" }),
        permission: {
          canPublish: true,
          canPublishData: true,
          canSubscribe: true,
          roomAdmin: true,
        }
      })
      console.log(`✅ Assigned host role to ${toParticipant}`)
    } catch (error) {
      console.error(`❌ Failed to assign host role to ${toParticipant}:`, error)
      return new NextResponse(`Failed to assign host role to ${toParticipant}`, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Leadership transferred from ${fromParticipant} to ${toParticipant}` 
    })

  } catch (error) {
    console.error('Leadership transfer error:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to transfer leadership',
      { status: 500 }
    )
  }
}
