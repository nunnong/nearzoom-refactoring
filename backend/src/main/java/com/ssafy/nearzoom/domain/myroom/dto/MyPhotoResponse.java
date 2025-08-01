package com.ssafy.nearzoom.domain.myroom.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MyPhotoResponse(
    Long photoId,
    String imageUrl,
    LocalDateTime createdAt,
    Integer heart,
    boolean editable,
    String partnerEmails
) {

}
