#!/bin/bash

# Exit from shell script with an error code if any test fails
set -e

# Run each test file individually
find ./test -type f -name "*.spec.ts" | while read file; do
  echo "Running test $file"
  npx hardhat test "$file"
  echo "Sleeping for 10 seconds..."
  sleep 10s
  echo "Done."
done