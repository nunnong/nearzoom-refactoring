package com.ssafy.nearzoom.domain.myroom.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "마이룸 사진 조회 조건 DTO")
public record MyPhotoListCondition(

    @Schema(description = "페이징 커서 (이전 요청의 마지막 photoId)", example = "100")
    Long cursor,

    @Schema(description = "한 페이지에 조회할 개수", example = "20", defaultValue = "20")
    int limit,

    @Schema(description = "좋아요 여부 필터", example = "true")
    Boolean heart,

    @Schema(description = "함께 찍은 사용자 이메일 목록", example = "[\"user1@example.com\", \"user2@example.com\"]")
    List<String> partnerEmails,

    @Schema(description = "조회 시작일 (YYYY-MM-DD)", example = "2025-08-01")
    LocalDate startDate,

    @Schema(description = "조회 종료일 (YYYY-MM-DD)", example = "2025-08-06")
    LocalDate endDate
) {}
