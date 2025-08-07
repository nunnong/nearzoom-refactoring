package com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "사진 선택 요청 DTO")
public record PhotoSelectionRequest(

    @Schema(description = "방 ID", example = "123", required = true)
    Long roomId,

    @Schema(description = "선택된 컷 ID 목록 (순서대로)",
        example = "[1, 3, 2, 4]",
        required = true)
    List<Integer> selectedCutIds,

    @Schema(description = "선택할 컷 개수",
        example = "4",
        allowableValues = {"1", "2", "4"},
        required = true)
    Integer cutCount,

    @Schema(description = "프레임 색깔",
        example = "white")
    String frameColor

) {}
