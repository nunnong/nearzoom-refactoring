package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Post;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

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

    // ⚠️ 누락된 쿼리 1: 팔로잉하는 사용자들의 최신 게시물들
    @Query("""
        select p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        where f.user.userId in (
            select fo.followee.userId 
            from Follow fo 
            where fo.follower.userId = :userId
        )
        order by p.createdAt desc
        """)
    List<Post> findFollowingLatestPosts(Long userId, Pageable pageable);

    // ⚠️ 누락된 쿼리 2: 랜덤 게시물들
    @Query(value = """
        select p.* from post p 
        join feed f on p.feed_id = f.feed_id 
        join photo ph on p.photo_id = ph.photo_id 
        order by rand() 
        limit :limit
        """, nativeQuery = true)
    List<Post> findRandomPosts(int limit);

    // 📊 추가 유용한 쿼리들

    /**
     * 특정 사용자의 모든 게시물 조회
     */
    @Query("""
        select p 
        from Post p 
        join fetch p.photo 
        where p.feed.user.userId = :userId 
        order by p.createdAt desc
        """)
    List<Post> findByUserId(Long userId);

    /**
     * 특정 피드의 게시물 개수
     */
    long countByFeed_FeedId(Long feedId);

    /**
     * 최신 게시물들 조회 (전체)
     */
    @Query("""
        select p 
        from Post p 
        join fetch p.feed f
        join fetch f.user u
        join fetch p.photo ph
        order by p.createdAt desc
        """)
    List<Post> findLatestPosts(Pageable pageable);
}