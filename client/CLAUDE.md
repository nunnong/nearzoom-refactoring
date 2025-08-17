# Claude Code 작업 기록

## PhotoBooth 프로젝트 개발 요약

### 🎯 프로젝트 목표

LiveKit + Yjs를 활용한 실시간 협업 PhotoBooth 애플리케이션 개발

### 📋 주요 구현 내용

## 1. 방장 권한 시스템 (LiveKit 기반)

### 1.1 아키텍처 변경

- **기존**: Yjs 기반 방장 관리 (동기화 이슈 발생)
- **변경**: LiveKit metadata + permissions 기반 방장 관리
- **하이브리드**: LiveKit(권한) + Yjs(상태관리) 병행 사용

### 1.2 구현된 파일들

```
/app/api/connection-details/route.ts     # 첫 참가자 자동 방장 지정
/app/api/transfer-leadership/route.ts    # 방장 권한 이전 API
stores/roomLeaderSlice.ts               # LiveKit 권한 정보만 저장
providers/PhotoBoothProvider.tsx        # LiveKit + Yjs 하이브리드 관리
components/ParticipantList.tsx          # 방장 이전 UI
```

### 1.3 핵심 로직

```typescript
// 첫 참가자 방장 지정
const isFirstParticipant = await checkIfFirstParticipant(roomName)
const roleMetadata = {
  role: isFirstParticipant ? 'host' : 'participant',
}
const grant: VideoGrant = {
  roomAdmin: isFirstParticipant, // 방장 권한
  // ...
}

// 방장 자동 이전 (방장이 나갔을 때)
room.on('participantDisconnected', participant => {
  if (isHost(participant)) {
    assignNewHost() // 다음 참가자를 방장으로 지정
  }
})
```

## 2. Slice 기반 상태 관리 아키텍처

### 2.1 구조 설계

```
stores/photobooth/
├── index.ts              # 통합 WebSocket & exports
├── stateSlice.ts         # PhotoBooth 상태 (WAITING/SHOOTING/SELECTING)
├── frameSlice.ts         # 프레임 색상 관리
├── cutSlice.ts           # 컷 수/인덱스 관리
├── photoSlice.ts         # 선택된 사진 관리
├── shootingSlice.ts      # 촬영 및 캡쳐 관리
└── roomLeaderSlice.ts    # 방장 정보 (상위 폴더)
```

### 2.2 Single Source of Truth (Yjs)

```typescript
// 모든 상태 변경은 Yjs를 통해서만
setPhotoBoothState: (state: PhotoBoothState) => {
  // Yjs에 상태 업데이트 (자동으로 모든 참가자에게 동기화)
  const { updatePhotoBoothState } = require('./index')
  updatePhotoBoothState(roomName, state)
  // 로컬 store는 Yjs 변경사항 감지를 통해 자동 업데이트
}
```

### 2.3 Yjs ↔ Zustand 양방향 동기화

```typescript
// PhotoBoothProvider.tsx
const onPhotoBoothUpdate = (data: any) => {
  // Yjs 변경사항을 Zustand store에 자동 반영
  if (data.photoBoothState !== undefined) {
    store.setState({ photoBoothState: data.photoBoothState })
  }
  // ... 다른 slice들도 동일하게
}
```

## 3. PhotoShoot 촬영 시스템

### 3.1 Konva.js 캔버스 구현

```
components/photoshoot/
├── PhotoCanvas.tsx           # Konva.js 캔버스 (ScreenShareArea 대체)
├── PhotoshootComponent.tsx   # 촬영 컨트롤러
└── Timer.tsx                # 기존 타이머 재활용
```

### 3.2 촬영 플로우

```
방장이 "📸 촬영하기" 버튼 클릭
    ↓
startShooting(5) → Yjs 동기화
    ↓
모든 참가자 화면에 Timer 카운트다운 (5, 4, 3, 2, 1)
    ↓
0초 도달 → PhotoCanvas에서 자동 캡쳐 (toDataURL())
    ↓
completeCapture(imageData) → 방장만 localStorage 저장
    ↓
다음 컷으로 자동 이동 (nextCut())
```

### 3.3 Next.js Konva Dynamic Import

```typescript
// SSR 이슈 해결
const PhotoCanvas = dynamic(() => import('./PhotoCanvas'), {
  ssr: false, // SSR 비활성화
  loading: () => <LoadingSpinner /> // 로딩 UI
})

// PhotoCanvas.tsx
const [mounted, setMounted] = useState(false)
if (!mounted) return <LoadingIndicator />
```

## 4. 방장 전용 사진 저장 시스템

### 4.1 LocalStorage 구현

```
utils/photoStorage.ts
├── savePhotosToStorage()     # 사진 배열 저장
├── loadPhotosFromStorage()   # 사진 배열 로드
├── addPhotoToStorage()       # 단일 사진 추가
└── clearPhotosFromStorage()  # 방별 사진 삭제
```

### 4.2 권한 기반 저장

```typescript
completeCapture: (imageData: string) => {
  if (isRoomLeader) {
    // 방장만: localStorage 저장 + 로컬 상태 업데이트
    const newImages = addPhotoToStorage(roomName, imageData)
    set({ capturedImages: newImages })
  } else {
    // 비방장: 캡쳐 상태만 해제 (사진 접근 불가)
    console.log('📷 Capture completed (Non-host)')
  }
}
```

### 4.3 디버그 패널 갤러리

- **방장 전용** 사진 갤러리 표시
- 2x2 그리드 썸네일 뷰
- localStorage 사진 관리 기능

## 5. 디버깅 시스템

### 5.1 DebugPanel 컴포넌트

```
components/DebugPanel.tsx
├── 실시간 상태 모니터링    # 모든 PhotoBooth 상태 표시
├── 인터랙티브 컨트롤      # 상태 직접 변경 가능
├── 방장 전용 사진 갤러리   # localStorage 사진 관리
└── 개발자 도구           # 상태 로깅, 리셋 기능
```

### 5.2 개발 환경 전용

```typescript
// 개발 환경에서만 표시
if (process.env.NODE_ENV !== 'development') {
  return null
}
```

## 6. 핵심 기술 스택

### 6.1 실시간 통신

- **LiveKit**: 방장 권한 관리, 비디오/오디오 스트림
- **Yjs**: 상태 동기화, 협업 기능
- **WebSocket**: Yjs 백엔드 연결

### 6.2 상태 관리

- **Zustand**: 로컬 상태 관리 (UI 캐시)
- **Slice Pattern**: 기능별 상태 모듈화
- **Single Source of Truth**: Yjs가 유일한 상태 원본

### 6.3 UI/렌더링

- **React**: 컴포넌트 기반 UI
- **Konva.js**: 캔버스 렌더링 및 이미지 캡쳐
- **Next.js**: 프레임워크 (Dynamic Import로 SSR 이슈 해결)
- **Tailwind CSS**: 스타일링

### 6.4 데이터 저장

- **LocalStorage**: 방장 전용 사진 저장
- **Base64**: 이미지 데이터 형식

## 7. 주요 해결 과제

### 7.1 동기화 이슈

- **문제**: "누구도 방장이 되지 않는" 상황
- **해결**: Yjs → LiveKit metadata 기반 권한 관리

### 7.2 키 불일치 문제

- **문제**: Yjs 저장/로드 키 불일치로 상태 동기화 실패
- **해결**: 일관된 키 네이밍 (`photoBoothState` 통일)

### 7.3 Next.js SSR 이슈

- **문제**: Konva.js 서버 사이드 렌더링 오류
- **해결**: Dynamic Import + 클라이언트 전용 렌더링

## 8. 최종 완성 기능

### ✅ 방장 시스템

- 첫 참가자 자동 방장 지정
- 방장 권한 이전 (UI + API)
- 방장이 나가면 자동으로 다음 참가자가 방장됨
- START 버튼 방장 전용

### ✅ 실시간 촬영

- 방장이 촬영 버튼 클릭 → 모든 참가자 카운트다운 동기화
- Konva 캔버스에서 이미지 캡쳐
- 프레임 색상 실시간 반영

### ✅ 사진 관리

- 방장만 캡처된 사진 localStorage 저장
- 브라우저 새로고침 시 사진 복구
- 디버그 패널에서 사진 갤러리 확인

### ✅ 개발 도구

- 실시간 상태 모니터링
- 모든 PhotoBooth 기능 테스트 가능
- 개발 환경 전용 디버그 패널

## 9. 실행 명령어

### 개발 서버 실행

```bash
cd /home/catch/s_project/S13P11A605/client
pnpm run dev
```

### 린트 및 타입체크 (구현 후 실행 권장)

```bash
pnpm run lint
pnpm run typecheck  # 존재하는 경우
```

## 10. 향후 확장 가능성

### 10.1 추가 기능

- 사진 서버 업로드 (현재는 localStorage)
- 참가자 웹캠 PhotoCanvas 통합
- 다양한 프레임 템플릿
- 사진 편집 기능

### 10.2 성능 최적화

- 이미지 압축 및 최적화
- 대용량 사진 처리
- 메모리 사용량 최적화

### 10.3 UI/UX 개선

- 촬영 진행 상태 시각화
- 사진 미리보기 개선
- 모바일 반응형 대응

---

**🎉 프로젝트 완료**: 실시간 협업 PhotoBooth 시스템 구축 완료!
