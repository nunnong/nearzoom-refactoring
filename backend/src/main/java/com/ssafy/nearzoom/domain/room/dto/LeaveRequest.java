package com.ssafy.nearzoom.domain.room.dto;

public record LeaveRequest(
    Long roomId,
    String participantIdentity
) {

}
