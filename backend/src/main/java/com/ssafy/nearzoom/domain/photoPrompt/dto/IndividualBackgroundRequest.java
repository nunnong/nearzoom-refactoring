package com.ssafy.nearzoom.domain.photoPrompt.dto;

import java.util.List;

public record IndividualBackgroundRequest(
    Long roomId,
    String imageUrl,
    List<String> personIds,
    String backgroundType,
    String colorValue,
    String promptText
) {

}

