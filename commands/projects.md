---
description: Show the numbered project map shared by /branch, /commit, /install, /pr
---

Numbered project map. A leading token in a command's `$ARGUMENTS` selects the target project —
either by number (1–5) or by its folder name:

```
1 -> SPDMS_WebPart_PersonalAssistant
2 -> SPDMS_Artifact_General
3 -> SPI_Artifact_LibraryComponents
4 -> SPI_Artifact_Tasks
5 -> SPI_WebPart_PersonalAssistant
```

How a name resolves to a real path (portable — no absolute paths):

- All these repositories are checked out as sibling folders under one common parent.
- The target project is therefore the sibling of the CURRENT project:
  `<parent of the current project root>/<name>`, i.e. `cd "$(dirname "$(pwd)")/<name>"`.

Resolution rules used by the other commands:

- If the leading token is a number, map it to a name above; if it is already one of the names,
  use it directly. Drop that token from the remaining arguments.
- If the number/name is not in the map, STOP and show this map.
- If the resolved sibling folder does not exist, STOP and report.
- If no selector is given, the command uses the current project (`pwd`).

When THIS command (`/projects`) is invoked directly, just print the map above for reference.
