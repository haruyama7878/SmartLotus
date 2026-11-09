package vn.smartlotus.backend.shared.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    public Identity resolve() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            String displayName = jwt.getClaimAsString("user_metadata.display_name");
            return new Identity(
                jwt.getSubject(),
                email == null ? jwt.getSubject() + "@supabase.local" : email,
                displayName == null || displayName.isBlank() ? email : displayName,
                "student"
            );
        }

        String authUserId = firstNonBlank(
            System.getProperty("smartlotus.user.id"),
            System.getenv("SMARTLOTUS_USER_ID"),
            "local-development-user"
        );
        String email = firstNonBlank(
            System.getProperty("smartlotus.user.email"),
            System.getenv("SMARTLOTUS_USER_EMAIL"),
            "student@smartlotus.local"
        );
        String displayName = firstNonBlank(
            System.getProperty("smartlotus.user.name"),
            System.getenv("SMARTLOTUS_USER_NAME"),
            "Học sinh phát triển"
        );
        String role = firstNonBlank(
            System.getProperty("smartlotus.user.role"),
            System.getenv("SMARTLOTUS_USER_ROLE"),
            "student"
        );
        return new Identity(authUserId, email, displayName, role);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return values[values.length - 1];
    }

    public record Identity(String authUserId, String email, String displayName, String role) {}
}
