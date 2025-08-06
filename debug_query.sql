SELECT 
  cs.id, 
  cs.name, 
  cs.type,
  ls.id as live_session_id,
  COUNT(lds.id) as driver_count
FROM common_sessions cs
LEFT JOIN live_sessions ls ON ls.common_session_id = cs.id
LEFT JOIN live_driver_sessions lds ON lds.session_id = ls.id
WHERE cs.id = 1
GROUP BY cs.id, cs.name, cs.type, ls.id;
