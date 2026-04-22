# Architectural Decision Record: Paradigm Scores

## Context
The "Empathy Economy" uses a 5-part Paradigm Score (e.g., AAAAA, ABCAB) to evaluate businesses across five distinct pillars: Environment, Social, Governance, Innovation, and Community.

## Decision: Fixed Multi-Score Structure
**The Paradigm Score is NOT an average and is NOT a mathematical calculation.**

1. **Fixed Representation**: The score must always be treated as 5 separate, independent indicators displayed together.
2. **No Averaging**: There is no such thing as an "Average Score." Agents and developers must never attempt to mathematically blend or aggregate these 5 values into a single grade.
3. **Institutional Meaning**: Each letter represents a specific, verified compliance status in that pillar. Changing one letter does not affect the others.

## Implementation Guardrail
- Any Cloud Function or UI component dealing with scores must preserve the 5-character string structure.
- Never implement logic that treats these letters as numeric values for the purpose of global averaging.
