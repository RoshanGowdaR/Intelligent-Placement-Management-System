-- Demonstration Data: Companies, Tests, and Multi-Round Recruitment Drives
-- Target: Google, Microsoft, Amazon, and TCS

DO $$
DECLARE
  v_google_id UUID;
  v_msft_id UUID;
  v_amzn_id UUID;
  v_tcs_id UUID;
  v_test_google UUID;
  v_test_msft UUID;
  v_test_amzn UUID;
BEGIN
  -- 1. Insert Companies
  -- Google
  SELECT id INTO v_google_id FROM public.companies WHERE LOWER(name) = 'google' LIMIT 1;
  IF v_google_id IS NULL THEN
    INSERT INTO public.companies (
      name,
      job_role,
      salary_package,
      job_location,
      industry,
      description,
      skills_priority,
      eligibility_criteria,
      allowed_branches
    ) VALUES (
      'GOOGLE',
      'Software Development Engineer (Campus 2026)',
      '24 - 32 LPA',
      'Bengaluru / Hyderabad, India',
      'Internet & Cloud Technology',
      'Google Campus Engineering hiring drive for 2026 graduates. Roles across Search, Cloud, Ads, and Core Systems infrastructure.',
      '["Data Structures", "Algorithms", "System Design", "C++", "Java", "Python", "Distributed Systems"]'::jsonb,
      '{"min_cgpa": 7.5, "year_of_passing": 2026}'::jsonb,
      ARRAY['Computer Science', 'Information Science', 'Electronics & Communication']::text[]
    ) RETURNING id INTO v_google_id;
  END IF;

  -- Microsoft
  SELECT id INTO v_msft_id FROM public.companies WHERE LOWER(name) = 'microsoft' LIMIT 1;
  IF v_msft_id IS NULL THEN
    INSERT INTO public.companies (
      name,
      job_role,
      salary_package,
      job_location,
      industry,
      description,
      skills_priority,
      eligibility_criteria,
      allowed_branches
    ) VALUES (
      'MICROSOFT',
      'Software Engineer - Core Platform & Azure',
      '18 - 24 LPA',
      'Bengaluru / Hyderabad, Hybrid',
      'Enterprise Cloud & Software',
      'Microsoft IDC hiring drive for engineering talent. Focus on Azure cloud infrastructure, AI platforms, and developer tooling.',
      '["C#", "C++", "Python", "Data Structures", "Cloud Architecture", "Object Oriented Design"]'::jsonb,
      '{"min_cgpa": 7.0, "year_of_passing": 2026}'::jsonb,
      ARRAY['Computer Science', 'Information Science', 'Electronics & Communication', 'Electrical Engineering']::text[]
    ) RETURNING id INTO v_msft_id;
  END IF;

  -- Amazon
  SELECT id INTO v_amzn_id FROM public.companies WHERE LOWER(name) = 'amazon' LIMIT 1;
  IF v_amzn_id IS NULL THEN
    INSERT INTO public.companies (
      name,
      job_role,
      salary_package,
      job_location,
      industry,
      description,
      skills_priority,
      eligibility_criteria,
      allowed_branches
    ) VALUES (
      'AMAZON',
      'Graduate SDE - AWS Cloud & Systems',
      '16 - 22 LPA',
      'Bengaluru / Chennai, India',
      'E-Commerce & AWS Cloud',
      'Amazon India campus hiring program. Build high-scale distributed systems and customer-facing web services with AWS.',
      '["Java", "Distributed Systems", "AWS", "SQL / NoSQL", "Problem Solving", "Operating Systems"]'::jsonb,
      '{"min_cgpa": 7.0, "year_of_passing": 2026}'::jsonb,
      ARRAY['Computer Science', 'Information Science', 'Electronics & Communication']::text[]
    ) RETURNING id INTO v_amzn_id;
  END IF;

  -- TCS
  SELECT id INTO v_tcs_id FROM public.companies WHERE LOWER(name) = 'tcs' LIMIT 1;
  IF v_tcs_id IS NULL THEN
    INSERT INTO public.companies (
      name,
      job_role,
      salary_package,
      job_location,
      industry,
      description,
      skills_priority,
      eligibility_criteria,
      allowed_branches
    ) VALUES (
      'TCS',
      'Software Development Engineer (Digital / Prime)',
      '9 - 14 LPA',
      'Bengaluru, Pan-India',
      'Technology & Global IT Services',
      'Tata Consultancy Services campus hiring drive for Engineering 2026 batch candidates across Digital and Prime delivery tracks.',
      '["Java", "Python", "Data Structures", "Algorithms", "SQL", "React"]'::jsonb,
      '{"min_cgpa": 6.5, "year_of_passing": 2026}'::jsonb,
      ARRAY['Computer Science', 'Information Science', 'Electronics & Communication']::text[]
    ) RETURNING id INTO v_tcs_id;
  END IF;

  -- 2. Insert Standardized Campus Tests
  -- Google Test
  SELECT id INTO v_test_google FROM public.tests WHERE title = 'Google Campus OA: Data Structures & Algorithms' LIMIT 1;
  IF v_test_google IS NULL THEN
    INSERT INTO public.tests (
      title,
      scheduled_date,
      duration,
      max_participants,
      company_id,
      created_by_role,
      pass_criteria,
      questions_per_student,
      question_bank,
      registration_start,
      registration_deadline
    ) VALUES (
      'Google Campus OA: Data Structures & Algorithms',
      now() + interval '1 day',
      60,
      250,
      v_google_id,
      'company',
      '{"pass_percentage": 60}'::jsonb,
      5,
      '[
        {"id":"g1","type":"mcq","subject":"Data Structures","topic":"Trees","text":"What is the time complexity to find the Lowest Common Ancestor (LCA) in a balanced Binary Search Tree?","options":["O(log N)","O(N)","O(1)","O(N log N)"],"correct_answer":"A","points":4},
        {"id":"g2","type":"mcq","subject":"Algorithms","topic":"Dynamic Programming","text":"Which approach solves the 0/1 Knapsack problem with weights and values in pseudopolynomial time?","options":["Greedy approach","Dynamic Programming","Breadth-First Search","Divide & Conquer"],"correct_answer":"B","points":4},
        {"id":"g3","type":"mcq","subject":"Algorithms","topic":"Graphs","text":"Which algorithm finds the single-source shortest path in a weighted graph with negative edge weights without negative cycles?","options":["Dijkstras Algorithm","Bellman-Ford Algorithm","Floyd-Warshall Algorithm","Prims Algorithm"],"correct_answer":"B","points":4},
        {"id":"g4","type":"mcq","subject":"System Design","topic":"Caching","text":"Which cache eviction policy discards the least recently accessed items first?","options":["FIFO","LFU","LRU","MRU"],"correct_answer":"C","points":4},
        {"id":"g5","type":"mcq","subject":"Computer Networks","topic":"Protocols","text":"Which TCP handshake flag combination initiates a network socket connection?","options":["SYN","ACK","FIN","RST"],"correct_answer":"A","points":4}
      ]'::jsonb,
      now() - interval '2 days',
      now() + interval '5 days'
    ) RETURNING id INTO v_test_google;
  END IF;

  -- Microsoft Test
  SELECT id INTO v_test_msft FROM public.tests WHERE title = 'Microsoft Core Engineering Diagnostic' LIMIT 1;
  IF v_test_msft IS NULL THEN
    INSERT INTO public.tests (
      title,
      scheduled_date,
      duration,
      max_participants,
      company_id,
      created_by_role,
      pass_criteria,
      questions_per_student,
      question_bank,
      registration_start,
      registration_deadline
    ) VALUES (
      'Microsoft Core Engineering Diagnostic',
      now() + interval '2 days',
      45,
      200,
      v_msft_id,
      'company',
      '{"pass_percentage": 60}'::jsonb,
      5,
      '[
        {"id":"ms1","type":"mcq","subject":"Operating Systems","topic":"Concurrency","text":"What condition is NOT necessary for a deadlock to occur according to Coffmans conditions?","options":["Mutual Exclusion","Hold and Wait","Preemption","Circular Wait"],"correct_answer":"C","points":4},
        {"id":"ms2","type":"mcq","subject":"Databases","topic":"ACID Properties","text":"Which ACID property guarantees that database transactions are safely stored in non-volatile memory after commit?","options":["Atomicity","Consistency","Isolation","Durability"],"correct_answer":"D","points":4},
        {"id":"ms3","type":"mcq","subject":"Object-Oriented Design","topic":"Design Patterns","text":"Which design pattern ensures a class has only one instance while providing a global access point?","options":["Factory Method","Singleton","Observer","Adapter"],"correct_answer":"B","points":4},
        {"id":"ms4","type":"mcq","subject":"Data Structures","topic":"Hashing","text":"In a hash table using open addressing, which collision resolution technique checks slots with quadratic intervals?","options":["Linear Probing","Quadratic Probing","Double Hashing","Separate Chaining"],"correct_answer":"B","points":4},
        {"id":"ms5","type":"mcq","subject":"Cloud Architecture","topic":"Azure Fundamentals","text":"Which Azure service provides serverless compute execution of event-driven code?","options":["Azure Virtual Machines","Azure Functions","Azure App Service","Azure Cosmos DB"],"correct_answer":"B","points":4}
      ]'::jsonb,
      now() - interval '2 days',
      now() + interval '6 days'
    ) RETURNING id INTO v_test_msft;
  END IF;

  -- Amazon Test
  SELECT id INTO v_test_amzn FROM public.tests WHERE title = 'Amazon SDE Technical Assessment' LIMIT 1;
  IF v_test_amzn IS NULL THEN
    INSERT INTO public.tests (
      title,
      scheduled_date,
      duration,
      max_participants,
      company_id,
      created_by_role,
      pass_criteria,
      questions_per_student,
      question_bank,
      registration_start,
      registration_deadline
    ) VALUES (
      'Amazon SDE Technical Assessment',
      now() + interval '3 days',
      60,
      200,
      v_amzn_id,
      'company',
      '{"pass_percentage": 60}'::jsonb,
      5,
      '[
        {"id":"amz1","type":"mcq","subject":"Distributed Systems","topic":"CAP Theorem","text":"According to the CAP theorem, which combination cannot be simultaneously achieved in an asynchronous network prone to partitions?","options":["Consistency and Availability","Consistency and Partition Tolerance","Availability and Partition Tolerance","All three simultaneously"],"correct_answer":"D","points":4},
        {"id":"amz2","type":"mcq","subject":"Algorithms","topic":"Heaps","text":"What is the worst-case time complexity to extract the minimum element from a binary Min-Heap of N elements?","options":["O(1)","O(log N)","O(N)","O(N log N)"],"correct_answer":"B","points":4},
        {"id":"amz3","type":"mcq","subject":"Web Architecture","topic":"Load Balancing","text":"Which load balancing algorithm distributes requests sequentially across a list of servers?","options":["Least Connections","Round Robin","IP Hash","Weighted Response Time"],"correct_answer":"B","points":4},
        {"id":"amz4","type":"mcq","subject":"Security","topic":"Authentication","text":"Which standard token format is commonly digitally signed with HMAC or RSA for stateless REST authentication?","options":["OAuth 1.0","JWT","SAML 1.0","Basic Auth"],"correct_answer":"B","points":4},
        {"id":"amz5","type":"mcq","subject":"Data Structures","topic":"Tries","text":"Which tree-like data structure is optimal for storing dynamic sets or associative arrays of strings for prefix searching?","options":["Segment Tree","Fenwick Tree","Trie (Prefix Tree)","Red-Black Tree"],"correct_answer":"C","points":4}
      ]'::jsonb,
      now() - interval '3 days',
      now() + interval '7 days'
    ) RETURNING id INTO v_test_amzn;
  END IF;

  -- 3. Configure Multi-Round Recruitment Drives
  -- Google Rounds
  IF v_google_id IS NOT NULL THEN
    INSERT INTO public.drive_rounds (company_id, round_number, round_name, round_type, test_id, passing_logic, passing_value, is_published, auto_progress)
    VALUES
      (v_google_id, 1, 'Round 1: Online Technical Assessment (OA)', 'test', v_test_google, 'cutoff_score', 65, true, true),
      (v_google_id, 2, 'Round 2: Technical Interview & Live Coding', 'interview', NULL, 'manual', 70, true, false),
      (v_google_id, 3, 'Round 3: System Architecture & Googliness Viva', 'interview', NULL, 'manual', 75, false, false)
    ON CONFLICT (company_id, round_number) DO UPDATE
    SET round_name = EXCLUDED.round_name, test_id = EXCLUDED.test_id;
  END IF;

  -- Microsoft Rounds
  IF v_msft_id IS NOT NULL THEN
    INSERT INTO public.drive_rounds (company_id, round_number, round_name, round_type, test_id, passing_logic, passing_value, is_published, auto_progress)
    VALUES
      (v_msft_id, 1, 'Round 1: Core Engineering Diagnostic', 'test', v_test_msft, 'cutoff_score', 60, true, true),
      (v_msft_id, 2, 'Round 2: Cloud Systems & DSA Pairing', 'interview', NULL, 'manual', 70, true, false),
      (v_msft_id, 3, 'Round 3: Executive Fit & Managerial Viva', 'interview', NULL, 'manual', 75, false, false)
    ON CONFLICT (company_id, round_number) DO UPDATE
    SET round_name = EXCLUDED.round_name, test_id = EXCLUDED.test_id;
  END IF;

  -- Amazon Rounds
  IF v_amzn_id IS NOT NULL THEN
    INSERT INTO public.drive_rounds (company_id, round_number, round_name, round_type, test_id, passing_logic, passing_value, is_published, auto_progress)
    VALUES
      (v_amzn_id, 1, 'Round 1: SDE Online Coding & Aptitude', 'test', v_test_amzn, 'cutoff_score', 60, true, true),
      (v_amzn_id, 2, 'Round 2: High-Scale Systems Pairing', 'interview', NULL, 'manual', 70, true, false),
      (v_amzn_id, 3, 'Round 3: Bar Raiser & Leadership Principles', 'interview', NULL, 'manual', 80, false, false)
    ON CONFLICT (company_id, round_number) DO UPDATE
    SET round_name = EXCLUDED.round_name, test_id = EXCLUDED.test_id;
  END IF;

END $$;
