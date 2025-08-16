package com.ssafy.nearzoom.domain.photoPrompt.dto;

import java.util.List;

public record IndividualBackgroundRequest(
    Long roomId,
    String imageUrl,
    List<String> personIds,
    String backgroundType,   // "solid" 또는 "prompt"
    String colorValue,       // backgroundType이 "solid"일 때
    String promptText        // backgroundType이 "prompt"일 때
) {}

