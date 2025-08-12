package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

import java.util.List;

public record FrameCompositionCompletedWebhook(
    String event,
    String jobId,
    String timestamp,
    FrameCompositionData data
) {
  public record FrameCompositionData(
      String finalImageUrl,
      List<String> individualImageUrls,
      FrameInfo frameInfo
  ) {}

  public record FrameInfo(
      String color,
      String layout
  ) {}
}
