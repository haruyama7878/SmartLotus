package vn.smartlotus.backend.identity.interfaces.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.databind.JsonNode;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final UserApplicationService users;

    public ProfileController(UserApplicationService users) { this.users = users; }

    @PutMapping
    public ResponseEntity<ApiResponse> savePlacement(@Valid @RequestBody PlacementRequest request) {
        users.updatePlacement(request.placement().toString());
        return ResponseEntity.ok(new ApiResponse(true));
    }

    @PatchMapping
    public ResponseEntity<ApiResponse> updateProfile(@Valid @RequestBody ProfileRequest request) {
        UserEntity user = users.updateProfile(request.displayName().trim(), request.avatarUrl());
        return ResponseEntity.ok(new ApiResponse(true));
    }

    public record PlacementRequest(@jakarta.validation.constraints.NotNull JsonNode placement) {}
    public record ProfileRequest(
        @NotBlank @Size(min = 2, max = 120) String displayName,
        @NotBlank @Size(max = 2048) String avatarUrl
    ) {}
    public record ApiResponse(boolean ok) {}
}
