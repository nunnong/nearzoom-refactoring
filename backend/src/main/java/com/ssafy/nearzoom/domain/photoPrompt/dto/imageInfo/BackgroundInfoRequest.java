package com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo;

public record BackgroundInfoRequest(
    Long roomId,
    String backgroundType,         // "color" or "prompt"
    String colorValue,            // 단색인 경우
    String promptText,             // 프롬프트인 경우
    String imageUrl
) {}
