package com.ssafy.nearzoom.global.auth.oauth2.service;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.oauth2.dto.CustomOAuth2User;
import com.ssafy.nearzoom.global.auth.oauth2.dto.GoogleResponse;
import com.ssafy.nearzoom.global.auth.oauth2.dto.KakaoResponse;
import com.ssafy.nearzoom.global.auth.oauth2.dto.OAuth2Response;
import com.ssafy.nearzoom.global.auth.oauth2.dto.OAuth2UserDto;
import com.ssafy.nearzoom.global.auth.oauth2.exception.SocialMismatchException;
import com.ssafy.nearzoom.global.auth.oauth2.exception.UnsupportedOAuth2ProviderException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        OAuth2Response oAuth2Response;

        switch (registrationId) {
            case "kakao":
                oAuth2Response = new KakaoResponse(oAuth2User.getAttributes());
                break;
            case "google":
                oAuth2Response = new GoogleResponse(oAuth2User.getAttributes());
                break;
            default:
                throw new UnsupportedOAuth2ProviderException();
        }

        String name = oAuth2Response.getName();
        String email = oAuth2Response.getEmail();
        Social social = Social.valueOf(registrationId.toUpperCase());
        String profileImage = oAuth2Response.getProfileImage();

        User user = userRepository.findByUserEmailAndSocialTypeAndDeletedAtIsNull(email, social)
            .map(existing -> {
                // 기존 사용자 업데이트
                existing.update(oAuth2Response);

                // ✨ 계정명이 없는 기존 사용자인 경우 초기화
                if (existing.getAccountName() == null || existing.getAccountName().isEmpty()) {
                    existing.initializeAccountName();
                    System.out.println("🔄 기존 사용자 계정명 초기화: " + existing.getAccountName());
                }

                return existing;
            })
            .orElseGet(() ->
                userRepository.findByUserEmailAndSocialType(email, social)
                    .map(deletedUser -> {
                        // 소셜 타입 불일치 체크
                        if (deletedUser.getSocialType() != social) {
                            throw new SocialMismatchException(email, deletedUser.getSocialType());
                        }

                        // 삭제된 사용자 복원
                        deletedUser.restore();
                        deletedUser.update(oAuth2Response);

                        // ✨ 복원된 사용자의 계정명이 없는 경우 초기화
                        if (deletedUser.getAccountName() == null || deletedUser.getAccountName().isEmpty()) {
                            deletedUser.initializeAccountName();
                            System.out.println("🔄 복원된 사용자 계정명 초기화: " + deletedUser.getAccountName());
                        }

                        return deletedUser;
                    })
                    .orElseGet(() -> {
                        // ✨ 새로운 사용자 생성
                        User newUser = oAuth2Response.toEntity();

                        // 계정명 초기화 (이메일 기반)
                        newUser.initializeAccountName();

                        // 계정명 중복 체크 및 고유 번호 추가
                        String baseAccountName = newUser.getAccountName();
                        String uniqueAccountName = generateUniqueAccountName(baseAccountName);

                        if (!baseAccountName.equals(uniqueAccountName)) {
                            // 중복된 경우 고유 번호가 추가된 계정명으로 설정
                            newUser.updateAccountName(uniqueAccountName);
                        }

                        System.out.println("✨ 새로운 사용자 생성 - 이메일: " + email + ", 계정명: " + newUser.getAccountName());

                        return newUser;
                    })
            );

        userRepository.save(user);

        OAuth2UserDto oAuth2UserDto = new OAuth2UserDto(name, email, profileImage, social, "USER");
        return new CustomOAuth2User(oAuth2UserDto);
    }

    /**
     * 중복되지 않는 고유한 계정명 생성
     */
    private String generateUniqueAccountName(String baseAccountName) {
        String accountName = baseAccountName;
        int counter = 1;

        // 계정명이 중복되는 경우 숫자를 붙여서 고유하게 만듦
        while (userRepository.existsByAccountName(accountName)) {
            accountName = baseAccountName + counter;
            counter++;

            // 무한 루프 방지 (최대 1000번 시도)
            if (counter > 1000) {
                // 타임스탬프를 붙여서 완전히 고유하게 만듦
                accountName = baseAccountName + System.currentTimeMillis() % 10000;
                break;
            }
        }

        if (!baseAccountName.equals(accountName)) {
            System.out.println("🔄 계정명 중복으로 인한 변경: " + baseAccountName + " → " + accountName);
        }

        return accountName;
    }
}