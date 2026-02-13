

## CSV Upload Context Wizard

### Overview
When a user uploads a CSV file, after the file is parsed and before column mapping, a wizard dialog will appear collecting business context. This context will be passed to the `analyze-process` edge function and forwarded to the AI classification step, so the analysis understands the domain behind the event log.

### Wizard Steps (Dialog with 4 steps)

**Step 1 - Process Info**
- Process Name (text input, required)
- Business Unit / Department (text input, optional)

**Step 2 - Business Context**
- Business Objective (textarea - what does this process achieve?)
- Process Frequency (select: Daily / Weekly / Monthly / On-demand)
- Process Criticality (select: Low / Medium / High / Critical)

**Step 3 - Tools & Systems**
- Tools Used (dynamic list - user can add tool name + purpose pairs)
  - Tool Name (text input)
  - Purpose (text input)
  - Add/Remove buttons

**Step 4 - Additional Context**
- Additional Details (textarea - any extra context for the AI)
- Known Pain Points (textarea, optional)

### Technical Changes

**1. New Component: `src/components/upload/CSVContextWizard.tsx`**
- Multi-step dialog with progress indicator
- Collects all context fields above
- Returns a `ProcessContext` object on completion
- Minimal required fields (only Process Name is mandatory)
- "Skip" option to proceed without context

**2. Update: `src/pages/UploadPage.tsx`**
- After CSV file is parsed, show the CSVContextWizard dialog
- Store the collected context in state
- Pass context to `analyze-process` edge function call
- Display context summary in the Confirm step
- Update the CSV flow steps from 3 to 4: Upload -> Context -> Map Columns -> Confirm

**3. Update: `supabase/functions/analyze-process/index.ts`**
- Accept new `processContext` parameter from the request body
- Include the context in use case descriptions and names
- Pass the context to the `classify-activities` function call so the AI has domain knowledge

**4. Update: `supabase/functions/classify-activities/index.ts`**
- Accept optional `processContext` parameter
- Inject business context into the AI prompt so Gemini understands the domain, tools, and objectives when classifying activities

**5. Update: `datasets` table**
- Add a `process_context` JSONB column (nullable) to persist the context alongside the dataset for future reference

### Data Flow

```text
CSV Upload -> Parse -> Context Wizard Dialog -> Column Mapping -> Confirm -> Process Data
                                                                                |
                                                                    analyze-process (with context)
                                                                                |
                                                                    classify-activities (with context)
```

### User Experience
- The wizard appears as a dialog after CSV parsing completes
- Users can skip the wizard entirely (context is optional)
- Each step has Back/Next navigation
- The Confirm step shows a summary of both column mappings and business context
- Context is stored with the dataset for future re-analysis

