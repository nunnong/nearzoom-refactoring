package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.*;
import org.springframework.security.core.Authentication;
public interface MyRoomService {

    MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond);

    void updateHeart(Authentication authentication, HeartUpdateRequest request);

    void deletePhoto(Authentication authentication, PhotoDeleteRequest request);

    void saveEditedPhoto(Authentication authentication, PhotoEditSaveRequest request);

    /**
     * 편집된 이미지 URL 저장
     *
     * @param request 편집본 저장 요청 DTO
     * @param authentication 사용자 인증 정보
     * @return 저장된 이미지 URL
     */

    String saveEditedImageUrl(PhotoEditSaveRequest request, Authentication authentication);

    /**
     * 🆕 마이룸 사진을 피드 게시물로 업로드하기 위한 정보 조회
     */
    PhotoForFeedUploadResponse getPhotoForFeedUpload(Long photoId, Authentication authentication);
}