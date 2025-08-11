package com.ssafy.nearzoom.domain.feed.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LikesId implements Serializable {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "photo_id", nullable = false)
    private Long photoId;

    private LikesId(Long userId, Long photoId) {
        this.userId = userId;
        this.photoId = photoId;
    }

    public static LikesId of(Long userId, Long photoId) {
        return new LikesId(userId, photoId);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        LikesId that = (LikesId) o;
        return Objects.equals(userId, that.userId) &&
            Objects.equals(photoId, that.photoId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, photoId);
    }
}
