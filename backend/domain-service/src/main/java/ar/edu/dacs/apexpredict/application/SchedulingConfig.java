package ar.edu.dacs.apexpredict.application;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@ConditionalOnProperty(value = "apexpredict.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
