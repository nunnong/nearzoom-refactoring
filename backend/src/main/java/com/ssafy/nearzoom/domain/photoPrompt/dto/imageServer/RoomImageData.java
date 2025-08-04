package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

import java.util.List;

public record RoomImageData(
    String imageUrl,
    List<String> personIds,
    ProcessingOptions processingOptions,
    String backgroundPromptId
) {}