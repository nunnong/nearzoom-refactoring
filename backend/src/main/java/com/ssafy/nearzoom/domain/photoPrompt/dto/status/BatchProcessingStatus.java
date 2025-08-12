package com.ssafy.nearzoom.domain.photoPrompt.dto.status;

import java.util.List;
import java.util.Map;

public record BatchProcessingStatus(
    String batchId,
    Long roomId,
    String status,              // "processing", "composing", "completed", "failed"
    int totalJobs,
    int completedJobs,
    String composeJobId,
    String finalImageUrl,
    String errorMessage,
    List<IndividualJobStatus> individualJobs
) {
  public record IndividualJobStatus(
      String jobId,
      int order,
      String imageId,
      String status,
      String processedImageUrl,
      String errorMessage
  ) {}
}
