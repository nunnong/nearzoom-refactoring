package com.ssafy.nearzoom.domain.room.dto;

public record JoinRequest(
    Long roomId,

    String participantName,

    String metadata
) {}
