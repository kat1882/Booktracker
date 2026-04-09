#!/bin/bash
# Triggers eBay scrape in pairs of 2 runs (200 editions each round),
# waits for completion, updates prices, then repeats until no editions remain.
#
# Usage: bash scripts/run-all-batches.sh
#
# Env required: APIFY_API_KEY

set -e
TOKEN="${APIFY_API_KEY:-apify_api_UihOQeZTemmA1TmmqGiqvwps87jae40A2nP2}"

wait_for_run() {
  local RUN=$1
  echo "  Waiting for run $RUN..."
  while true; do
    STATUS=$(curl -s "https://api.apify.com/v2/actor-runs/$RUN?token=$TOKEN" \
      | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{ try { console.log(JSON.parse(d).data.status) } catch(e) { console.log('UNKNOWN') } })")
    echo "    $(date +%H:%M:%S) — $STATUS"
    if [ "$STATUS" = "SUCCEEDED" ] || [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "ABORTED" ]; then
      echo "  Run $RUN finished with status: $STATUS"
      break
    fi
    sleep 60
  done
}

# ── First, wait for the 2 in-flight runs from the previous trigger ──
echo "=== Waiting for in-flight runs ==="
wait_for_run nKMaFT8Sw9oEnizGn
wait_for_run ngQnVtO4Gg2YZ1xzJ

echo ""
echo "In-flight runs done. Updating prices..."
APIFY_API_KEY=$TOKEN npx tsx scripts/update-ebay-prices.ts

# ── Now loop: trigger 200 more at a time until nothing remains ──
ROUND=1
while [ $ROUND -le 15 ]; do
  echo ""
  echo "=== Round $ROUND: triggering next 200 editions ==="

  OUTPUT=$(APIFY_API_KEY=$TOKEN npx tsx scripts/trigger-ebay-scrape.ts --limit=200 2>&1)
  echo "$OUTPUT"

  # Extract run IDs (alphanumeric strings ~17 chars between quotes)
  RUN_IDS=$(echo "$OUTPUT" | grep -oE '"[A-Za-z0-9]{15,20}"' | tr -d '"' | head -2)

  if [ -z "$RUN_IDS" ]; then
    echo "No runs triggered — all unpriced editions covered!"
    break
  fi

  for RID in $RUN_IDS; do
    wait_for_run "$RID"
  done

  # Build comma-separated list and run update for just these runs
  RUNS_CSV=$(echo "$RUN_IDS" | tr '\n' ',' | sed 's/,$//')
  echo ""
  echo "Updating prices for runs: $RUNS_CSV"
  APIFY_API_KEY=$TOKEN npx tsx scripts/update-ebay-prices.ts --runs="$RUNS_CSV"

  ROUND=$((ROUND + 1))
  # Small pause so Apify memory is fully released before next batch
  sleep 30
done

echo ""
echo "All batches complete!"
