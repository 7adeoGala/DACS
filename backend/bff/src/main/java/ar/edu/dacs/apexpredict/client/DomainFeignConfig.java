package ar.edu.dacs.apexpredict.client;

import feign.RequestInterceptor;
import feign.Retryer;
import org.springframework.context.annotation.Bean;

public class DomainFeignConfig {
    @Bean
    public RequestInterceptor feignAuthInterceptor() {
        return new FeignAuthInterceptor();
    }

    @Bean
    public Retryer feignRetryer() {
        return Retryer.NEVER_RETRY;
    }
}
