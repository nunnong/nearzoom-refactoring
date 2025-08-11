package com.ssafy.nearzoom.domain.user.service;

import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.service.RefreshTokenService;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public void logOut(Authentication authentication) {

        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();

        refreshTokenService.delete(email);
    }

    @Transactional(readOnly = true)
    public UserInfoResponse getUserInfo(Authentication authentication) {

        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);

        String nickname = user.getUserName();
        String profileImage = user.getProfileImage();

        return new UserInfoResponse(nickname, email, profileImage);
    }

    @Transactional(readOnly = true)
    public List<UserInfoResponse> getFeedUserInfo(String email) {
        return userRepository.findByUserEmail(email).stream()
            .map(user -> new UserInfoResponse(
                user.getUserName(),
                user.getUserEmail(),
                user.getProfileImage()
            ))
            .toList();
    }

    @Transactional
    public void signOut(Authentication authentication) {
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);

        user.markDeleted();
        userRepository.save(user);

        refreshTokenService.delete(email);
    }

    @Transactional
    public void updatePrettyFace(Authentication authentication, String prettyFaceUrl) {
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);
        user.updatePrettyFace(prettyFaceUrl);
    }
}
