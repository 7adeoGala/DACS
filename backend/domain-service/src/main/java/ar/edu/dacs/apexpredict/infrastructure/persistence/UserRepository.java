package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.User;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByIssuerAndSubject(String issuer, String subject);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(TRIM(u.displayName)) = LOWER(TRIM(:displayName)) AND u.id <> :id")
    boolean existsByDisplayNameIgnoreCaseAndIdNot(@Param("displayName") String displayName, @Param("id") UUID id);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(TRIM(u.displayName)) = LOWER(TRIM(:displayName))")
    boolean existsByDisplayNameIgnoreCase(@Param("displayName") String displayName);

    @Modifying
    @Query(value = """
        INSERT INTO app_users(id, issuer, subject, display_name, email)
        VALUES (:id, :issuer, :subject, :name, :email)
        ON CONFLICT (issuer, subject) DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email
        """, nativeQuery = true)
    void upsert(@Param("id") UUID id, @Param("issuer") String issuer, @Param("subject") String subject,
                @Param("name") String name, @Param("email") String email);
}
