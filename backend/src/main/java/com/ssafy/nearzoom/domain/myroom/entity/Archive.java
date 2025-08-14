package com.ssafy.nearzoom.domain.myroom.entity;

import com.ssafy.nearzoom.global.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Archive extends BaseEntity {

    private Long userId;
    private Long photoId;
    private Boolean heart = false;
    private Boolean editable = true;

    public Archive(Long userId, Long photoId) {
        this.userId = userId;
        this.photoId = photoId;
        this.heart = false;
        this.editable = true;
    }

    public void toggleHeart() {
        this.heart = !this.heart;
    }

    public void markAsNonEditable() {
        this.editable = false;
    }
}