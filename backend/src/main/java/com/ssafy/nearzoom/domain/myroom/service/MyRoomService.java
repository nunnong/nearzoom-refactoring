package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

public interface MyRoomService {

    MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond);

    void updateHeart(Authentication authentication, HeartUpdateRequest request);

    void deletePhoto(Authentication authentication, PhotoDeleteRequest request);

    void saveEditedPhoto(Authentication authentication, PhotoEditSaveRequest request);

    /**
     * 편집된 이미지 업로드 및 저장
     * 
     * @param file 편집된 이미지 파일
     * @param originalPhotoId 원본 사진 ID  
     * @param authentication 사용자 인증 정보
     * @param description 편집본 설명 (선택사항)
     * @return 저장된 편집본 정보
     */
    String uploadEditedImage(MultipartFile file, Long originalPhotoId, Authentication authentication, String description);

}
