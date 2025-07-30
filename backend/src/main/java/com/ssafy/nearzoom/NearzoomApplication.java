package com.ssafy.nearzoom;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.ssafy.nearzoom.domain.myroom.repository")

public class NearzoomApplication {

    public static void main(String[] args) {
        SpringApplication.run(NearzoomApplication.class, args);
    }

}
