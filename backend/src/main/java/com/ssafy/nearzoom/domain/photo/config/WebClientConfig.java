package com.ssafy.nearzoom.domain.photo.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

  @Bean
  @Qualifier("imageServerWebClient")
  public WebClient imageServerWebClient(
      @Value("${image-server.url}") String imageServerUrl) {

    return WebClient.builder()
        .baseUrl(imageServerUrl)
        .defaultHeader("Content-Type", "application/json")
        .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
        .build();
  }
}
