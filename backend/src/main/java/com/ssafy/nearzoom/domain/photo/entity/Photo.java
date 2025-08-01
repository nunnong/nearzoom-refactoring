package com.ssafy.nearzoom.domain.photo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "PHOTO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Photo {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "photo_id")
  private Long photoId;

  @Column(name = "img_url", columnDefinition = "TEXT", nullable = false)
  private String imgUrl;

  @Column(name = "user_list", columnDefinition = "TEXT")
  private String userList;

  @Column(name = "roomId", length = 100, nullable = false)
  private String roomId;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  // 생성자
  public Photo(String imgUrl, String roomId, String userList) {
    this.imgUrl = imgUrl;
    this.roomId = roomId;
    this.userList = userList;
  }

  public void updateUserList(String userList) {
    this.userList = userList;
  }

  // 소프트 삭제
  public void markDeleted() {
    this.deletedAt = LocalDateTime.now();
  }
}
