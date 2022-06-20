#!/usr/bin/env bash

# Wait for tor to start
tor &
until nc -w 10 127.0.0.1 9050; do sleep 1; done

#start app
node index.js