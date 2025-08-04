package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

import java.util.List;

public record ImageProcessingData(
        String originalImageId,
        String processedImageUrl,
        List<String> personIds
) {}
