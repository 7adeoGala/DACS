package ar.edu.dacs.apexpredict.client;

import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

@Order(Ordered.HIGHEST_PRECEDENCE)
public class RenderUrlSanitizerEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> sanitized = new HashMap<>();
        sanitize(environment, sanitized, "DOMAIN_SERVICE_URL", "https://dacs-f0st.onrender.com/backend");
        sanitize(environment, sanitized, "F1_CONNECTOR_URL", "https://dacs-1-jpud.onrender.com/conector");

        if (!sanitized.isEmpty()) {
            if (sanitized.containsKey("DOMAIN_SERVICE_URL")) {
                sanitized.put("feign.client.config.domainClient.url", sanitized.get("DOMAIN_SERVICE_URL"));
            }
            if (sanitized.containsKey("F1_CONNECTOR_URL")) {
                sanitized.put("feign.client.config.conectorClient.url", sanitized.get("F1_CONNECTOR_URL"));
            }
            environment.getPropertySources().addFirst(new MapPropertySource("sanitizedRenderUrls", sanitized));
        }
    }

    private void sanitize(ConfigurableEnvironment env, Map<String, Object> target, String key, String defaultVal) {
        String val = env.getProperty(key);
        if (val == null || val.isBlank()) {
            val = defaultVal;
        }
        String cleaned = val.replaceAll("(\\.onrender\\.com)+", ".onrender.com");
        target.put(key, cleaned);
    }
}
