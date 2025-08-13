package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.*;
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

    /**
     * 🆕 마이룸 사진을 피드 게시물로 업로드하기 위한 정보 조회
     */
    PhotoForFeedUploadResponse getPhotoForFeedUpload(Long photoId, Authentication authentication);
}