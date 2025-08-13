package com.ssafy.nearzoom.global.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// config
@Configuration
public class HttpClientConfig {
    @Bean
    public org.springframework.web.client.RestClient restClient(
            org.springframework.web.client.RestClient.Builder builder) {
        return builder.build();
    }
}