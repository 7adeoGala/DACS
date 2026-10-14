package ar.edu.dacs.apexpredict;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class ApexPredictApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApexPredictApplication.class, args);
    }
}
