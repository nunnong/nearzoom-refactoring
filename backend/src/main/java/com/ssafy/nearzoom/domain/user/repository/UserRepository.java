// UserRepository.java - 중복 메서드 제거 및 PageRequest 방식으로 통일

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

    // =========================================
    // 🔍 기존 메서드들 (그대로 유지)
    // =========================================

    Optional<User> findByUserEmailAndSocialTypeAndDeletedAtIsNull(String userEmail, Social socialType);

    Optional<User> findByUserEmailAndSocialType(String userEmail, Social socialType);

    Optional<User> findByUserEmail(String userEmail);

    // TODO: Optional은 null이아닌 빈 객체로 표현해야 한다는 뜻인데 @NonNull이 필요한지?
    default @NonNull User getByEmailAndSocial(@NonNull String userEmail, @NonNull Social socialType) {
        return findByUserEmailAndSocialType(userEmail, socialType)
            .orElseThrow(UserNotFoundException::new);
    }

    //조회 단일 계정명(accountName)으로 사용자 조회
    Optional<User> findByAccountName(String accountName);

    // UserRepository.java에 추가할 메서드들

    /**
     * 계정명 중복 확인
     */
    boolean existsByAccountName(String accountName);

    /**
     * 계정명으로 사용자 조회 (삭제되지 않은 사용자만)
     */
    @Query("SELECT u FROM User u WHERE u.accountName = :accountName AND u.deletedAt IS NULL")
    Optional<User> findActiveByAccountName(@Param("accountName") String accountName);

    // =========================================
    // 📱 마이룸 방식: JPQL + Pageable (Service에서 PageRequest 생성)
    // =========================================

    /**
     * 📱 마이룸 방식: 계정명 검색 (커서 기반)
     * Service에서 PageRequest.ofSize(limit + 1) 전달
     */
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

    // =========================================
    // 🔄 기존 메서드들 (Deprecated)
    // =========================================

    /**
     * @deprecated 마이룸 방식으로 통일. searchByAccountNameOnly(accountName, cursor, pageable) 사용 권장
     */
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