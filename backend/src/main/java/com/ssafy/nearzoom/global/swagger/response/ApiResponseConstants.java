package com.ssafy.nearzoom.global.swagger.response;

import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

public class ApiResponseConstants {

  // 메타 어노테이션으로 정의
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "조회 성공"),
      @ApiResponse(responseCode = "401", description = "인증 실패"),
      @ApiResponse(responseCode = "404", description = "리소스를 찾을 수 없음")
  })
  public @interface GetApiResponses {}

  @ApiResponses({
      @ApiResponse(responseCode = "201", description = "생성 성공"),
      @ApiResponse(responseCode = "400", description = "잘못된 요청"),
      @ApiResponse(responseCode = "401", description = "인증 실패"),
      @ApiResponse(responseCode = "409", description = "이미 존재하는 데이터")
  })
  public @interface PostApiResponses {}

  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "수정 성공"),
      @ApiResponse(responseCode = "400", description = "잘못된 요청"),
      @ApiResponse(responseCode = "401", description = "인증 실패"),
      @ApiResponse(responseCode = "404", description = "수정할 데이터를 찾을 수 없음")
  })
  public @interface PutApiResponses {}

  @ApiResponses({
      @ApiResponse(responseCode = "204", description = "삭제 성공"),
      @ApiResponse(responseCode = "401", description = "인증 실패"),
      @ApiResponse(responseCode = "404", description = "삭제할 데이터를 찾을 수 없음")
  })
  public @interface DeleteApiResponses {}
}
