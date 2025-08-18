package com.ssafy.nearzoom.domain.photo.repository;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

    Optional<Photo> findByPhotoIdAndDeletedAtIsNull(Long photoId);

    Optional<Photo> findByImgUrlAndRoomId(String imgUrl, Long roomId);

    default Photo getById(Long photoId) {
        return findByPhotoIdAndDeletedAtIsNull(photoId)
            .orElseThrow(() -> new RuntimeException("존재하지 않는 사진입니다."));
    }
}