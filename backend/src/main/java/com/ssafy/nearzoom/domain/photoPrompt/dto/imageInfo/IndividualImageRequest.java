package com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo;

import java.util.List;

public record IndividualImageRequest(
    Long roomId,
    int imageOrder,          // 0, 1, 2, 3 순서
    String imageUrl,
    List<String> personIds,
    String backgroundType,   // "solid" 또는 "prompt"
    String colorValue,       // backgroundType이 "solid"일 때
    String promptText        // backgroundType이 "prompt"일 때
) {}

