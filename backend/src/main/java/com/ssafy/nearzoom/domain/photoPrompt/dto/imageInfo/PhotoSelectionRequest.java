package com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo;

import java.util.List;

public record PhotoSelectionRequest(
    Long roomId,
    List<Integer> selectedCutIds,    // 선택된 컷들 (순서대로)
    Integer cutCount,                // 1, 2, 4
    String frameColor               // 프레임 색깔
) {}
