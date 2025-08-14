package com.ssafy.nearzoom.domain.photo.repository;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

    Optional<Photo> findByPhotoIdAndDeletedAtIsNull(Long photoId);

    Optional<Photo> findByRoomIdAndDeletedAtIsNull(Long roomId);

    default Photo getById(Long photoId) {
        return findByPhotoIdAndDeletedAtIsNull(photoId)
            .orElseThrow(() -> new RuntimeException("존재하지 않는 사진입니다."));
    }

    default Photo getByRoomId(Long roomId) {
        return findByRoomIdAndDeletedAtIsNull(roomId)
            .orElseThrow(() -> new RuntimeException("해당 방의 사진을 찾을 수 없습니다."));
    }

}