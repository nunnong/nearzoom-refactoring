package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Feed;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FeedRepository extends JpaRepository<Feed, Long> {

    @Query("""
          select f
          from Feed f
            join fetch f.user u
            join fetch f.photo p
          where f.feedId = :feedId
        """)
    Optional<Feed> findDetail(Long feedId);

    @Query("""
          select f
          from Feed f
          where f.user.userId = :userId
            and ( :cursorAt is null
                  or f.createdAt < :cursorAt
                  or (f.createdAt = :cursorAt and f.feedId < :cursorId) )
          order by f.createdAt desc, f.feedId desc
        """)
    List<Feed> findUserFeedPage(Long userId, LocalDateTime cursorAt, Long cursorId,
        Pageable pageable);

    @Query("""
          select f
          from Feed f
          where f.user.userId in (
            select fo.followee.userId
            from com.ssafy.nearzoom.domain.feed.entity.Follow fo
            where fo.follower.userId = :me
          )
            and ( :cursorAt is null
                  or f.createdAt < :cursorAt
                  or (f.createdAt = :cursorAt and f.feedId < :cursorId) )
          order by f.createdAt desc, f.feedId desc
        """)
    List<Feed> findFollowingPage(Long me, LocalDateTime cursorAt, Long cursorId, Pageable pageable);

    @Query(value = "select * from feed order by rand() limit :limit", nativeQuery = true)
    List<Feed> findRandom(int limit);

    /**
     * 특정 사용자의 피드 조회 (1명당 1개이므로 Optional)
     */
    Optional<Feed> findByUser_UserId(Long userId);
}
