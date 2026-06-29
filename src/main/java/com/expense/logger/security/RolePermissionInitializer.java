package com.expense.logger.security;

import com.expense.logger.model.Permission;
import com.expense.logger.model.Role;
import com.expense.logger.model.User;
import com.expense.logger.repository.PermissionRepository;
import com.expense.logger.repository.RoleRepository;
import com.expense.logger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class RolePermissionInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Starting RBAC roles and permissions database initialization...");

        // 1. Define Permissions
        Map<String, String> permissionsMap = new LinkedHashMap<>();
        permissionsMap.put("read:personal_finance", "Access personal financial records");
        permissionsMap.put("write:personal_finance", "Modify personal financial records");
        permissionsMap.put("read:system_logs", "Observe chronological audit logs");
        permissionsMap.put("read:user_directories", "List users registered in system");
        permissionsMap.put("write:user_management", "Change user statuses or roles");

        Map<String, Permission> persistedPermissions = new HashMap<>();
        for (Map.Entry<String, String> entry : permissionsMap.entrySet()) {
            Permission permission = permissionRepository.findByName(entry.getKey())
                    .orElseGet(() -> permissionRepository.save(
                            Permission.builder()
                                    .name(entry.getKey())
                                    .description(entry.getValue())
                                    .build()
                    ));
            persistedPermissions.put(entry.getKey(), permission);
        }

        // 2. Define Roles and assign Permissions
        // ROLE_USER
        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> Role.builder().name("ROLE_USER").description("Standard personal finance user").build());
        userRole.setPermissions(new HashSet<>(Arrays.asList(
                persistedPermissions.get("read:personal_finance"),
                persistedPermissions.get("write:personal_finance")
        )));
        roleRepository.save(userRole);

        // ROLE_AUDITOR
        Role auditorRole = roleRepository.findByName("ROLE_AUDITOR")
                .orElseGet(() -> Role.builder().name("ROLE_AUDITOR").description("System auditor and read-only observer").build());
        auditorRole.setPermissions(new HashSet<>(Arrays.asList(
                persistedPermissions.get("read:personal_finance"),
                persistedPermissions.get("write:personal_finance"),
                persistedPermissions.get("read:system_logs"),
                persistedPermissions.get("read:user_directories")
        )));
        roleRepository.save(auditorRole);

        // ROLE_ADMIN
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> Role.builder().name("ROLE_ADMIN").description("Super Administrator").build());
        adminRole.setPermissions(new HashSet<>(persistedPermissions.values()));
        roleRepository.save(adminRole);

        // 3. Migrate existing users: grant ROLE_USER if they have no roles assigned
        List<User> allUsers = userRepository.findAll();
        for (User user : allUsers) {
            if (user.getRoles() == null || user.getRoles().isEmpty()) {
                user.setRoles(new HashSet<>(Collections.singletonList(userRole)));
                userRepository.save(user);
                log.info("Assigned default ROLE_USER to existing user: {}", user.getUsername());
            }
        }

        // 4. Force assign ROLE_ADMIN to primary admin user rajrrv6@gmail.com
        userRepository.findByEmailAndDeletedAtIsNull("rajrrv6@gmail.com").ifPresent(adminUser -> {
            if (!adminUser.getRoles().contains(adminRole)) {
                adminUser.getRoles().add(adminRole);
                userRepository.save(adminUser);
                log.info("Successfully granted ROLE_ADMIN to primary account: rajrrv6@gmail.com");
            }
        });

        log.info("RBAC database initialization completed successfully.");
    }
}
