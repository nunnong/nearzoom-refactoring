import Resizer from 'react-image-file-resizer'

export const resizeImage = (file: File): Promise<Blob> => {
  return new Promise(resolve => {
    Resizer.imageFileResizer(
      file,
      1600, // maxWidth (고해상도)
      1600, // maxHeight (고해상도)
      'PNG', // PNG 포맷 (투명도 유지)
      90, // 품질 90% (고품질)
      0, // 회전 없음
      result => {
        resolve(result as Blob)
      },
      'blob' // Blob 타입으로 반환
    )
  })
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
