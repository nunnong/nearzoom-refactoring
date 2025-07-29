package com.ssafy.nearzoom.domain.myroom.dto;

import java.util.List;

public record MyPhotoListResponse(
    List<MyPhotoResponse> photos,
    boolean hasNext,
    Long nextCursor
) {

}
