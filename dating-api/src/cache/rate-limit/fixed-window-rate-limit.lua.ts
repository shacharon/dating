/** Fixed-window consume: returns 1 if allowed, 0 if limit exceeded. */
export const FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA = `
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c >= tonumber(ARGV[1]) then
  return 0
end
c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 1
`;
