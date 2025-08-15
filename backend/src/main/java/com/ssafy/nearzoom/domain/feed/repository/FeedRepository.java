// FeedRepository.java - PageRequest 방식으로 완전 통일

package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Feed;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FeedRepository extends JpaRepository<Feed, Long> {

    // =========================================
    // 🔄 기존 메서드들 (변경 없음)
    // =========================================

    /**
     * 사용자별 피드 조회 (1명당 1개)
     */
    @Query("""
        select f
        from Feed f
        join fetch f.user u
        where f.user.userId = :userId
        """)
    Optional<Feed> findByUser_UserId(Long userId);

    /**
     * 피드 상세 조회 (user 정보 포함)
     */
    @Query("""
        select f
        from Feed f
        join fetch f.user u
        where f.feedId = :feedId
        """)
    Optional<Feed> findFeedWithUser(Long feedId);

    /**
     * 전체 피드 수
     */
    long count();

    // =========================================
    // 📱 마이룸 방식: JPQL + Pageable (Service에서 PageRequest 생성)
    // =========================================

    /**
     * 🔍 사용자 이름으로 피드 검색 - 마이룸 방식
     * Service에서 PageRequest.ofSize(limit + 1) 전달
     */
    @Query("""
        select f 
        from Feed f 
        join fetch f.user u 
        where u.accountName like %:accountName%
        and (:cursor is null or f.feedId < :cursor)
        order by f.feedId desc
        """)
    List<Feed> findByUserAccountNameContaining(
            @Param("accountName") String accountName,
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 📊 활성 피드 조회 (게시물이 있는 피드들) - 마이룸 방식
     */
    @Query("""
        select distinct f 
        from Feed f 
        join fetch f.user u 
        where exists (
            select 1 from Post p where p.feed.feedId = f.feedId
        )
        and (:cursor is null or f.feedId < :cursor)
        order by f.feedId desc
        """)
    List<Feed> findActiveFeedsWithPosts(
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 📱 최신 피드들 조회 - 마이룸 방식
     */
    @Query("""
        select f 
        from Feed f 
        join fetch f.user u 
        where (:cursor is null or f.feedId < :cursor)
        order by f.feedId desc
        """)
    List<Feed> findLatestFeedsWithCursor(
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 📱 특정 사용자들의 피드 조회 - 마이룸 방식
     */
    @Query("""
        select f 
        from Feed f 
        join fetch f.user u 
        where u.userId in :userIds
        and (:cursor is null or f.feedId < :cursor)
        order by f.feedId desc
        """)
    List<Feed> findByUserIdsWithCursor(
            @Param("userIds") List<Long> userIds,
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 📱 특정 사용자가 팔로우하는 사용자들의 피드 조회 - 마이룸 방식
     */
    @Query("""
        select f 
        from Feed f 
        join fetch f.user u 
        where u.userId in (
            select fo.followee.userId 
            from Follow fo 
            where fo.follower.userId = :userId
        )
        and (:cursor is null or f.feedId < :cursor)
        order by f.feedId desc
        """)
    List<Feed> findFollowingFeedsWithCursor(
            @Param("userId") Long userId,
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 📱 최근 활동이 있는 피드들 조회 - 마이룸 방식 (안전한 버전)
     */
    @Query("""
    select distinct f 
    from Feed f 
    join fetch f.user u 
    join Post p on p.feed.feedId = f.feedId
    where p.createdAt >= :weekAgo
    and (:cursor is null or f.feedId < :cursor)
    order by f.feedId desc
    """)
    List<Feed> findRecentlyActiveFeedsWithCursor(
            @Param("cursor") Long cursor,
            @Param("weekAgo") LocalDateTime weekAgo,
            Pageable pageable
    );

    // =========================================
    // 📊 통계 및 유틸리티 메서드들
    // =========================================

    /**
     * 피드에 게시물이 있는지 확인
     */
    @Query("""
        select case when count(p) > 0 then true else false end
        from Post p 
        where p.feed.feedId = :feedId
        """)
    boolean hasAnyPosts(@Param("feedId") Long feedId);

    /**
     * 피드의 게시물 수 조회
     */
    @Query("""
        select count(p) 
        from Post p 
        where p.feed.feedId = :feedId
        """)
    long countPostsByFeedId(@Param("feedId") Long feedId);

    // =========================================
    // 🔄 기존 Pageable 방식 메서드들 (Deprecated)
    // =========================================

    /**
     * @deprecated 마이룸 방식으로 통일. findByUserAccountNameContaining(accountName, cursor, pageable) 사용 권장
     */
    @Deprecated
    @Query("""
        select f 
        from Feed f 
        join fetch f.user u 
        where u.accountName like %:accountName% 
        order by f.createdAt desc
        """)
    List<Feed> findByUserAccountNameContainingLegacy(
            @Param("accountName") String accountName,
            Pageable pageable
    );

    /**
     * @deprecated 마이룸 방식으로 통일. findActiveFeedsWithPosts(cursor, pageable) 사용 권장
     */
    @Deprecated
    @Query("""
        select distinct f 
        from Feed f 
        join fetch f.user u 
        where exists (
            select 1 from Post p where p.feed.feedId = f.feedId
        )
        order by f.createdAt desc
        """)
    List<Feed> findActiveFeedsWithPostsLegacy(Pageable pageable);

    /**
     * @deprecated 마이룸 방식으로 통일. findFollowingFeedsWithCursor(userId, cursor, pageable) 사용 권장
     */
    @Deprecated
    @Query("""
        select f 
        from Feed f 
        join fetch f.user u 
        where u.userId in (
            select fo.followee.userId 
            from Follow fo 
            where fo.follower.userId = :userId
        )
        order by f.updatedAt desc
        """)
    List<Feed> findFollowingFeedsLegacy(
            @Param("userId") Long userId,
            Pageable pageable
    );
}