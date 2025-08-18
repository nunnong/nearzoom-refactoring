export function generateRoomId(): string {
  return `${randomString(4)}-${randomString(4)}`
}

export function randomString(length: number): string {
  let result = ''
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function isLowPowerDevice() {
  return navigator.hardwareConcurrency < 6
}

export function getLiveKitURL(
  projectUrl: string,
  region: string | null
): string {
  const url = new URL(projectUrl)
  if (region && url.hostname.includes('livekit.cloud')) {
    let [projectId, ...hostParts] = url.hostname.split('.')
    if (hostParts[0] !== 'staging') {
      hostParts = ['production', ...hostParts]
    }
    const regionURL = [projectId, region, ...hostParts].join('.')
    url.hostname = regionURL
  }
  return url.toString()
}
