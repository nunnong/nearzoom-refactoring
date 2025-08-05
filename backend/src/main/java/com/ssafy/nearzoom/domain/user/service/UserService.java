package com.ssafy.nearzoom.domain.user.service;

import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.auth.jwt.service.RefreshTokenService;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final JWTUtil jwtUtil;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    public void logout(Authentication authentication) {

        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();

        refreshTokenService.delete(email);
    }

    public UserInfoResponse getUserInfo(String email, Social social) {

        User user = userRepository.getByEmailAndSocial(email, social);

        String nickname = user.getUserName();
        String profileImage = user.getProfileImage();

        return new UserInfoResponse(nickname, email, profileImage);
    }

    @Transactional
    public void signout(Authentication authentication) {
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);

        user.markDeleted();
        refreshTokenService.delete(email);
    }
}
