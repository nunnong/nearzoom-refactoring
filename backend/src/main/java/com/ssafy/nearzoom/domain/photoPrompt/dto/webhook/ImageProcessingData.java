package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "이미지 처리 완료 데이터")
public record ImageProcessingData(

    @Schema(description = "원본 이미지 ID", example = "img_67890", required = true)
    String originalImageId,

    @Schema(description = "처리된 이미지 URL",
        example = "https://storage.example.com/processed/img_67890_processed.jpg",
        required = true)
    String processedImageUrl,

    @Schema(description = "인식된 인물 ID 목록",
        example = "[\"person_001\", \"person_002\", \"person_003\"]")
    List<String> personIds

) {}
