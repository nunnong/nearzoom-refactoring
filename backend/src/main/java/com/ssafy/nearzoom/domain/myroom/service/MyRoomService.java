package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

public interface MyRoomService {

    MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond);

    @Service
    @RequiredArgsConstructor
    class MyRoomServiceImpl implements MyRoomService {

        private final MyPhotoMapper photoRepository;
        private final UserRepository userRepository;
        private final AuthUtil authUtil;

        @Override
        public MyPhotoListResponse getMyPhotos(Authentication authentication,
            MyPhotoListCondition cond) {
            String email = authUtil.getUserEmail(authentication);
            System.out.println("🔍 로그인된 사용자 email: " + email);

            Long userId = userRepository.getByEmail(email).getUserId();
            System.out.println("🔍 조회된 user_id: " + userId);
            List<MyPhotoResponse> photos = photoRepository.findPhotosByCondition(userId, cond);

            boolean hasNext = photos.size() == cond.limit();
            Long nextCursor = hasNext ? photos.get(photos.size() - 1).photoId() : null;

            return new MyPhotoListResponse(photos, hasNext, nextCursor);
        }
    }
}
