package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Feed;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FeedRepository extends JpaRepository<Feed, Long> {

    /**
     * 🔄 수정: 사용자별 피드 조회 (1명당 1개)
     */
    @Query("""
        select f
        from Feed f
        join fetch f.user u
        where f.user.userId = :userId
        """)
    Optional<Feed> findByUser_UserId(Long userId);

    /**
     * 🔄 수정: 피드 상세 조회 (user 정보 포함)
     */
    @Query("""
        select f
        from Feed f
        join fetch f.user u
        where f.feedId = :feedId
        """)
    Optional<Feed> findFeedWithUser(Long feedId);

    /**
     * 📊 통계: 전체 피드 수
     */
    long count();

    /**
     * 🔍 검색: 사용자 이름으로 피드 검색
     */
    @Query("""
        select f 
        from Feed f 
        join fetch f.user u 
        where u.accountName like %:accountName% 
        order by f.createdAt desc
        """)
    List<Feed> findByUserAccountNameContaining(String accountName, Pageable pageable);

    /**
     * 📊 활성 피드 조회 (게시물이 있는 피드들)
     */
    @Query("""
        select distinct f 
        from Feed f 
        join fetch f.user u 
        where exists (
            select 1 from Post p where p.feed.feedId = f.feedId
        )
        order by f.createdAt desc
        """)
    List<Feed> findActiveFeedsWithPosts(Pageable pageable);

    // ===== 🗑️ 기존 구조용 메서드들 제거 =====
    // findDetail, findUserFeedPage, findFollowingPage, findRandom 메서드들은
    // 새로운 Post 구조에서는 더 이상 사용되지 않으므로 제거
}