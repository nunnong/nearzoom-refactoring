package com.ssafy.nearzoom.domain.myroom.dto;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PhotoDto {
    private Long photoId;
    private String imgUrl;
    private String userList;
    private Long roomId;
    private Long originalPhotoId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;

    public PhotoDto(String imgUrl, String userList, Long roomId, Long originalPhotoId) {
        this.imgUrl = imgUrl;
        this.userList = userList;
        this.roomId = roomId;
        this.originalPhotoId = originalPhotoId;
    }
}