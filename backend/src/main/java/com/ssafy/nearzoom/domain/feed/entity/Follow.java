package com.ssafy.nearzoom.domain.feed.entity;

import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.global.common.BaseEntity;
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
public class Follow extends BaseEntity {

    @EmbeddedId
    private FollowId id;

    @MapsId("followerId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", nullable = false)
    private User follower;

    @MapsId("followeeId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followee_id", nullable = false)
    private User followee;

    private Follow(User follower, User followee) {
        this.follower = follower;
        this.followee = followee;
        this.id = FollowId.of(follower.getUserId(), followee.getUserId());
    }

    public static Follow of(User follower, User followee) {
        return new Follow(follower, followee);
    }
}
