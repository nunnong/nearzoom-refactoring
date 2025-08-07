package com.ssafy.nearzoom.domain.room.controller;

import com.ssafy.nearzoom.domain.room.dto.LiveKitInfoResponse;
import com.ssafy.nearzoom.domain.room.dto.RoomInfo;
import com.ssafy.nearzoom.domain.room.dto.JoinRequest;
import com.ssafy.nearzoom.domain.room.dto.RoomMetaSaveRequest;
import com.ssafy.nearzoom.domain.room.service.RoomService;
import com.ssafy.nearzoom.global.exception.ApiException;
import com.ssafy.nearzoom.global.response.ApiResponse;
import com.ssafy.nearzoom.global.swagger.response.ApiResponseConstants.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

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
}
