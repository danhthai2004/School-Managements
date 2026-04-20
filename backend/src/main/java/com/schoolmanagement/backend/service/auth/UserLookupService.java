package com.schoolmanagement.backend.service.auth;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserLookupService {

    private final UserRepository users;

    public UserLookupService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public User requireById(UUID id) {
        User user = users.findByIdWithSchool(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User không tồn tại."));
        if (user.getSchool() != null) {
            Hibernate.initialize(user.getSchool());
        }
        return user;
    }
}
