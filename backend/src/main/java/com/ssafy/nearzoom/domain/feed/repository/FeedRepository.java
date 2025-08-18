package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Feed;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedRepository extends JpaRepository<Feed, Long> {

    @Query("""
        select f
        from Feed f
        join fetch f.user u
        where f.user.userId = :userId
        """)
    Optional<Feed> findByUser_UserId(Long userId);

    long count();

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