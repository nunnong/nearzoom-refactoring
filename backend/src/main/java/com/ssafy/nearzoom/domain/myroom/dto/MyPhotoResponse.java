package com.ssafy.nearzoom.domain.myroom.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "마이룸 사진 응답 DTO")
public record MyPhotoResponse(

    @Schema(description = "사진 ID", example = "123")
    Long photoId,

    @Schema(description = "사진 이미지 URL", example = "https://example.com/photo.jpg")
    String imageUrl,

    @Schema(description = "사진 생성 시간", example = "2025-08-06T14:30:00")
    LocalDateTime createdAt,

    @Schema(description = "하트 수", example = "5")
    Integer heart,

    @Schema(description = "수정 가능 여부", example = "true")
    boolean editable,

    @Schema(description = "함께 찍은 사용자 이메일 목록 (콤마로 구분)", example = "user1@example.com,user2@example.com")
    String partnerEmails
) {}
