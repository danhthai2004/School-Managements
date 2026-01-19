package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserLookupService {

    private final UserRepository users;

    public UserLookupService(UserRepository users) {
        this.users = users;
    }

    public User requireById(UUID id) {
        return users.findByIdWithSchool(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User không tồn tại."));
    }
}
