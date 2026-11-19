package ar.edu.dacs.apexpredict;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class ApexPredictApplication {

    public static void main(String[] args) {
        sanitizeUrlProperty("DOMAIN_SERVICE_URL", "feign.client.config.domainClient.url",
                "https://dacs-f0st.onrender.com/backend");
        sanitizeUrlProperty("F1_CONNECTOR_URL", "feign.client.config.conectorClient.url",
                "https://dacs-1-jpud.onrender.com/conector");
        SpringApplication.run(ApexPredictApplication.class, args);
    }

    private static void sanitizeUrlProperty(String envKey, String feignPropertyKey, String defaultUrl) {
        String val = System.getProperty(envKey);
        if (val == null || val.isBlank()) {
            val = System.getenv(envKey);
        }
        if (val == null || val.isBlank()) {
            val = defaultUrl;
        }
        String sanitized = val.replaceAll("(\\.onrender\\.com)+", ".onrender.com");
        System.setProperty(envKey, sanitized);
        System.setProperty(feignPropertyKey, sanitized);
    }
}
