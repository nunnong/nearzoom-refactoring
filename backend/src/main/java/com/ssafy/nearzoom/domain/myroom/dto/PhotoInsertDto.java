package com.ssafy.nearzoom.domain.myroom.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PhotoInsertDto {

    private Long photoId;
    private String imageUrl;
    private String userList;
    private Long roomId;
    private Long originalPhotoId;

    public PhotoInsertDto(String imageUrl, String userList, Long roomId, Long originalPhotoId) {
        this.imageUrl = imageUrl;
        this.userList = userList;
        this.roomId = roomId;
        this.originalPhotoId = originalPhotoId;
    }
}