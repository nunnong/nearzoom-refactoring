import RoomPage from '@/components/page/room/RoomPage'

export default async function Page({
  params,
}: {
  params: Promise<{ roomname: string }>
}) {
  const _params = await params

  return <RoomPage roomName={_params.roomname} />
}
