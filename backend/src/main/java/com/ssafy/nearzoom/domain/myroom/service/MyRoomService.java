package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import org.springframework.security.core.Authentication;
public interface MyRoomService {

    MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond);

    void updateHeart(Authentication authentication, HeartUpdateRequest request);

    void deletePhoto(Authentication authentication, PhotoDeleteRequest request);

    void saveEditedPhoto(Authentication authentication, PhotoEditSaveRequest request);

    /**
     * 편집된 이미지 URL 저장
     * 
     * @param imageUrl 편집된 이미지 URL
     * @param originalPhotoId 원본 사진 ID  
     * @param authentication 사용자 인증 정보
     * @return 저장된 이미지 URL
     */
    String saveEditedImageUrl(String imageUrl, Long originalPhotoId, Authentication authentication);

}
