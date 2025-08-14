package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ProcessingOptions(
    @JsonProperty("type")
    String backgroundType,      // "color" 또는 "prompt"

    @JsonProperty("prompt")
    String promptText,         // prompt용

    @JsonProperty("color")
    String backgroundColor,    // color용
    String promptId           // 추가된 필드
) {
  // 기존 생성자 호환성
  public ProcessingOptions(String backgroundType, String promptText, String backgroundColor) {
    this(backgroundType, promptText, backgroundColor, null);
  }
}
