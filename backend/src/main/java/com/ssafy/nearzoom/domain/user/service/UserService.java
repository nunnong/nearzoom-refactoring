package com.ssafy.nearzoom.domain.user.service;

import com.ssafy.nearzoom.domain.user.dto.CheckAccountNameResponse;
import com.ssafy.nearzoom.domain.user.dto.UpdateProfileRequest;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.dto.UserProfileResponse;
import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.auth.jwt.service.RefreshTokenService;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    // =========================================
    // 📝 프로필 관리 기능들 (신규 추가)
    // =========================================

    /**
     * 👤 현재 사용자 프로필 조회 (계정명 포함)
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(Authentication authentication) {
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);

        return new UserProfileResponse(
            user.getUserId(),
            user.getAccountName(),
            user.getUserName(),
            user.getUserEmail(),  // userEmail 필드를 사용
            user.getProfileImage(),
            user.getPrettyFace()
        );
    }

    /**
     * ✏️ 사용자 프로필 업데이트 (계정명만 수정 가능)
     */
    @Transactional
    public void updateProfile(Authentication authentication, UpdateProfileRequest request) {
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);

        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();

        User user = userRepository.getByEmailAndSocial(email, social);

        // 현재 계정명과 동일한지 확인
        if (user.getAccountName().equals(request.accountName())) {
            return; // 변경사항 없음
        }

        // 계정명 중복 확인
        if (userRepository.existsByAccountName(request.accountName())) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 사용중인 계정명입니다.");
        }

        // 계정명 업데이트
        user.updateAccountName(request.accountName());
    }

    /**
     * ✅ 계정명 중복 확인
     */
    @Transactional(readOnly = true)
    public CheckAccountNameResponse checkAccountNameAvailable(String accountName, Authentication authentication) {
        // 현재 사용자 정보 가져오기
        UserAuthInfoResponse userAuthInfo = AuthUtil.getUserAuthInfo(authentication);
        String email = userAuthInfo.email();
        Social social = userAuthInfo.social();
        User currentUser = userRepository.getByEmailAndSocial(email, social);

        // 현재 사용자의 계정명과 동일한 경우
        if (currentUser.getAccountName().equals(accountName)) {
            return CheckAccountNameResponse.available();
        }

        // 다른 사용자가 이미 사용중인지 확인
        if (userRepository.existsByAccountName(accountName)) {
            return CheckAccountNameResponse.unavailable("이미 사용중인 계정명입니다.");
        }

        return CheckAccountNameResponse.available();
    }
}