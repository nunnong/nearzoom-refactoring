const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://www.nearzoom.store'
    : 'http://localhost:8080';


interface ApiResponse<T> {
    error: boolean;
    message: string;
    data?: T;
}

//방생성 API 응답 타입 정의
export interface CreateRoomData {
    roomId: number;
    serverUrl: string;
    participantToken: string;
    participantName: string;
    createdAt: string;
}

//방참가 API 응답 타입 정의
export interface JoinRoomData {
    roomId: number;
    serverUrl: string;
    participantToken: string;
    participantName: string;
    createdAt: string;
}

//방정보 조회 API 응답 타입 정의
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
    /**
     * 
     * @param metadata 방 생성 시 추가 메타데이터 (참가자 목록, roomId 등)
     * @returns 
     */

    async createRoom(metadata?: string): Promise<CreateRoomData> {
        try{
            const response = await fetch(`${API_BASE_URL}/room/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    //로그인 완료 후 authentication 토큰 추가해야됨!!
                    // "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(metadata || '{}' ),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result: ApiResponse<CreateRoomData> = await response.json();

            if (result.error) {
                throw new Error(result.message);
            }

            return result.data!;
        }catch (error) {
            console.error("방 생성 api 오류:", error);
            throw error;
        }
    },
    
    /**
     * 
     * @param roomId 방 참가할 방의 ID
     * @returns 
     */
    async joinRoom(roomId: string | number): Promise<JoinRoomData> {
        try {
            const response = await fetch(`${API_BASE_URL}/room/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    //로그인 완료 후 authentication 토큰 추가해야됨!!
                    // "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ roomId: roomId.toString() }),   
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result: ApiResponse<JoinRoomData> = await response.json();

            if (result.error) {
                throw new Error(result.message);
            }

            return result.data!;
        } catch (error) {
            console.error("방 참가 api 오류:", error);
            throw error;
        }  
    },
    
    /**
     * 
     * @param roomId 방 정보 조회할 방의 ID
     * @returns 
     */
    async getRoomInfo(roomId: string | number): Promise<RoomInfoData> {
        try {
            const response = await fetch(`${API_BASE_URL}/room/${roomId}/info`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    //로그인 완료 후 authentication 토큰 추가해야됨!!
                    // "Authorization": `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result: ApiResponse<RoomInfoData> = await response.json();

            if (result.error) {
                throw new Error(result.message);
            }

            return result.data!;
        } catch (error) {
            console.error("방 정보 조회 api 오류:", error);
            throw error;
        }
    }

}

/**
 * 
 * @param roomId 방 ID
 * @returns 방 URL
 */
export const generateRoomUrl = (roomId: number | string): string => {
    if(typeof window !== 'undefined'){
    return `${window.location.origin}/room/${roomId}`
    }
    return `https://www.nearzoom.store/room/${roomId}`;
}

export const getErrorMessage = (error: unknown): string => {
    if(error instanceof Error) {
        return error.message;
    }
    return '알 수 없는 오류가 발생했습니다.';
}