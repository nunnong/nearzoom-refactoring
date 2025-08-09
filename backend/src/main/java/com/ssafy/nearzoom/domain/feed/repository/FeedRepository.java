package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Feed;
import java.awt.print.Pageable;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedRepository extends JpaRepository<Feed, Long> {

    // 단건
    Optional<Feed> findById(Long feedId);

    // 내/타 유저 피드 (최신순, 커서)
    List<Feed> findByUserIdOrderByFeedIdDesc(Long userId, Pageable pageable);

    List<Feed> findByUserIdAndFeedIdLessThanOrderByFeedIdDesc(Long userId, Long cursor,
        Pageable pageable);

    // 팔로잉 피드 (최신순, 커서)
    List<Feed> findByUserIdInOrderByFeedIdDesc(Collection<Long> userIds, Pageable pageable);

    List<Feed> findByUserIdInAndFeedIdLessThanOrderByFeedIdDesc(Collection<Long> userIds,
        Long cursor, Pageable pageable);

    // 탐색(최신순 → 첫 페이지 셔플용), 커서
    List<Feed> findAllByOrderByFeedIdDesc(Pageable pageable);

    List<Feed> findByFeedIdLessThanOrderByFeedIdDesc(Long cursor, Pageable pageable);
}
