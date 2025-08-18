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

    @MapsId("postId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)  // feed_id → post_id로 변경
    private Post post;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Likes(Post post, User user) {
        this.post = post;
        this.user = user;
        this.likesId = LikesId.of(post.getPostId(), user.getUserId());
    }

    public static Likes of(Post post, User user) {
        return new Likes(post, user);
    }
}