interface PreviewProps {
  cutCount: number;
  selectedPhotos: string[];
  frameColor: string;
  backgroundColor?: string; // 배경색 추가
  currentPhotoIndex?: number; // 현재 선택된 사진 인덱스
  showPhotos?: boolean; // 사진 표시 여부 (기본값: true)
  className?: string;
}

export default function Preview({
  cutCount,
  selectedPhotos,
  frameColor,
  backgroundColor,
  currentPhotoIndex,
  showPhotos = true,
  className = "",
}: PreviewProps) {
  // 1컷 프레임
  if (cutCount === 1) {
    return (
      <div className={`mx-auto ${className}`} style={{ width: '100px' }}>
        <svg 
          width="100" 
          height="132" 
          viewBox="0 0 1230 1628" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="shadow-sm"
        >
          {/* 외부 프레임 */}
          <rect width="1230" height="1628" fill={frameColor}/>
          
          {/* 사진 영역 */}
          <rect x="103" y="103" width="1024" height="1024" fill={backgroundColor || "#f3f4f6"}/>
          
          {/* 선택된 사진이 있으면 표시 */}
          {showPhotos && selectedPhotos[0] && (
            <image
              href={selectedPhotos[0]}
              x="103"
              y="103"
              width="1024"
              height="1024"
              preserveAspectRatio="xMidYMid slice"
            />
          )}
          
          {/* 사진이 없거나 showPhotos가 false면 번호 표시 */}
          {(!showPhotos || !selectedPhotos[0]) && (
            <text
              x="615"
              y="630"
              textAnchor="middle"
              fontSize="120"
              fill="#9ca3af"
              fontWeight="500"
            >
              1
            </text>
          )}
        </svg>
      </div>
    );
  }
  
  // 2컷 프레임
  else if (cutCount === 2) {
    return (
      <div className={`mx-auto ${className}`} style={{ width: '100px' }}>
        <svg 
          width="100" 
          height="222" 
          viewBox="0 0 1230 2735" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="shadow-sm"
        >
          {/* 외부 프레임들 */}
          <rect width="1230" height="1190" fill={frameColor}/>
          <rect y="1107" width="1230" height="1628" fill={frameColor}/>
          
          {/* 첫 번째 사진 영역 */}
          <rect x="103" y="103" width="1024" height="1024" fill={currentPhotoIndex === 0 && backgroundColor ? backgroundColor : "#f3f4f6"}/>
          {showPhotos && selectedPhotos[0] && (
            <image
              href={selectedPhotos[0]}
              x="103"
              y="103"
              width="1024"
              height="1024"
              preserveAspectRatio="xMidYMid slice"
            />
          )}
          {(!showPhotos || !selectedPhotos[0]) && (
            <text
              x="615"
              y="630"
              textAnchor="middle"
              fontSize="120"
              fill="#9ca3af"
              fontWeight="500"
            >
              1
            </text>
          )}
          
          {/* 두 번째 사진 영역 */}
          <rect x="103" y="1210" width="1024" height="1024" fill={currentPhotoIndex === 1 && backgroundColor ? backgroundColor : "#f3f4f6"}/>
          {showPhotos && selectedPhotos[1] && (
            <image
              href={selectedPhotos[1]}
              x="103"
              y="1210"
              width="1024"
              height="1024"
              preserveAspectRatio="xMidYMid slice"
            />
          )}
          {(!showPhotos || !selectedPhotos[1]) && (
            <text
              x="615"
              y="1737"
              textAnchor="middle"
              fontSize="120"
              fill="#9ca3af"
              fontWeight="500"
            >
              2
            </text>
          )}
        </svg>
      </div>
    );
  }
  
  // 4컷 프레임
  else {
    return (
      <div className={`mx-auto ${className}`} style={{ width: '100px' }}>
        <svg 
          width="100" 
          height="402" 
          viewBox="0 0 1230 4949" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="shadow-sm"
        >
          {/* 외부 프레임들 */}
          <rect width="1230" height="1190" fill={frameColor}/>
          <rect y="2214" width="1230" height="1190" fill={frameColor}/>
          <rect y="3321" width="1230" height="1628" fill={frameColor}/>
          <rect y="1107" width="1230" height="1190" fill={frameColor}/>
          
          {/* 사진 영역들과 이미지/텍스트 */}
          {[
            { x: 103, y: 103, index: 0 },
            { x: 103, y: 1210, index: 1 },
            { x: 103, y: 2317, index: 2 },
            { x: 103, y: 3424, index: 3 }
          ].map(({ x, y, index }) => (
            <g key={index}>
              {/* 사진 배경 */}
              <rect 
                x={x} 
                y={y} 
                width="1024" 
                height="1024" 
                fill={currentPhotoIndex === index && backgroundColor ? backgroundColor : "#f3f4f6"}
              />
              
              {/* 선택된 사진이 있으면 표시 */}
              {showPhotos && selectedPhotos[index] && (
                <image
                  href={selectedPhotos[index]}
                  x={x}
                  y={y}
                  width="1024"
                  height="1024"
                  preserveAspectRatio="xMidYMid slice"
                />
              )}
              
              {/* 사진이 없거나 showPhotos가 false면 번호 표시 */}
              {(!showPhotos || !selectedPhotos[index]) && (
                <text
                  x={x + 512}
                  y={y + 527}
                  textAnchor="middle"
                  fontSize="120"
                  fill="#9ca3af"
                  fontWeight="500"
                >
                  {index + 1}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  }
}