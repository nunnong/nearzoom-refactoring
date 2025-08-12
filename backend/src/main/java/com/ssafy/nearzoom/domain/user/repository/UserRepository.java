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

    // 🔍 기존 메서드들 (그대로 유지)
    Optional<User> findByUserEmailAndSocialTypeAndDeletedAtIsNull(String userEmail,
                                                                  Social socialType);

    Optional<User> findByUserEmailAndSocialType(String userEmail, Social socialType);

    Optional<User> findByUserEmail(String userEmail);

    // TODO: Optional은 null이아닌 빈 객체로 표현해야 한다는 뜻인데 @NonNull이 필요한지?
    default @NonNull User getByEmailAndSocial(@NonNull String userEmail,
                                              @NonNull Social socialType) {
        return findByUserEmailAndSocialType(userEmail, socialType)
                .orElseThrow(UserNotFoundException::new);
    }

    // ✅ 추가할 메서드들:

    /**
     * 계정명으로 사용자 조회
     */
    Optional<User> findByAccountName(String accountName);

    /**
     * 통합 사용자 검색 (계정명, 이메일, 사용자명)
     */
    @Query("""
        SELECT u FROM User u 
        WHERE (LOWER(u.accountName) LIKE LOWER(CONCAT('%', :accountName, '%'))
           OR LOWER(u.userEmail) LIKE LOWER(CONCAT('%', :email, '%'))
           OR LOWER(u.userName) LIKE LOWER(CONCAT('%', :userName, '%')))
           AND u.deletedAt IS NULL
        ORDER BY u.createdAt DESC
    """)
    List<User> searchByAccountNameOrEmailOrUserName(
            @Param("accountName") String accountName,
            @Param("email") String email,
            @Param("userName") String userName,
            Pageable pageable
    );
}