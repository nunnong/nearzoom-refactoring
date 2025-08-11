package com.ssafy.nearzoom.domain.feed.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class FollowId implements Serializable {

    @Column(name = "follower_id", nullable = false)
    private Long followerId;

    @Column(name = "followee_id", nullable = false)
    private Long followeeId;

    private FollowId(Long followerId, Long followeeId) {
        this.followerId = followerId;
        this.followeeId = followeeId;
    }

    public static FollowId of(Long followerId, Long followeeId) {
        return new FollowId(followerId, followeeId);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof FollowId that)) {
            return false;
        }
        return Objects.equals(followerId, that.followerId)
            && Objects.equals(followeeId, that.followeeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(followerId, followeeId);
    }
}
