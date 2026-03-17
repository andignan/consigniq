Work autonomously. Do not stop for approval at any step.
Read CLAUDE.md before writing any code.
Before any database changes, audit the Supabase schema:
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

$ARGUMENTS

After completing the task:
1. Write automated tests (Jest + React Testing Library)
   covering all new components and API routes
2. Write manual test plan to
   /docs/test-plans/[feature-name].md
3. Run full test suite. Fix any failures.
   Confirm all tests pass.
4. Update CLAUDE.md to reflect everything built,
   changed, or fixed in this task.
5. Update any relevant PRD files in /docs/prd/ to reflect
   changes made — new features, changed behavior,
   resolved decisions, or updated architecture.
6. Commit and push all changes to github with message
   "[descriptive message], [X] tests passing"
