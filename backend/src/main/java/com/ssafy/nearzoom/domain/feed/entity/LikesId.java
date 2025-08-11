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

    @Column(name = "feed_id", nullable = false)
    private Long feedId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    private LikesId(Long feedId, Long userId) {
        this.feedId = feedId;
        this.userId = userId;
    }

    public static LikesId of(Long feedId, Long userId) {
        return new LikesId(feedId, userId);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof LikesId that)) {
            return false;
        }
        return Objects.equals(feedId, that.feedId) &&
            Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(feedId, userId);
    }
}
