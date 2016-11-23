#!/usr/bin/env bash

machine_name=$1

if [[ -n "$machine_name" ]]; then
  docker-machine env $machine_name >/dev/null

  if [ $? -eq 0 ]; then
    npm run build \
      && eval $(docker-machine env $machine_name) \
      && docker-compose build \
      && docker-compose up -d
  fi
else
  echo "Please specify your docker machine name"
  exit 1
fi
