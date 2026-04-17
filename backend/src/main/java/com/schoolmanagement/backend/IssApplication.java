package com.schoolmanagement.backend;

import com.schoolmanagement.backend.security.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
@EnableScheduling
public class IssApplication {

	public static void main(String[] args) {
		SpringApplication.run(IssApplication.class, args);
	}

}
