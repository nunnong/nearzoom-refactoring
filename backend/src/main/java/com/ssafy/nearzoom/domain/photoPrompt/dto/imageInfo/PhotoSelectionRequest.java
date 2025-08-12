package com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo;

public record PhotoSelectionRequest(
    Long roomId,
    String frameColor            // 추가된 필드
) {}
