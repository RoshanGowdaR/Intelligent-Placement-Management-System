-- ==============================================================================
-- IPMS Elite: Populate official vector logo URLs for enterprise campus recruiters
-- ==============================================================================

UPDATE public.companies
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
    contact_info = jsonb_set(COALESCE(contact_info, '{}'::jsonb), '{logo_url}', '"https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"')
WHERE LOWER(name) LIKE '%google%';

UPDATE public.companies
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg',
    contact_info = jsonb_set(COALESCE(contact_info, '{}'::jsonb), '{logo_url}', '"https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg"')
WHERE LOWER(name) LIKE '%microsoft%';

UPDATE public.companies
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    contact_info = jsonb_set(COALESCE(contact_info, '{}'::jsonb), '{logo_url}', '"https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg"')
WHERE LOWER(name) LIKE '%amazon%';

UPDATE public.companies
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/9/9b/TATA_Consultancy_Services_Logo.svg',
    contact_info = jsonb_set(COALESCE(contact_info, '{}'::jsonb), '{logo_url}', '"https://upload.wikimedia.org/wikipedia/commons/9/9b/TATA_Consultancy_Services_Logo.svg"')
WHERE LOWER(name) LIKE '%tcs%' OR LOWER(name) LIKE '%tata consultancy%';

UPDATE public.companies
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg',
    contact_info = jsonb_set(COALESCE(contact_info, '{}'::jsonb), '{logo_url}', '"https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg"')
WHERE LOWER(name) LIKE '%infosys%';

UPDATE public.companies
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Logo_RGB_Silver_Combined.svg',
    contact_info = jsonb_set(COALESCE(contact_info, '{}'::jsonb), '{logo_url}', '"https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Logo_RGB_Silver_Combined.svg"')
WHERE LOWER(name) LIKE '%wipro%';
