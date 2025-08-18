package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoForFeedUploadResponse;
import org.springframework.security.core.Authentication;

public interface MyRoomService {

    MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond);

    void updateHeart(Authentication authentication, HeartUpdateRequest request);

    void deletePhoto(Authentication authentication, PhotoDeleteRequest request);

    String saveEditedImageUrl(PhotoEditSaveRequest request, Authentication authentication);

    PhotoForFeedUploadResponse getPhotoForFeedUpload(Long photoId, Authentication authentication);
}