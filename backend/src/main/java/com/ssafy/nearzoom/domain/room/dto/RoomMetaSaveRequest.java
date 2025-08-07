package com.ssafy.nearzoom.domain.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoomMetaSaveRequest(
    Long roomId,

    @NotNull(message = "참가자 목록은 필수입니다.")
    List<String> participants,

    @NotBlank(message = "생성일자는 필수입니다.")
    String createdAt
) {}
