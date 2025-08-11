package com.ssafy.nearzoom.domain.feed.entity;

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
    private LikesId likesId;

    @MapsId("feedId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feed_id", nullable = false)
    private Feed feed;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Likes(Feed feed, User user) {
        this.feed = feed;
        this.user = user;
        this.likesId = LikesId.of(feed.getFeedId(), user.getUserId());
    }

    public static Likes of(Feed feed, User user) {
        return new Likes(feed, user);
    }
}
