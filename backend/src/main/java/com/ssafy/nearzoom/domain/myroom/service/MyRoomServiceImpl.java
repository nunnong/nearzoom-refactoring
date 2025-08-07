package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MyRoomServiceImpl implements MyRoomService {

    private final MyPhotoMapper photoRepository;
    private final UserRepository userRepository;
    private final AuthUtil authUtil;

    @Override
    public MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        System.out.println(">>> [DEBUG] 👤 UserInfo - Email: " + userInfo.email() + ", Social: " + userInfo.social());

        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();
        System.out.println(">>> [DEBUG] 🔍 Found userId: " + userId);

        System.out.println(">>> [DEBUG] 📋 Condition - limit: " + cond.limit() +
            ", cursor: " + cond.cursor() +
            ", heart: " + cond.heart() +
            ", partnerEmails: " + cond.partnerEmails() +
            ", startDate: " + cond.startDate() +
            ", endDate: " + cond.endDate());

        List<MyPhotoResponse> photos = photoRepository.findPhotosByCondition(userId, cond);
        System.out.println(">>> [DEBUG] 📸 MyBatis 쿼리 결과: " + photos.size() + "개");

        if (photos.isEmpty()) {
            System.out.println(">>> [DEBUG] ❌ 사진이 없습니다!");
        } else {
            System.out.println(">>> [DEBUG] ✅ 첫 번째 사진: photoId=" + photos.get(0).photoId() +
                ", imageUrl=" + photos.get(0).imageUrl());
        }

        boolean hasNext = photos.size() == cond.limit();
        Long nextCursor = hasNext ? photos.get(photos.size() - 1).photoId() : null;

        System.out.println(">>> [DEBUG] 📊 최종 응답: photos=" + photos.size() +
            ", hasNext=" + hasNext +
            ", nextCursor=" + nextCursor);

        return new MyPhotoListResponse(photos, hasNext, nextCursor);
    }

    @Override
    public void updateHeart(Authentication authentication, HeartUpdateRequest request) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        photoRepository.updateHeart(userId, request.photoId(), request.heart());
    }

    @Override
    public void deletePhoto(Authentication authentication, PhotoDeleteRequest request) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        photoRepository.softDeletePhoto(userId, request.photoId());
    }

    @Override
    public void saveEditedPhoto(Authentication authentication, PhotoEditSaveRequest request) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        photoRepository.markAsEdited(userId, request.photoId());
    }
}
