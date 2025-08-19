package com.ssafy.nearzoom.global.auth.oauth2.resolver;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

@Slf4j
public class CustomOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DefaultOAuth2AuthorizationRequestResolver defaultResolver;

    public CustomOAuth2AuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
            clientRegistrationRepository, "/oauth2/authorization");
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request);
        return customizeAuthorizationRequest(request, authorizationRequest);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request, clientRegistrationId);
        return customizeAuthorizationRequest(request, authorizationRequest);
    }

    private OAuth2AuthorizationRequest customizeAuthorizationRequest(
            HttpServletRequest request, OAuth2AuthorizationRequest authorizationRequest) {
        
        if (authorizationRequest == null) {
            return null;
        }

        try {
            // 클라이언트 정보를 state 파라미터에 포함
            String clientParam = request.getParameter("client");
            log.debug("OAuth authorization request client parameter: {}", clientParam);

            if (clientParam != null) {
                // 기존 state에 클라이언트 정보 추가
                Map<String, Object> stateMap = new HashMap<>();
                stateMap.put("client", clientParam);
                
                // 기존 state가 있다면 보존 (보통 CSRF 방지용)
                String originalState = authorizationRequest.getState();
                if (originalState != null) {
                    stateMap.put("original", originalState);
                }

                // JSON → Base64 인코딩
                String stateJson = objectMapper.writeValueAsString(stateMap);
                String encodedState = Base64.getUrlEncoder().withoutPadding().encodeToString(stateJson.getBytes());
                
                log.info("Created custom OAuth state with client info: {}", clientParam);
                log.debug("Encoded state: {}", encodedState);

                return OAuth2AuthorizationRequest.from(authorizationRequest)
                    .state(encodedState)
                    .build();
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to create custom OAuth state", e);
        }

        return authorizationRequest;
    }
}