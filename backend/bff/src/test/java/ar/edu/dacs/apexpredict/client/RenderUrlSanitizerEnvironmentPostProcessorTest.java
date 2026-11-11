package ar.edu.dacs.apexpredict.client;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.bootstrap.DefaultBootstrapContext;
import org.springframework.boot.logging.DeferredLogs;
import org.springframework.boot.support.EnvironmentPostProcessorsFactory;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

class RenderUrlSanitizerEnvironmentPostProcessorTest {

    @Test
    void loadsViaSpringBoot4EnvironmentPostProcessorsFactoryWithoutDeprecatedKeyCollision() {
        var factory = EnvironmentPostProcessorsFactory.fromSpringFactories(getClass().getClassLoader());
        var processors = factory.getEnvironmentPostProcessors(new DeferredLogs(), new DefaultBootstrapContext());

        assertTrue(
            processors.stream().anyMatch(RenderUrlSanitizerEnvironmentPostProcessor.class::isInstance),
            "RenderUrlSanitizerEnvironmentPostProcessor debe instanciarse limpiamente desde spring.factories"
        );
    }

    @Test
    void sanitizesDuplicatedRenderDomainSuffixes() {
        var processor = new RenderUrlSanitizerEnvironmentPostProcessor();
        var env = new MockEnvironment()
            .withProperty("DOMAIN_SERVICE_URL", "https://dacs-pmkx.onrender.com.onrender.com/backend")
            .withProperty("F1_CONNECTOR_URL", "https://dacs-1-v4ik.onrender.com.onrender.com/conector");

        processor.postProcessEnvironment(env, new SpringApplication(Object.class));

        assertEquals("https://dacs-pmkx.onrender.com/backend", env.getProperty("DOMAIN_SERVICE_URL"));
        assertEquals("https://dacs-1-v4ik.onrender.com/conector", env.getProperty("F1_CONNECTOR_URL"));
        assertEquals("https://dacs-pmkx.onrender.com/backend", env.getProperty("feign.client.config.domainClient.url"));
        assertEquals("https://dacs-1-v4ik.onrender.com/conector", env.getProperty("feign.client.config.conectorClient.url"));
    }
}
