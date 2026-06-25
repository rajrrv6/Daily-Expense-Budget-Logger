package com.expense.logger.security;

import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Find user either by username or by email, which are both unique active parameters
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username)
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(username))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                new ArrayList<>() // No roles standard initially
        );
    }
}
