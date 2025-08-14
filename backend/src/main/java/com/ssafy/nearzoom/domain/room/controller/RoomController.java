package com.ssafy.nearzoom.domain.room.controller;

import com.ssafy.nearzoom.domain.room.dto.LeaveRequest;
import com.ssafy.nearzoom.domain.room.dto.LiveKitInfoResponse;
import com.ssafy.nearzoom.domain.room.dto.RoomInfo;
import com.ssafy.nearzoom.domain.room.dto.JoinRequest;
import com.ssafy.nearzoom.domain.room.dto.RoomMetaSaveRequest;
import com.ssafy.nearzoom.domain.room.dto.TransferHostRequest;
import com.ssafy.nearzoom.domain.room.dto.BecomeHostRequest;
import com.ssafy.nearzoom.domain.room.service.RoomService;
import com.ssafy.nearzoom.global.exception.ApiException;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashMap;

@Slf4j
@RestController
@RequestMapping("/room")
@RequiredArgsConstructor
@Tag(name = "Room API", description = "회의룸 생성 및 관리")
public class RoomController {

  private final RoomService roomService;

  @PostMapping("/create")
  @Operation(summary = "회의룸 생성", description = "방장이 회의룸 생성 버튼을 누를 때 호출되어 LiveKit 서버에 방을 생성합니다.")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> createRoom(
      HttpServletRequest request,
      @RequestBody String metadata) {

    try {
      LiveKitInfoResponse liveKitInfoResponse = roomService.createRoom(request, metadata);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", liveKitInfoResponse.roomId());
      responseData.put("serverUrl", liveKitInfoResponse.serverUrl());
      responseData.put("participantToken", liveKitInfoResponse.participantToken());
      responseData.put("participantName", liveKitInfoResponse.participantName());
      responseData.put("createdAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "회의룸이 성공적으로 생성되었습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "회의룸 생성 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/save-meta")
  @Operation(summary = "회의룸 메타 저장", description = "서버가 LiveKit 응답을 받아 내부적으로 회의룸 정보를 자동 저장합니다.")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> saveRoomMeta(
      @RequestBody RoomMetaSaveRequest roomMetaSaveRequest) {

    try {
      roomService.saveRoomMeta(roomMetaSaveRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomMetaSaveRequest.roomId());
      responseData.put("participantCount", roomMetaSaveRequest.participants().size());
      responseData.put("savedAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "회의룸 메타 정보가 성공적으로 저장되었습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "회의룸 메타 저장 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/join")
  @Operation(summary = "회의룸 참가", description = "기존 회의룸에 참가합니다.")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> joinRoom(
      HttpServletRequest request,
      @RequestBody JoinRequest joinRequest) {

    try {
      LiveKitInfoResponse liveKitInfoResponse = roomService.joinRoom(request, joinRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", liveKitInfoResponse.roomId());
      responseData.put("serverUrl", liveKitInfoResponse.serverUrl());
      responseData.put("participantToken", liveKitInfoResponse.participantToken());
      responseData.put("participantName", liveKitInfoResponse.participantName());
      responseData.put("joinedAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "회의룸에 성공적으로 참가했습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "회의룸 참가 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @GetMapping("/{roomId}/info")
  @Operation(summary = "회의룸 정보 조회", description = "Redis에 저장된 회의룸 정보를 조회합니다.")
  @GetApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> getRoomInfo(
      HttpServletRequest request,
      @PathVariable Long roomId) {

    try {
      RoomInfo roomInfo = roomService.getRoomInfo(request, roomId);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("serverUrl", roomInfo.serverUrl());
      responseData.put("participants", roomInfo.participants());
      responseData.put("createdAt", roomInfo.createdAt());
      responseData.put("retrievedAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "회의룸 정보 조회에 성공했습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "회의룸 정보 조회 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/leave")
  @Operation(summary = "회의룸 나가기", description = "참가자가 회의룸을 나갑니다.")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> leaveRoom(
      HttpServletRequest request,
      @RequestBody LeaveRequest leaveRequest) {

    try {
      roomService.leaveRoom(request, leaveRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", leaveRequest.roomId());
      responseData.put("participantIdentity", leaveRequest.participantIdentity());
      responseData.put("leftAt", LocalDateTime.now().toString());

      log.info("User left room via API. RoomId: {}, Identity: {}",
          leaveRequest.roomId(), leaveRequest.participantIdentity());

      return ResponseEntity.ok(new ApiResponse<>(false, "회의룸에서 성공적으로 나갔습니다.", responseData));

    } catch (ApiException e) {
      log.warn("Room leave failed. RoomId: {}, Error: {}", leaveRequest.roomId(), e.getMessage());
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      log.error("Unexpected error during room leave. RoomId: {}", leaveRequest.roomId(), e);
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "회의룸 나가기 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/{roomId}/close")
  @Operation(summary = "회의룸 종료", description = "방장이 회의룸을 완전히 종료합니다.")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> closeRoom(
      HttpServletRequest request,
      @PathVariable Long roomId) {

    try {
      roomService.closeRoom(request, roomId);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("closedAt", LocalDateTime.now().toString());

      log.info("Room closed via API. RoomId: {}", roomId);

      return ResponseEntity.ok(new ApiResponse<>(false, "회의룸이 성공적으로 종료되었습니다.", responseData));

    } catch (ApiException e) {
      log.warn("Room close failed. RoomId: {}, Error: {}", roomId, e.getMessage());
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      log.error("Unexpected error during room close. RoomId: {}", roomId, e);
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "회의룸 종료 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @GetMapping("/{roomId}/participants")
  @Operation(summary = "참가자 목록 조회", description = "현재 활성 참가자 목록을 조회합니다.")
  @GetApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> getParticipants(
      HttpServletRequest request,
      @PathVariable Long roomId) {

    try {
      List<String> activeParticipants = roomService.getActiveParticipants(roomId);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("participants", activeParticipants);
      responseData.put("participantCount", activeParticipants.size());
      responseData.put("retrievedAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "참가자 목록 조회에 성공했습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      log.error("Unexpected error during participants retrieval. RoomId: {}", roomId, e);
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "참가자 목록 조회 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/{roomId}/transfer-host")
  @Operation(summary = "방장 권한 이양", description = "현재 방장이 다른 참가자에게 방장 권한을 넘깁니다.")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> transferHost(
      HttpServletRequest request,
      @PathVariable Long roomId,
      @RequestBody TransferHostRequest transferRequest) {

    try {
      // roomId 일치 확인
      if (!roomId.equals(transferRequest.roomId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "경로의 roomId와 요청 데이터의 roomId가 일치하지 않습니다.");
      }

      roomService.transferHost(request, transferRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("newHostEmail", transferRequest.newHostEmail());
      responseData.put("transferredAt", LocalDateTime.now().toString());

      log.info("Host transferred via API. RoomId: {}, NewHost: {}", roomId, transferRequest.newHostEmail());

      return ResponseEntity.ok(new ApiResponse<>(false, "방장 권한이 성공적으로 이양되었습니다.", responseData));

    } catch (ApiException e) {
      log.warn("Host transfer failed. RoomId: {}, Error: {}", roomId, e.getMessage());
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      log.error("Unexpected error during host transfer. RoomId: {}", roomId, e);
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "방장 권한 이양 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @GetMapping("/{roomId}/is-host")
  @Operation(summary = "방장 권한 확인", description = "현재 사용자가 해당 방의 방장인지 확인합니다.")
  @GetApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> checkHostAuthority(
      HttpServletRequest request,
      @PathVariable Long roomId) {

    try {
      boolean isHost = roomService.isHost(request, roomId);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("isHost", isHost);
      responseData.put("checkedAt", LocalDateTime.now().toString());

      return ResponseEntity.ok(new ApiResponse<>(false, "방장 권한 확인이 완료되었습니다.", responseData));

    } catch (ApiException e) {
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      log.error("Unexpected error during host check. RoomId: {}", roomId, e);
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "방장 권한 확인 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  @PostMapping("/{roomId}/become-host")
  @Operation(summary = "방장 되기", description = "참가자가 바로 방장이 됩니다.")
  @PostApiResponses
  public ResponseEntity<ApiResponse<Map<String, Object>>> becomeHost(
      HttpServletRequest request,
      @PathVariable Long roomId,
      @RequestBody BecomeHostRequest becomeHostRequest) {

    try {
      // roomId 일치 확인
      if (!roomId.equals(becomeHostRequest.roomId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "경로의 roomId와 요청 데이터의 roomId가 일치하지 않습니다.");
      }

      roomService.becomeHost(request, becomeHostRequest);

      Map<String, Object> responseData = new HashMap<>();
      responseData.put("roomId", roomId);
      responseData.put("becameHostAt", LocalDateTime.now().toString());

      log.info("User became host via API. RoomId: {}", roomId);

      return ResponseEntity.ok(new ApiResponse<>(false, "방장이 되었습니다.", responseData));

    } catch (ApiException e) {
      log.warn("Become host failed. RoomId: {}, Error: {}", roomId, e.getMessage());
      return ApiResponse.failedOf(e);
    } catch (Exception e) {
      log.error("Unexpected error during become host. RoomId: {}", roomId, e);
      return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR, "방장 되기 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

}