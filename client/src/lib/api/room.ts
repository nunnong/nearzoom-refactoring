import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://www.nearzoom.store'
    : 'http://localhost:8080';

// 🔥 강화된 디버깅이 포함된 토큰 가져오기 함수
// room.ts - getAuthHeaders 함수 수정
const getAuthHeaders = () => {
  console.log('=== getAuthHeaders 호출됨 ===');
  
  let token = null;
  
  if (typeof window !== 'undefined') {
    try {
      const authState = useAuthStore.getState();
      console.log('Zustand store 전체 상태:', authState);
      
      token = authState.accessToken;
      
      // 🔥 토큰 유효성 검사 추가
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          
          console.log('토큰 만료 시간:', payload.exp);
          console.log('현재 시간:', now);
          
          if (payload.exp <= now) {
            console.error('❌ 토큰이 만료됨');
            // 만료된 토큰 정리
            authState.clearTokens();
            token = null;
            throw new Error('토큰이 만료되었습니다.');
          }
        } catch (tokenError) {
          console.error('토큰 파싱 오류:', tokenError);
          token = null;
        }
      }
      
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
      token = null;
    }
  }
  
  console.log('최종 토큰 결과:', token ? `토큰 있음 (${token.substring(0, 30)}...)` : '토큰 없음');
  
  if (!token) {
    throw new Error('유효한 인증 토큰이 없습니다. 다시 로그인해주세요.');
  }
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
  
  console.log('생성된 헤더:', headers);
  return headers;
};

interface ApiResponse<T> {
    error: boolean;
    message: string;
    data?: T;
}

export interface CreateRoomData {
    roomId: number;
    serverUrl: string;
    participantToken: string;
    participantName: string;
    createdAt: string;
}

export interface JoinRoomData {
    roomId: number;
    serverUrl: string;
    participantToken: string;
    participantName: string;
    createdAt: string;
}

export interface RoomInfoData {
    roomId: number;
    serverUrl: string;
    participants: Array<{
        id: string;
        name: string;
        email: string;
        isHost: boolean;
    }>;
    createdAt: string;
    retrievedAt: string;
}

export const roomAPI = {
    async createRoom(metadata?: string): Promise<CreateRoomData> {
        try {
            console.log('=== 방 생성 API 호출 시작 ===');
            
            // 인증 상태 먼저 확인
            const authState = useAuthStore.getState();
            console.log('방 생성 전 인증 상태 확인:');
            console.log('- isAuthenticated:', authState.isAuthenticated);
            console.log('- user:', authState.user);
            console.log('- accessToken 존재:', !!authState.accessToken);
            
            if (!authState.isAuthenticated || !authState.accessToken) {
                console.error('❌ 인증되지 않은 상태에서 방 생성 시도');
                throw new Error('로그인이 필요합니다');
            }
            
            const headers = getAuthHeaders();
            console.log('API 요청에 사용할 헤더:', headers);
            
            const requestBody = metadata || '{}';
            console.log('요청 본문:', requestBody);
            console.log('요청 URL:', `${API_BASE_URL}/room/create`);
            
            const response = await fetch(`${API_BASE_URL}/room/create`, {
                method: "POST",
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(metadata || '{}'),
            });

            console.log('방 생성 응답 상태:', response.status);
            console.log('방 생성 응답 헤더:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('방 생성 실패 응답 내용:', errorText);
                
                if (response.status === 401) {
                    console.error('🔴 401 에러: 백엔드에서 토큰을 인식하지 못함');
                    console.error('전송된 헤더:', headers);
                    throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
                } else if (response.status === 403) {
                    throw new Error('권한이 없습니다.');
                } else {
                    throw new Error(`방 생성 실패: ${response.status} - ${errorText}`);
                }
            }
            
            const result: ApiResponse<CreateRoomData> = await response.json();
            console.log('방 생성 성공 응답:', result);

            if (result.error) {
                throw new Error(result.message);
            }

            if (!result.data) {
                throw new Error('방 생성 응답에 데이터가 없습니다');
            }

            return result.data;
        } catch (error) {
            console.error("방 생성 api 오류:", error);
            throw error;
        }
    },
    
    async joinRoom(roomId: string | number): Promise<JoinRoomData> {
        try {
            console.log('=== 방 참가 API 호출 시작 ===');
            console.log('참가할 방 ID:', roomId);
            
            const authState = useAuthStore.getState();
            if (!authState.isAuthenticated || !authState.accessToken) {
                console.error('❌ 로그인되지 않은 상태에서 방 참가 시도');
                throw new Error('로그인이 필요합니다');
            }
            
            const headers = getAuthHeaders();
            console.log('요청 헤더:', headers);
            
            const requestBody = { roomId: roomId.toString() };
            console.log('요청 본문:', requestBody);
            
            const response = await fetch(`${API_BASE_URL}/room/join`, {
                method: "POST",
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(requestBody),   
            });

            console.log('방 참가 응답 상태:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('방 참가 실패 응답 내용:', errorText);
                
                if (response.status === 401) {
                    throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
                } else if (response.status === 404) {
                    throw new Error('존재하지 않는 방입니다.');
                } else if (response.status === 403) {
                    throw new Error('방에 참가할 권한이 없습니다.');
                } else {
                    throw new Error(`방 참가 실패: ${response.status} - ${errorText}`);
                }
            }
            
            const result: ApiResponse<JoinRoomData> = await response.json();
            console.log('방 참가 성공 응답:', result);

            if (result.error) {
                throw new Error(result.message);
            }

            if (!result.data) {
                throw new Error('방 참가 응답에 데이터가 없습니다');
            }

            return result.data;
        } catch (error) {
            console.error("방 참가 api 오류:", error);
            throw error;
        }  
    },
    
    async getRoomInfo(roomId: string | number): Promise<RoomInfoData> {
        try {
            console.log('=== 방 정보 조회 API 호출 시작 ===');
            console.log('조회할 방 ID:', roomId);
            
            const authState = useAuthStore.getState();
            if (!authState.isAuthenticated || !authState.accessToken) {
                console.error('❌ 로그인되지 않은 상태에서 방 정보 조회 시도');
                throw new Error('로그인이 필요합니다');
            }
            
            const headers = getAuthHeaders();
            
            const response = await fetch(`${API_BASE_URL}/room/${roomId}/info`, {
                method: "GET",
                headers: headers,
                credentials: 'include',
            });

            console.log('방 정보 조회 응답 상태:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('방 정보 조회 실패 응답 내용:', errorText);
                
                if (response.status === 401) {
                    throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
                } else if (response.status === 404) {
                    throw new Error('존재하지 않는 방입니다.');
                } else {
                    throw new Error(`방 정보 조회 실패: ${response.status} - ${errorText}`);
                }
            }
            
            const result: ApiResponse<RoomInfoData> = await response.json();
            console.log('방 정보 조회 성공 응답:', result);

            if (result.error) {
                throw new Error(result.message);
            }

            if (!result.data) {
                throw new Error('방 정보 조회 응답에 데이터가 없습니다');
            }

            return result.data;
        } catch (error) {
            console.error("방 정보 조회 api 오류:", error);
            throw error;
        }
    }
};

export const generateRoomUrl = (roomId: number | string): string => {
    if(typeof window !== 'undefined'){
        return `${window.location.origin}/room/${roomId}`;
    }
    return `https://www.nearzoom.store/room/${roomId}`;
};

export const getErrorMessage = (error: unknown): string => {
    if(error instanceof Error) {
        return error.message;
    }
    return '알 수 없는 오류가 발생했습니다.';
};