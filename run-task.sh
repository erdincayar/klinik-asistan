#!/bin/bash
if [ -z "$1" ]; then
  echo "Kullanım: ./run-task.sh <task-adı>"
  echo "Mevcut taskler:"
  ls tasks/*.md | sed 's/tasks\//  /' | sed 's/.md//'
  exit 1
fi
claude --print "$(cat tasks/$1.md)"
