package com.ssafy.nearzoom.domain.photoPrompt.repository;

import com.ssafy.nearzoom.domain.photoPrompt.entity.PhotoPrompt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PhotoPromptRepository extends JpaRepository<PhotoPrompt, Long> {

  Optional<PhotoPrompt> findByPromptIdAndDeletedAtIsNull(Long promptId);

  default PhotoPrompt getById(Long promptId) {
    return findByPromptIdAndDeletedAtIsNull(promptId)
        .orElseThrow(() -> new RuntimeException("존재하지 않는 프롬프트입니다."));
  }
}
