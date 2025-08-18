package com.ssafy.nearzoom.domain.user.repository;

import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.exception.UserNotFoundException;
import java.util.List;
import java.util.Optional;
import lombok.NonNull;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUserEmailAndSocialTypeAndDeletedAtIsNull(String userEmail,
        Social socialType);

    Optional<User> findByUserEmailAndSocialType(String userEmail, Social socialType);

    Optional<User> findByUserEmail(String userEmail);

    default @NonNull User getByEmailAndSocial(@NonNull String userEmail,
        @NonNull Social socialType) {
        return findByUserEmailAndSocialType(userEmail, socialType)
            .orElseThrow(UserNotFoundException::new);
    }

    Optional<User> findByAccountName(String accountName);

    boolean existsByAccountName(String accountName);

    @Query("""
        SELECT u FROM User u 
        WHERE u.accountName = :accountName 
        AND u.deletedAt IS NULL
        """)
    Optional<User> findActiveByAccountName(@Param("accountName") String accountName);

    @Query("""
        SELECT u FROM User u 
        WHERE LOWER(u.accountName) LIKE LOWER(CONCAT('%', :accountName, '%')) 
        AND u.deletedAt IS NULL 
        AND (:cursor IS NULL OR u.userId < :cursor)
        ORDER BY u.userId DESC
        """)
    List<User> searchByAccountNameOnly(
        @Param("accountName") String accountName,
        @Param("cursor") Long cursor,
        Pageable pageable
    );

    @Deprecated
    @Query("""
        SELECT u FROM User u 
        WHERE LOWER(u.accountName) LIKE LOWER(CONCAT('%', :accountName, '%')) 
        AND u.deletedAt IS NULL 
        ORDER BY u.createdAt DESC
        """)
    List<User> searchByAccountNameOnlyLegacy(
        @Param("accountName") String accountName,
        Pageable pageable
    );
}