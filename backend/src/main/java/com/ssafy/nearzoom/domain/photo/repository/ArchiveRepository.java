package com.ssafy.nearzoom.domain.photo.repository;

import com.ssafy.nearzoom.domain.photo.entity.Archive;
import com.ssafy.nearzoom.domain.photo.entity.ArchiveId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ArchiveRepository extends JpaRepository<Archive, ArchiveId> {

  Optional<Archive> findByIdAndDeletedAtIsNull(ArchiveId id);

  List<Archive> findByIdUserIdAndDeletedAtIsNull(Long userId);

  List<Archive> findByIdPhotoIdAndDeletedAtIsNull(Long photoId);
}
