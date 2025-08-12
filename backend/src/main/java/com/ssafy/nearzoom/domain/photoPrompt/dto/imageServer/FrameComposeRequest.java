package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

import java.util.List;

public record FrameComposeRequest(
    List<String> processedImageUrls,
    String frameColor
    // int layout                  // 1, 2, 4컷
) {}
