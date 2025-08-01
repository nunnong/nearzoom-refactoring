package com.ssafy.nearzoom.domain.photo.repository;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

  Optional<Photo> findByPhotoIdAndDeletedAtIsNull(Long photoId);

  // 기본 조회 메서드 (소프트 삭제 제외)
  default Photo getById(Long photoId) {
    return findByPhotoIdAndDeletedAtIsNull(photoId)
        .orElseThrow(() -> new RuntimeException("존재하지 않는 사진입니다."));
  }
}