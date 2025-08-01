package com.ssafy.nearzoom.domain.photo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "PHOTO_PROMPT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoPrompt {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "prompt_id")
  private Long promptId;

  @Column(name = "prompt_text", columnDefinition = "TEXT", nullable = false)
  private String promptText;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 7, nullable = false)
  private PromptStatus status = PromptStatus.PENDING;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  public enum PromptStatus {
    PENDING, SUCCESS, FAIL
  }

  // 생성자 (prompt 타입용)
  public PhotoPrompt(String promptText) {
    this.promptText = promptText;
    this.status = PromptStatus.PENDING;
  }

  // 상태 업데이트
  public void updateStatus(PromptStatus status) {
    this.status = status;
  }
}