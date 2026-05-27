# Kingdom Knowledge Graph Schema

## Purpose

The Kingdom Knowledge Graph connects:

- Scripture
- covenant progression
- doctrine
- worship
- discipleship
- prayer
- stewardship
- missions
- ethics
- continuity states
- runtime memory summaries

This graph exists to unify systems, reduce fragmentation, and improve runtime intelligence.

## Core Node Types

### ScriptureNode

Represents:

- verses
- chapters
- biblical themes
- covenant anchors
- contextual relationships

Example:

```json
{
  "type": "ScriptureNode",
  "reference": "John 15:5",
  "themes": ["abiding", "discipleship", "dependence"]
}
```

### CovenantNode

Represents covenant progression.

Example:

```json
{
  "type": "CovenantNode",
  "covenant": "New Covenant",
  "continuityPriority": "high"
}
```

### DoctrineNode

Represents doctrinal anchors.

Example:

```json
{
  "type": "DoctrineNode",
  "category": "salvation",
  "integrityLevel": "verified"
}
```

### DiscipleshipNode

Represents formation pathways.

Example:

```json
{
  "type": "DiscipleshipNode",
  "stage": "growth",
  "nextStep": "daily prayer"
}
```

### WorshipNode

Represents worship-centered runtime states.

### PrayerNode

Represents prayer continuity.

### StewardshipNode

Represents temple-care and stewardship flows.

### ContinuityNode

Represents user continuity state.

### MemorySummaryNode

Represents compressed runtime memory.

## Relationship Types

Examples:

```txt
SCRIPTURE_SUPPORTS_DOCTRINE
SCRIPTURE_SUPPORTS_DISCIPLESHIP
COVENANT_CONNECTS_SCRIPTURE
DISCIPLESHIP_REQUIRES_CONTINUITY
PRAYER_REINFORCES_DISCIPLESHIP
STEWARDSHIP_SUPPORTS_DISCIPLESHIP
```

## Runtime Rule

The graph should:

- unify runtime behavior
- reduce disconnected outputs
- reduce repeated explanation generation
- preserve continuity
- support future RAG orchestration

The graph should NOT:

- replace Scripture
- fabricate theology
- override doctrine safeguards
- create autonomous doctrine generation

## Integration Flow

```txt
Feature System
      ↓
Adapter
      ↓
CanonicalOrchestrator
      ↓
KingdomKnowledgeGraph
      ↓
ContinuityRuleEngine
      ↓
UnifiedDiscipleshipCompiler
```

## Current State

Current status:

```txt
schema-defined
runtime-persistence-pending
```

## Planned Future Layers

Future additions:

- graph persistence
- vector relationship linking
- retrieval orchestration
- semantic continuity retrieval
- doctrine-safe RAG grounding
