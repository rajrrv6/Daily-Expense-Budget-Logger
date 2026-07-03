package com.expense.logger.config;

import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
@Profile("test")
public class TestRedisConfig {

    @Bean(name = "inMemoryRedis")
    public Map<String, String> inMemoryRedis() {
        return new ConcurrentHashMap<>();
    }

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        return Mockito.mock(RedisConnectionFactory.class);
    }

    @Bean
    @SuppressWarnings("unchecked")
    public RedisTemplate<String, String> redisTemplate(Map<String, String> inMemoryRedis) {
        RedisTemplate<String, String> template = Mockito.mock(RedisTemplate.class);
        ValueOperations<String, String> valOps = Mockito.mock(ValueOperations.class);

        // Mock hasKey
        Mockito.when(template.hasKey(Mockito.anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return inMemoryRedis.containsKey(key);
        });

        // Mock delete(String)
        Mockito.when(template.delete(Mockito.anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return inMemoryRedis.remove(key) != null;
        });

        // Mock keys(pattern)
        Mockito.when(template.keys(Mockito.anyString())).thenAnswer(inv -> {
            String pattern = inv.getArgument(0);
            String prefix = pattern.replace("*", "");
            java.util.Set<String> matchedKeys = new java.util.HashSet<>();
            for (String k : inMemoryRedis.keySet()) {
                if (k.startsWith(prefix)) {
                    matchedKeys.add(k);
                }
            }
            return matchedKeys;
        });

        // Mock delete(Collection)
        Mockito.when(template.delete(Mockito.anyCollection())).thenAnswer(inv -> {
            java.util.Collection<String> keys = inv.getArgument(0);
            long count = 0;
            for (String k : keys) {
                if (inMemoryRedis.remove(k) != null) {
                    count++;
                }
            }
            return count;
        });

        // Mock opsForValue
        Mockito.when(template.opsForValue()).thenReturn(valOps);

        // Mock opsForValue().get(key)
        Mockito.when(valOps.get(Mockito.anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return inMemoryRedis.get(key);
        });

        // Mock opsForValue().increment(key)
        Mockito.when(valOps.increment(Mockito.anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            String existingVal = inMemoryRedis.get(key);
            long val = 0;
            if (existingVal != null) {
                try {
                    val = Long.parseLong(existingVal);
                } catch (NumberFormatException e) {
                    val = 0;
                }
            }
            val++;
            inMemoryRedis.put(key, String.valueOf(val));
            return val;
        });

        // Mock opsForValue().set(key, value)
        Mockito.doAnswer(inv -> {
            String key = inv.getArgument(0);
            String val = inv.getArgument(1);
            inMemoryRedis.put(key, val);
            return null;
        }).when(valOps).set(Mockito.anyString(), Mockito.anyString());

        // Mock opsForValue().set(key, value, timeout, unit)
        Mockito.doAnswer(inv -> {
            String key = inv.getArgument(0);
            String val = inv.getArgument(1);
            inMemoryRedis.put(key, val);
            return null;
        }).when(valOps).set(Mockito.anyString(), Mockito.anyString(), Mockito.anyLong(), Mockito.any());

        return template;
    }
}
