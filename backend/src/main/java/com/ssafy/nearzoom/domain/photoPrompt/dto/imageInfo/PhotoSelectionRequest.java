package com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo;

import java.util.List;

public record PhotoSelectionRequest(
    Long roomId,
    List<Long> selectedCutIds,
    int cutCount,
    String frameColor            // 추가된 필드
) {}
