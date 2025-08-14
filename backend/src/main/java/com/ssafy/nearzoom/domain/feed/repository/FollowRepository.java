package com.ssafy.nearzoom.domain.feed.repository;

import com.ssafy.nearzoom.domain.feed.entity.Follow;
import com.ssafy.nearzoom.domain.user.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    void deleteByFollower_UserIdAndFollowee_UserId(Long followerId, Long followeeId);

    @Query("SELECT f.followee FROM Follow f WHERE f.follower.userId = :userId")
    List<User> findFollowing(Long userId);

    @Query("SELECT f.follower FROM Follow f WHERE f.followee.userId = :userId")
    List<User> findFollowers(Long userId);

    @Query("""
        SELECT f1.followee 
        FROM Follow f1 
        WHERE f1.follower.userId = :userId1 
        AND f1.followee.userId IN (
            SELECT f2.followee.userId 
            FROM Follow f2 
            WHERE f2.follower.userId = :userId2
        )
        """)
    List<User> findMutualFollows(Long userId1, Long userId2);

    boolean existsByFollower_UserIdAndFollowee_UserId(Long followerId, Long followeeId);

    int countByFollowee_UserId(Long userId);

    int countByFollower_UserId(Long userId);
}
