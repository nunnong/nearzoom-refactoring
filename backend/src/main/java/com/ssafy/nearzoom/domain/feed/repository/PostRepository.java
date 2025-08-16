// PostRepository.java - PageRequest 방식으로 수정 (완전한 버전)

package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Post;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    // =========================================
    // 🔄 기존 메서드들 (유지)
    // =========================================

    @Query("""
        select p 
        from Post p 
        join fetch p.photo 
        where p.feed.feedId = :feedId 
        order by p.displayOrder asc, p.createdAt desc
        """)
    List<Post> findByFeedIdOrderByDisplayOrder(Long feedId);

    @Query("""
        select p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        where p.postId = :postId
        """)
    Optional<Post> findPostWithDetails(Long postId);

    @Query("""
        select coalesce(max(p.displayOrder), 0) + 1 
        from Post p 
        where p.feed.feedId = :feedId
        """)
    Integer getNextDisplayOrder(Long feedId);

    boolean existsByFeed_User_UserIdAndPhoto_PhotoId(Long userId, Long photoId);

    long countByFeed_FeedId(Long feedId);

    // =========================================
    // 📱 마이룸 방식: JPQL + Pageable (Service에서 PageRequest 생성)
    // =========================================

    /**
     * 팔로잉하는 사용자들의 최신 게시물들 + 자신의 게시물 - 마이룸 방식
     * Service에서 PageRequest.ofSize(limit + 1) 전달
     */
    @Query("""
    select p 
    from Post p 
    join fetch p.feed f
    join fetch f.user u
    join fetch p.photo ph
    where (f.user.userId in (
        select fo.followee.userId 
        from Follow fo 
        where fo.follower.userId = :userId
    ) OR f.user.userId = :userId)
    and (:cursor is null or p.postId < :cursor)
    order by p.postId desc
    """)
    List<Post> findFollowingLatestPosts(
        @Param("userId") Long userId,
        @Param("cursor") Long cursor,
        Pageable pageable
    );

    /**
     * 전체 게시물들 조회 - 마이룸 방식
     */
    @Query("""
        select p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        where (:cursor is null or p.postId < :cursor)
        order by p.postId desc
        """)
    List<Post> findRandomPosts(
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 특정 피드의 게시물들 - 마이룸 방식
     */
    @Query("""
        select p 
        from Post p 
        join fetch p.photo ph
        where p.feed.feedId = :feedId 
        and (:cursor is null or p.postId < :cursor)
        order by p.displayOrder asc, p.postId asc
        """)
    List<Post> findByFeedIdWithCursor(
            @Param("feedId") Long feedId,
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 특정 사용자의 모든 게시물 - 마이룸 방식
     */
    @Query("""
        select p 
        from Post p 
        join fetch p.photo ph
        where p.feed.user.userId = :userId 
        and (:cursor is null or p.postId < :cursor)
        order by p.postId desc
        """)
    List<Post> findByUserIdWithCursor(
            @Param("userId") Long userId,
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    /**
     * 최신 게시물들 조회 (전체) - 마이룸 방식
     */
    @Query("""
        select p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        where (:cursor is null or p.postId < :cursor)
        order by p.postId desc
        """)
    List<Post> findLatestPostsWithCursor(
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    // =========================================
    // 🔄 기존 메서드들 (하위 호환성을 위해 유지하되 Deprecated 처리)
    // =========================================

    /**
     * @deprecated 마이룸 방식으로 통일. findFollowingLatestPosts(userId, cursor, pageable) 사용 권장
     */
    @Deprecated
    @Query(value = """
        select p.* from post p 
        join feed f on p.feed_id = f.feed_id 
        where f.user_id in (
            select fo.followee_id from follow fo 
            where fo.follower_id = :userId
        )
        order by p.created_at desc
        limit :limit
        """, nativeQuery = true)
    List<Post> findFollowingLatestPostsLegacy(@Param("userId") Long userId, @Param("limit") int limit);

    /**
     * @deprecated 마이룸 방식으로 통일. findRandomPosts(cursor, pageable) 사용 권장
     */
    @Deprecated
    @Query(value = """
        select p.* from post p 
        join feed f on p.feed_id = f.feed_id 
        join photo ph on p.photo_id = ph.photo_id 
        order by rand() 
        limit :limit
        """, nativeQuery = true)
    List<Post> findRandomPostsLegacy(@Param("limit") int limit);

    /**
     * @deprecated 마이룸 방식으로 통일. findByUserIdWithCursor(userId, cursor, pageable) 사용 권장
     */
    @Deprecated
    @Query(value = """
        select p.* from post p 
        join feed f on p.feed_id = f.feed_id
        where f.user_id = :userId 
        order by p.created_at desc
        limit :limit
        """, nativeQuery = true)
    List<Post> findByUserIdLegacy(@Param("userId") Long userId, @Param("limit") int limit);
}