#!/usr/bin/env bash
# Screenshots every step of a lecture by seeding progress and resuming.
# usage: scripts/walk.sh <lecture> <part-index> <step-count> [click-selector]
set -u
lec=$1; part=$2; n=$3; sel=${4:-.play}
done_parts=$(python3 -c "import json,sys; print(json.dumps(['p%d'%(k+1) for k in range($part)]))")
for ((i=0; i<n; i++)); do
  S="storage:{\"$lec\":{\"part\":$part,\"step\":$i,\"steps\":{\"x/y\":true},\"parts\":$done_parts}}"
  if [ "$i" = "0" ]; then
    node scripts/shot.mjs "#/l/$lec/$((part+1))" "shots/$lec-p$((part+1))-s$((i+1)).png" "$S" "click:.btn.primary" "wait:400" "eval:document.querySelector('$sel')?.click()" "wait:1500" | tail -1
  else
    node scripts/shot.mjs "#/l/$lec" "shots/$lec-p$((part+1))-s$((i+1)).png" "$S" "eval:[...document.querySelectorAll('.btn.primary')].find(b=>b.textContent.startsWith('Continue'))?.click()" "wait:400" "eval:document.querySelector('$sel')?.click()" "wait:1500" | tail -1
  fi
done
