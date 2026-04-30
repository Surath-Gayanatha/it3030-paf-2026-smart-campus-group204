package com.smartcampus.backend.services;

import com.smartcampus.backend.model.Role;
import com.smartcampus.backend.model.RoleRequestStatus;
import com.smartcampus.backend.model.TechCategory;
import com.smartcampus.backend.model.User;
import com.smartcampus.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    // Get current logged in user
    public User getCurrentUser() {
        String email = (String) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Find user by email
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // Resolve a technician by email or display name.
    // Throws ResponseStatusException (400) if the matched user is not a TECHNICIAN,
    // or if the name lookup is ambiguous (multiple matches).
    // Returns an empty Optional when no user matches the key; callers are responsible
    // for deciding whether that constitutes an error.
    public Optional<User> findTechnicianByKey(String key) {
        Optional<User> found;
        if (key.contains("@")) {
            found = userRepository.findByEmail(key);
        } else {
            List<User> matches = userRepository.findByNameIgnoreCase(key);
            if (matches.size() > 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Multiple users match the name '" + key + "'. Use the technician's email to assign.");
            }
            found = matches.isEmpty() ? Optional.empty() : Optional.of(matches.get(0));
        }
        found.ifPresent(user -> {
            if (user.getRole() != Role.TECHNICIAN) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "User '" + key + "' does not have the TECHNICIAN role.");
            }
        });
        return found;
    }

    // Get all users - admin only
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getUsersByRole(Role role) {
        return userRepository.findByRole(role);
    }

    // Update user role - admin only
    public User updateUserRole(String userId, Role role, TechCategory techCategory) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(role);
        if (techCategory != null) {
            user.setTechCategory(techCategory);
        }
        user.setRequestedRole(null);
        user.setRequestedTechCategory(TechCategory.NONE);
        user.setRoleRequestStatus(RoleRequestStatus.APPROVED);
        user.setOnboardingCompleted(true);
        return userRepository.save(user);
    }

    // User submits a role request during onboarding
    public User submitRoleRequest(Role requestedRole, TechCategory requestedTechCategory) {
        User user = getCurrentUser();

        if (requestedRole == null || requestedRole == Role.ADMIN || requestedRole == Role.USER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only LECTURER or TECHNICIAN can be requested");
        }

        user.setRequestedRole(requestedRole);
        if (requestedRole == Role.TECHNICIAN && requestedTechCategory != null) {
            user.setRequestedTechCategory(requestedTechCategory);
        }
        user.setRoleRequestStatus(RoleRequestStatus.PENDING);
        user.setOnboardingCompleted(true);
        return userRepository.save(user);
    }

    // User completes onboarding without requesting elevated role
    public User completeOnboarding() {
        User user = getCurrentUser();
        user.setOnboardingCompleted(true);

        if (user.getRoleRequestStatus() == null || user.getRoleRequestStatus() == RoleRequestStatus.NONE) {
            user.setRequestedRole(null);
            user.setRoleRequestStatus(RoleRequestStatus.NONE);
        }

        return userRepository.save(user);
    }

    // Find user by ID
    public User findById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}