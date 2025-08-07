package com.ssafy.nearzoom.domain.myroom.entity;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class MyPhoto {

    private Long photoId;
    private Long userId;
    private String imageUrl;
    private boolean liked;
    private boolean editable;
    private LocalDateTime createdAt;
}
