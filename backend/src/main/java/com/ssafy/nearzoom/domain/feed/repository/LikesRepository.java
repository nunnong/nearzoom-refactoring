package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Likes;
import com.ssafy.nearzoom.domain.feed.entity.LikesId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikesRepository extends JpaRepository<Likes, LikesId> {

    boolean existsByFeed_FeedIdAndUser_UserId(Long feedId, Long userId);

    void deleteByFeed_FeedIdAndUser_UserId(Long feedId, Long userId);
}
