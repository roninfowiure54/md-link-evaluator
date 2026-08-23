# md-link-evaluator - Shared Open Source Project - Open-Source Project

A fast, concurrent markdown link checker written in Node.js with **zero external dependencies**. It scans a directory recursively for markdown files and verifies that all local file links and external URL links are active.

## Project Features

- **Zero dependencies**: Uses only native Node.js API libraries (`fs`, `path`, and native `fetch`).
- **Concurrent checks**: Uses JavaScript asynchronous promises to check all links in a file concurrently.
- **Local path resolution**: Decodes URI-encoded paths and resolves relative/absolute links against the directory of the file being scanned.
- **External URL validation**: Performs quick HTTP `HEAD` checks (falling back to `GET` if HEAD is blocked by the target server) with short timeout controls.
- **Modern ESM**: Developed using Node.js ES Modules.

## Repository Layout

```text
md-link-evaluator/
├── package.json
├── src/
│   └── checker.js
├── tests/
│   └── checker.test.js
└── README.md
```

## Build instructions

Ensure Node.js (version 18 or later) is installed. There are no external dependencies to install.

## Running the Project

You can run the script using the following commands:

```bash
# Scan the current working directory
node src/checker.js

# Scan a specific directory
node src/checker.js /path/to/project

# Scan via NPM script
npm start -- /path/to/project
```

## Example Output

```text
Scanning directory: C:\projects\docs
Found 3 markdown file(s). Checking links...

Checking index.md (2 links)...
  ✅ All links OK

Checking user-guide.md (3 links)...
  ❌ 1 broken link(s) found:
    - Line 14: [Setup Guide](config/setup-wrong.md) -> File or directory does not exist

Checking api.md (12 links)...
  ✅ All links OK

------------------------------------------------------------
SCAN SUMMARY
------------------------------------------------------------
Total files scanned:  3
Total links checked:  17
Total broken links:   1
------------------------------------------------------------
```

## Running Tests

Run the built-in unit tests using:

```bash
npm test
```
This runs the Node.js native test runner on the `tests/` directory.

---
*Released under the MIT License by Sassywow.*

---
*Released under the MIT License by jocck96.*
