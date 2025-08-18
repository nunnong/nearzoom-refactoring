package com.ssafy.nearzoom.domain.room.dto;

public record LiveKitInfoResponse(
    String serverUrl,
    Long roomId,
    String participantToken,
    String participantName
) {}