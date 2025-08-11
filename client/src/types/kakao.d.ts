declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void
      Auth: {
        logout: () => Promise<void>
      }
      Share: {
        sendCustom: (options: {
          templateId: number
          templateArgs: {
            title: string
            description: string
            imageUrl?: string
          }
        }) => void
      }
    }
  }
}

export {}