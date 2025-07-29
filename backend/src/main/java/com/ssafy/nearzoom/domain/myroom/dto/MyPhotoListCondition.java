package com.ssafy.nearzoom.domain.myroom.dto;

import java.time.LocalDate;
import java.util.List;

public record MyPhotoListCondition(
    Long cursor,
    int limit,
    Boolean liked,
    List<String> partnerEmails,
    LocalDate startDate,
    LocalDate endDate
) {

}
