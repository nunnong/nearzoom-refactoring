package com.ssafy.nearzoom.domain.user.repository;

import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.exception.UserNotFoundException;
import java.util.Optional;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByuserEmailAndDeletedAtIsNull(String userEmail);

    Optional<User> findByuserEmail(String userEmail);

    // 물어보기 Optional은 null이아닌 빈 객체로 표현해야 한다는 뜻인데 @NonNull이 필요한지?
    default @NonNull User getByEmail(@NonNull String userEmail) {
        return findByuserEmail(userEmail)
            .orElseThrow(UserNotFoundException::new);
    }
}
