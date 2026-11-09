package vn.smartlotus.backend.shared.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class HealthControllerTest {
    @Test
    void returnsHealthyServicePayload() {
        Map<String, Object> response = new HealthController().health();

        assertThat(response).containsEntry("status", "ok");
        assertThat(response).containsEntry("service", "smart-lotus-backend");
        assertThat(response).containsKey("timestamp");
    }
}
