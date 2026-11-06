-- Purge lingering hemanth recruiter/admin invite records as requested
DELETE FROM public.company_invites
WHERE email ILIKE '%hemanth%' OR email = 'gowdahemanth.com@gmail.com';

-- Purge any orphaned companies associated with hemanth
DELETE FROM public.companies
WHERE email ILIKE '%hemanth%' OR email = 'gowdahemanth.com@gmail.com';

-- Purge any roles associated with hemanth so he can register/create a new account fresh
DELETE FROM public.user_roles
WHERE email ILIKE '%hemanth%' OR email = 'gowdahemanth.com@gmail.com';
