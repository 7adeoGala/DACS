package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.User;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByIssuerAndSubject(String issuer, String subject);
    @Modifying
    @Query(value = """
        INSERT INTO app_users(id, issuer, subject, display_name, email)
        VALUES (:id, :issuer, :subject, :name, :email)
        ON CONFLICT (issuer, subject) DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email
        """, nativeQuery = true)
    void upsert(@Param("id") UUID id, @Param("issuer") String issuer, @Param("subject") String subject,
                @Param("name") String name, @Param("email") String email);
}
