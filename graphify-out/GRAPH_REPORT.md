# Graph Report - Charon - BOT  (2026-11-05)

## Corpus Check
- Corpus is ~235 words - fits in a single context window. You may not need a graph.

## Summary
- 7 nodes · 7 edges · 3 communities (1 shown, 2 thin omitted)
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Graphify Entry Points
- Graph Storage Updates
- Graph Query Reporting

## God Nodes (most connected - your core abstractions)
1. `Graphify Knowledge Graph (graphify-out)` - 3 edges
2. `graphify query / path / explain Commands` - 3 edges
3. `graphify update Command` - 2 edges
4. `graphify-out/graph.json` - 2 edges
5. `graphify-out/wiki/index.md` - 2 edges
6. `/graphify User Command` - 1 edges
7. `graphify-out/GRAPH_REPORT.md` - 1 edges

## Surprising Connections (you probably didn't know these)
- `graphify query / path / explain Commands` --conceptually_related_to--> `graphify-out/wiki/index.md`  [INFERRED]
  AGENTS.md → AGENTS.md  _Bridges community 2 → community 0_
- `graphify update Command` --rationale_for--> `Graphify Knowledge Graph (graphify-out)`  [EXTRACTED]
  AGENTS.md → AGENTS.md  _Bridges community 0 → community 1_
- `graphify query / path / explain Commands` --references--> `graphify-out/graph.json`  [EXTRACTED]
  AGENTS.md → AGENTS.md  _Bridges community 2 → community 1_

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (3 total, 2 thin omitted)

### Community 0 - "Graphify Entry Points"
Cohesion: 0.67
Nodes (3): /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify-out/wiki/index.md

## Knowledge Gaps
- **2 isolated node(s):** `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Graphify Knowledge Graph (graphify-out)` connect `Graphify Entry Points` to `Graph Storage Updates`?**
  _High betweenness centrality (0.400) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `graphify-out/wiki/index.md` (e.g. with `graphify query / path / explain Commands` and `Graphify Knowledge Graph (graphify-out)`) actually correct?**
  _`graphify-out/wiki/index.md` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Why does `graphify query / path / explain Commands` connect `Graph Query Reporting` to `Graphify Entry Points`, `Graph Storage Updates`?**
  _High betweenness centrality (0.400) - this node is a cross-community bridge._
- **Why does `graphify-out/wiki/index.md` connect `Graphify Entry Points` to `Graph Query Reporting`?**
  _High betweenness centrality (0.267) - this node is a cross-community bridge._