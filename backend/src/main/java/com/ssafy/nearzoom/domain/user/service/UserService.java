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

    public UserInfoResponse getUserInfo(Authentication authentication) {

        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);

        String nickname = user.getUserName();
        String profileImage = user.getProfileImage();
        String faceImageUrl = user.getPrettyFace();

        return new UserInfoResponse(nickname, email, profileImage, faceImageUrl);
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

    @Transactional
    public void updatePrettyFace(Authentication authentication, String prettyFaceUrl) {
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        System.out.println("prettyFaceUrl = " + prettyFaceUrl);
        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);
        user.updatePrettyFace(prettyFaceUrl);
    }


    @Transactional
    public String getPrettyFace(Authentication authentication) {
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);
        String prettyFaceUrl = user.getPrettyFace();

        return prettyFaceUrl;
    }
}
