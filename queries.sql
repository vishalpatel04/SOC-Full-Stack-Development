
-- 1. How many distinct courses were taught?
SELECT COUNT(DISTINCT course_id) FROM section;

-- 2. Number of distinct instructors who taught some course in Spring 2018
SELECT COUNT(DISTINCT ID)
FROM teaches
WHERE semester = 'Spring' AND year = 2018;

-- 3. How many different courses has professor Srinivasan taught?
SELECT COUNT(DISTINCT T.course_id)
FROM teaches T
JOIN instructor I ON T.ID = I.ID
WHERE I.name = 'Srinivasan';

-- 4. What all courses has Levy completed?
SELECT DISTINCT C.title
FROM takes T
JOIN course C ON T.course_id = C.course_id
JOIN student S ON T.ID = S.ID
WHERE S.name = 'Levy';

-- 5. Which students have not been assigned an advisor?
SELECT S.ID, S.name
FROM student S
LEFT JOIN advisor A ON S.ID = A.s_ID
WHERE A.s_ID IS NULL;
