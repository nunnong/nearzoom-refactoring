package com.ssafy.nearzoom.domain.photo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ARCHIVE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Archive {

  @EmbeddedId
  private ArchiveId id;

  @Column(name = "heart", nullable = false, columnDefinition = "TINYINT DEFAULT 0")
  private Boolean heart = false;

  @Column(name = "editable", nullable = false, columnDefinition = "TINYINT DEFAULT 1")
  private Boolean editable = true;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  // 생성자
  public Archive(Long userId, Long photoId) {
    this.id = new ArchiveId(userId, photoId);
  }

  // 소프트 삭제
  public void markDeleted() {
    this.deletedAt = LocalDateTime.now();
  }

  // 좋아요 토글
  public void toggleHeart() {
    this.heart = !this.heart;
  }
}
