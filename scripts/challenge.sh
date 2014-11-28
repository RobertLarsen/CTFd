#!/bin/bash

if test -z "${5}"; then
    echo "Usage: ${0} <db> <challenge> <team> <time> <points>"
else
    db="${1}"
    challenge="${2}"
    team="${3}"
    time=$(date -d "${4}" +%s)000
    points=${5}
    
    mongo ${db} --eval "db.challenges.update({_id:'${challenge}'}, {\$push:{rank:{team:'${team}',time:${time},points:${points}}}}, {upsert:true})"
fi
