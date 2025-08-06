package com.ssafy.nearzoom.domain.myroom.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "마이룸 사진 목록 응답 DTO")
public record MyPhotoListResponse(

    @Schema(description = "사진 응답 목록")
    List<MyPhotoResponse> photos,

    @Schema(description = "다음 페이지 존재 여부", example = "true")
    boolean hasNext,

    @Schema(description = "다음 페이지 조회용 커서 photoId", example = "102")
    Long nextCursor
) {}
