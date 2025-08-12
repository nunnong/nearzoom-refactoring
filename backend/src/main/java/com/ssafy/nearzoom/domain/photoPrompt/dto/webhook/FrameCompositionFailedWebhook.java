package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

public record FrameCompositionFailedWebhook(
    String event,
    String jobId,
    String timestamp,
    WebhookError error
) {
  public record WebhookError(
      String code,
      String message
  ) {}
}
