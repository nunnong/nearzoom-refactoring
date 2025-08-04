package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
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
        String email = authUtil.getUserEmail(authentication);
        Long userId = userRepository.getByEmail(email).getUserId();

        List<MyPhotoResponse> photos = photoRepository.findPhotosByCondition(userId, cond);
        boolean hasNext = photos.size() == cond.limit();
        Long nextCursor = hasNext ? photos.get(photos.size() - 1).photoId() : null;

        return new MyPhotoListResponse(photos, hasNext, nextCursor);
    }

    @Override
    public void updateHeart(Authentication authentication, HeartUpdateRequest request) {
        String email = authUtil.getUserEmail(authentication);
        Long userId = userRepository.getByEmail(email).getUserId();

        photoRepository.updateHeart(userId, request.photoId(), request.heart());
    }

    @Override
    public void deletePhoto(Authentication authentication, PhotoDeleteRequest request) {
        String email = authUtil.getUserEmail(authentication);
        Long userId = userRepository.getByEmail(email).getUserId();

        photoRepository.softDeletePhoto(userId, request.photoId());
    }

    @Override
    public void saveEditedPhoto(Authentication authentication, PhotoEditSaveRequest request) {
        String email = authUtil.getUserEmail(authentication);
        Long userId = userRepository.getByEmail(email).getUserId();

        photoRepository.markAsEdited(userId, request.photoId());
    }
}
