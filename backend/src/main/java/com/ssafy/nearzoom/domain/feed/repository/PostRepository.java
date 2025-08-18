package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Post;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("""
        select distinct p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        left join fetch p.likes l
        left join fetch l.user lu
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

    @Query("""
        select distinct p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        left join fetch p.likes l
        left join fetch l.user lu
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

    @Query("""
        select distinct p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        left join fetch p.likes l
        left join fetch l.user lu
        where (:cursor is null or p.postId < :cursor)
        order by p.postId desc
        """)
    List<Post> findRandomPosts(
        @Param("cursor") Long cursor,
        Pageable pageable
    );

    @Query("""
        select distinct p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        left join fetch p.likes l
        left join fetch l.user lu
        where p.feed.feedId = :feedId 
        and (:cursor is null or p.postId < :cursor)
        order by p.displayOrder asc, p.postId asc
        """)
    List<Post> findByFeedIdWithCursor(
        @Param("feedId") Long feedId,
        @Param("cursor") Long cursor,
        Pageable pageable
    );

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
    List<Post> findFollowingLatestPostsLegacy(@Param("userId") Long userId,
        @Param("limit") int limit);

    @Deprecated
    @Query(value = """
        select p.* from post p 
        join feed f on p.feed_id = f.feed_id 
        join photo ph on p.photo_id = ph.photo_id 
        order by rand() 
        limit :limit
        """, nativeQuery = true)
    List<Post> findRandomPostsLegacy(@Param("limit") int limit);

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