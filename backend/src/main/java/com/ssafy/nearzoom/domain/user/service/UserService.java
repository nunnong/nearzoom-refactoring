package com.ssafy.nearzoom.domain.user.service;

import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.auth.jwt.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final JWTUtil jwtUtil;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    public void logout(String accessToken) {

        String email = jwtUtil.getEmail(accessToken);
        refreshTokenService.delete(email);
    }

    public UserInfoResponse getUserInfo(String email) {

        User user = userRepository.getByEmail(email);

        String nickname = user.getUserName();
        String profileImage = user.getProfileImage();

        return new UserInfoResponse(nickname, email, profileImage);
    }

    @Transactional
    public void signout(String accessToken) {
        String email = jwtUtil.getEmail(accessToken);
        User user = userRepository.getByEmail(email);
        user.markDeleted();
        refreshTokenService.delete(email);
    }
}
