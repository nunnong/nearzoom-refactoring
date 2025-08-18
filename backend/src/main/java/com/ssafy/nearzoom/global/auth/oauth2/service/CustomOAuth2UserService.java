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
                existing.update(oAuth2Response);

                if (existing.getAccountName() == null || existing.getAccountName().isEmpty()) {
                    existing.initializeAccountName();
                }

                return existing;
            })
            .orElseGet(() ->
                userRepository.findByUserEmailAndSocialType(email, social)
                    .map(deletedUser -> {
                        if (deletedUser.getSocialType() != social) {
                            throw new SocialMismatchException(email, deletedUser.getSocialType());
                        }

                        deletedUser.restore();
                        deletedUser.update(oAuth2Response);

                        if (deletedUser.getAccountName() == null || deletedUser.getAccountName()
                            .isEmpty()) {
                            deletedUser.initializeAccountName();
                        }

                        return deletedUser;
                    })
                    .orElseGet(() -> {
                        User newUser = oAuth2Response.toEntity();

                        newUser.initializeAccountName();

                        String baseAccountName = newUser.getAccountName();
                        String uniqueAccountName = generateUniqueAccountName(baseAccountName);

                        if (!baseAccountName.equals(uniqueAccountName)) {
                            newUser.updateAccountName(uniqueAccountName);
                        }
                        return newUser;
                    })
            );

        userRepository.save(user);

        OAuth2UserDto oAuth2UserDto = new OAuth2UserDto(name, email, profileImage, social, "USER");
        return new CustomOAuth2User(oAuth2UserDto);
    }

    private String generateUniqueAccountName(String baseAccountName) {
        String accountName = baseAccountName;
        int counter = 1;

        while (userRepository.existsByAccountName(accountName)) {
            accountName = baseAccountName + counter;
            counter++;

            if (counter > 1000) {
                accountName = baseAccountName + System.currentTimeMillis() % 10000;
                break;
            }
        }
        return accountName;
    }
}