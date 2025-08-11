package com.ssafy.nearzoom.domain.feed.entity;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.user.entity.User;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Likes {

    @EmbeddedId
    private LikesId likesid;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @MapsId("photoId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photo_id", nullable = false)
    private Photo photo;

    private Likes(User user, Photo photo) {
        this.user = user;
        this.photo = photo;
        this.likesid = LikesId.of(user.getUserId(), photo.getPhotoId());
    }

    public static Likes of(User user, Photo photo) {
        return new Likes(user, photo);
    }
}
