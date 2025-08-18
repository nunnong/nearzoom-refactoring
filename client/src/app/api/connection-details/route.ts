import { ConnectionDetails } from '@/components/page/room/types/livekit'
import {
  getLiveKitURL,
  randomString,
} from '@/components/page/room/utils/livekit'
import {
  AccessToken,
  AccessTokenOptions,
  VideoGrant,
  RoomServiceClient,
} from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.LIVEKIT_API_KEY
const API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.LIVEKIT_URL

const COOKIE_KEY = 'random-participant-postfix'

export async function GET(request: NextRequest) {
  try {
    // 환경 변수 디버깅
    console.log('🔧 Environment variables check:', {
      LIVEKIT_API_KEY: API_KEY ? '✅ Set' : '❌ Not set',
      LIVEKIT_API_SECRET: API_SECRET ? '✅ Set' : '❌ Not set',
      LIVEKIT_URL: LIVEKIT_URL ? '✅ Set' : '❌ Not set',
    })

    // Parse query parameters
    const roomName = request.nextUrl.searchParams.get('roomName')
    const participantName = request.nextUrl.searchParams.get('participantName')
    const metadata = request.nextUrl.searchParams.get('metadata') ?? ''
    const faceImageUrl = request.nextUrl.searchParams.get('faceImageUrl') ?? ''
    const region = request.nextUrl.searchParams.get('region')

    console.log('📝 Request parameters:', {
      roomName,
      participantName,
      faceImageUrl: faceImageUrl ? 'provided' : 'empty',
      region,
    })

    if (!LIVEKIT_URL) {
      console.error('❌ LIVEKIT_URL is not defined')
      throw new Error('LIVEKIT_URL is not defined')
    }
    const livekitServerUrl = region
      ? getLiveKitURL(LIVEKIT_URL, region)
      : LIVEKIT_URL
    let randomParticipantPostfix = request.cookies.get(COOKIE_KEY)?.value
    if (livekitServerUrl === undefined) {
      throw new Error('Invalid region')
    }

    if (typeof roomName !== 'string') {
      return new NextResponse('Missing required query parameter: roomName', {
        status: 400,
      })
    }
    if (participantName === null) {
      return new NextResponse(
        'Missing required query parameter: participantName',
        { status: 400 }
      )
    }

    // Generate participant token
    if (!randomParticipantPostfix) {
      randomParticipantPostfix = randomString(4)
    }

    // Check if this is the first participant (to assign host role)
    const isFirstParticipant = await checkIfFirstParticipant(roomName)

    // Set role metadata with face image URL
    const roleMetadata = {
      role: isFirstParticipant ? 'host' : 'participant',
      faceImageUrl: faceImageUrl || '',
    }

    console.log(`🎭 Setting metadata for ${participantName}:`, {
      role: roleMetadata.role,
      faceImageUrl: roleMetadata.faceImageUrl ? 'provided' : 'empty',
    })

    const participantToken = await createParticipantToken(
      {
        identity: `${participantName}__${randomParticipantPostfix}`,
        name: participantName,
        metadata: JSON.stringify(roleMetadata),
      },
      roomName,
      isFirstParticipant // Pass host status for permissions
    )

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: livekitServerUrl,
      roomName: roomName,
      participantToken: participantToken,
      participantName: participantName,
    }
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE_KEY}=${randomParticipantPostfix}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`,
      },
    })
  } catch (error) {
    console.error('❌ API Error:', error)

    if (error instanceof Error) {
      // 더 구체적인 에러 메시지
      let errorMessage = error.message
      let statusCode = 500

      if (error.message.includes('LIVEKIT_URL is not defined')) {
        errorMessage = 'LiveKit 서버 URL이 설정되지 않았습니다.'
        statusCode = 500
      } else if (error.message.includes('Invalid region')) {
        errorMessage = '잘못된 지역 설정입니다.'
        statusCode = 400
      } else if (
        error.message.includes('API_KEY') ||
        error.message.includes('API_SECRET')
      ) {
        errorMessage = 'LiveKit 인증 정보가 설정되지 않았습니다.'
        statusCode = 500
      }

      console.error(`❌ Returning error: ${statusCode} - ${errorMessage}`)
      return new NextResponse(errorMessage, { status: statusCode })
    }

    console.error('❌ Unknown error type:', error)
    return new NextResponse('알 수 없는 오류가 발생했습니다.', { status: 500 })
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  isHost: boolean = false
) {
  const at = new AccessToken(API_KEY, API_SECRET, userInfo)
  at.ttl = '5m'
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    roomAdmin: isHost, // Give admin permissions to host
  }
  at.addGrant(grant)
  return at.toJwt()
}

// Function to check if this is the first participant in the room
async function checkIfFirstParticipant(roomName: string): Promise<boolean> {
  if (!API_KEY || !API_SECRET || !LIVEKIT_URL) {
    console.error('LiveKit credentials not configured')
    return false
  }

  try {
    const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET)
    const participants = await roomService.listParticipants(roomName)

    console.log(
      `🎯 Room ${roomName} has ${participants.length} existing participants`
    )
    return participants.length === 0
  } catch (error) {
    // If room doesn't exist or has no participants, this is the first participant
    console.log(
      `🎯 Room ${roomName} doesn't exist or has no participants, assigning host role`
    )
    return true
  }
}

function getCookieExpirationTime(): string {
  var now = new Date()
  var time = now.getTime()
  var expireTime = time + 60 * 120 * 1000
  now.setTime(expireTime)
  return now.toUTCString()
}
