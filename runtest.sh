#!/bin/bash

failed=0

# Run each test file individually
find ./test -type f -name "*.spec.ts" | while read file; do
  echo "Starting Ganache..."
  npx hardhat node > /dev/null 2>&1 &
  export NODE_PID=$!
  echo "PID: $NODE_PID"
  echo "Running test $file"
  cmd="npx hardhat test $file"
  $cmd
  status=$?
  if [ $status -eq 0 ]
  then
    echo "'$cmd' command was successful"
  else
    echo "'$cmd' failed"
    failed=1
  fi 

  kill $NODE_PID
  echo "Sleeping for 5 seconds..."
  sleep 5s
  echo "Done."
done

exit $failed