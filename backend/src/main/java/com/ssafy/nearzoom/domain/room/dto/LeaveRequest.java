package com.ssafy.nearzoom.domain.room.dto;

public record LeaveRequest(
    Long roomId,
    String participantIdentity  // 나가는 참가자의 identity
) {}
