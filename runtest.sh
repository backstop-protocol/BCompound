#!/bin/bash

# Exit from shell script with an error code if any test fails
set -e

# Run each test file individually
find ./test -type f -name "*.spec.ts" | while read file; do
  echo "Starting Ganache..."
  npx hardhat node > /dev/null 2>&1 &
  export NODE_PID=$!
  echo "PID: $NODE_PID"
  echo "Running test $file"
  npx hardhat test "$file"
  kill $NODE_PID
  echo "Sleeping for 10 seconds..."
  sleep 10s
  echo "Done."
done